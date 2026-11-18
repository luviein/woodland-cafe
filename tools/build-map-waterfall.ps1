param([string]$PreviewPath = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'src/assets/worldMap'
$config = Get-Content -LiteralPath (Join-Path $assetRoot 'waterfall.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$sheet = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'source/waterfall-sheet.png'))
$map = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'source/island.png'))
$frameWidth = [int]$config.display.width
$frameHeight = [int]$config.display.height
$atlas = [System.Drawing.Bitmap]::new(($frameWidth * $config.count), $frameHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Keep supplied water/foam pixels only. Warm grey rocks and green plants are excluded.
function Test-WaterPixel([System.Drawing.Color]$colour) {
  return $colour.A -gt 0 -and (
    ($colour.B - $colour.R -ge 25 -and $colour.B - $colour.G -ge -12 -and $colour.G -ge 65) -or
    ($colour.R -ge 210 -and $colour.G -ge 220 -and $colour.B -ge 230))
}

try {
  if ($sheet.Width -ne $config.cellWidth * $config.count -or $sheet.Height -lt $config.sheetCrop.y + $config.sheetCrop.height) {
    throw 'The supplied sheet does not match the six-frame manifest.'
  }
  $signatures = [System.Collections.Generic.HashSet[string]]::new()
  for ($frame = 0; $frame -lt $config.count; $frame++) {
    $signature = [System.Text.StringBuilder]::new()
    $visible = 0
    for ($y = 0; $y -lt $frameHeight; $y++) {
      for ($x = 0; $x -lt $frameWidth; $x++) {
        # Sampling at pixel centres is nearest-neighbour scaling, with no recolouring.
        $sheetX = $frame * $config.cellWidth + $config.sheetCrop.x + [Math]::Floor(($x + 0.5) * $config.sheetCrop.width / $frameWidth)
        $sheetY = $config.sheetCrop.y + [Math]::Floor(($y + 0.5) * $config.sheetCrop.height / $frameHeight)
        $mapX = $config.mapCrop.x + [Math]::Floor(($x + 0.5) * $config.mapCrop.width / $frameWidth)
        $mapY = $config.mapCrop.y + [Math]::Floor(($y + 0.5) * $config.mapCrop.height / $frameHeight)
        $colour = $sheet.GetPixel($sheetX, $sheetY)
        # The map's own water footprint is a second mask: no animated pixel may cover its rocks.
        if ((Test-WaterPixel $colour) -and (Test-WaterPixel ($map.GetPixel($mapX, $mapY)))) {
          $atlas.SetPixel($frame * $frameWidth + $x, $y, $colour)
          $visible++
        }
        [void]$signature.Append($atlas.GetPixel($frame * $frameWidth + $x, $y).ToArgb()).Append(',')
      }
    }
    if ($visible -eq 0) { throw "Waterfall frame $frame is empty." }
    if (-not $signatures.Add($signature.ToString())) { throw "Waterfall frame $frame duplicates an earlier frame." }
    Write-Output "Frame $frame`: $visible water/foam pixels; all rocks excluded."
  }
  $atlas.Save((Join-Path $assetRoot 'waterfall.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  if ($PreviewPath) {
    # Six enlarged map composites make frame alignment and static rocks reviewable.
    $preview = [System.Drawing.Bitmap]::new(1104, 640)
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      for ($frame = 0; $frame -lt $config.count; $frame++) {
        $left = ($frame % 3) * 368
        $top = [Math]::Floor($frame / 3) * 320
        $graphics.DrawImage($map, [System.Drawing.Rectangle]::new($left, $top, 368, 320), [System.Drawing.Rectangle]::new(400, 125, 240, 210), [System.Drawing.GraphicsUnit]::Pixel)
        $graphics.DrawImage($atlas, [System.Drawing.Rectangle]::new(($left + 56), ($top + 40), ($frameWidth * 4), ($frameHeight * 4)), [System.Drawing.Rectangle]::new(($frame * $frameWidth), 0, $frameWidth, $frameHeight), [System.Drawing.GraphicsUnit]::Pixel)
      }
      $preview.Save($PreviewPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $preview.Dispose() }
  }
} finally { $atlas.Dispose(); $map.Dispose(); $sheet.Dispose() }
