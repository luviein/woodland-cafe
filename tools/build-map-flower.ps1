param([string]$PreviewPath = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'src/assets/worldMap'
$config = Get-Content -LiteralPath (Join-Path $assetRoot 'flower.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$map = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'source/island.png'))
$approved = [System.Drawing.Bitmap]::new((Join-Path $assetRoot 'source/flower-approved.png'))
$width = [int]$config.mapCrop.width; $height = [int]$config.mapCrop.height
$mask = [bool[]]::new($width * $height)
$grown = [bool[]]::new($width * $height)
$patch = [System.Drawing.Bitmap]::new($config.display.width, $config.display.height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

function Test-FlowerPixel([System.Drawing.Color]$colour) {
  return $colour.A -gt 0 -and (
    ($colour.R -ge 185 -and $colour.G -ge 180 -and $colour.B -ge 150) -or
    ($colour.R -ge 180 -and $colour.G -ge 120 -and $colour.B -lt 140) -or
    ($colour.R -lt 110 -and $colour.G -lt 170 -and $colour.G -gt $colour.R))
}

try {
  for ($y = $config.selection.y; $y -lt $config.selection.y + $config.selection.height; $y++) {
    for ($x = $config.selection.x; $x -lt $config.selection.x + $config.selection.width; $x++) {
      $old = $map.GetPixel(($config.mapCrop.x + $x), ($config.mapCrop.y + $y))
      $new = $approved.GetPixel([Math]::Floor(($x + 0.5) * $approved.Width / $width), [Math]::Floor(($y + 0.5) * $approved.Height / $height))
      $mask[$y * $width + $x] = (Test-FlowerPixel $old) -or (Test-FlowerPixel $new)
    }
  }
  # Include a narrow margin to cover the old petals' filtered edges, not a rectangular grass patch.
  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      if (-not $mask[$y * $width + $x]) { continue }
      for ($dy = -$config.maskPadding; $dy -le $config.maskPadding; $dy++) {
        for ($dx = -$config.maskPadding; $dx -le $config.maskPadding; $dx++) {
          $nx = $x + $dx; $ny = $y + $dy
          if ($nx -ge 0 -and $ny -ge 0 -and $nx -lt $width -and $ny -lt $height) { $grown[$ny * $width + $nx] = $true }
        }
      }
    }
  }
  $visible = 0
  for ($y = 0; $y -lt $patch.Height; $y++) {
    for ($x = 0; $x -lt $patch.Width; $x++) {
      $covered = $false
      # Cover every original flower pixel contributing to this game-resolution pixel.
      for ($sy = [Math]::Floor($y * $height / $patch.Height); $sy -lt [Math]::Ceiling(($y + 1) * $height / $patch.Height); $sy++) {
        for ($sx = [Math]::Floor($x * $width / $patch.Width); $sx -lt [Math]::Ceiling(($x + 1) * $width / $patch.Width); $sx++) {
          if ($grown[$sy * $width + $sx]) { $covered = $true }
        }
      }
      if ($covered) {
        $colour = $approved.GetPixel([Math]::Floor(($x + 0.5) * $approved.Width / $patch.Width), [Math]::Floor(($y + 0.5) * $approved.Height / $patch.Height))
        $patch.SetPixel($x, $y, $colour); $visible++
      }
    }
  }
  if ($visible -eq 0) { throw 'The approved flower patch is empty.' }
  $patch.Save((Join-Path $assetRoot 'flower.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "Flower patch: $($patch.Width)x$($patch.Height), $visible visible pixels; background outside the cluster is transparent."

  if ($PreviewPath) {
    $before = [System.Drawing.Bitmap]::new(640,360)
    $canvas = [System.Drawing.Graphics]::FromImage($before)
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
    $canvas.DrawImage($map,0,0,640,360); $canvas.Dispose()
    $after = [System.Drawing.Bitmap]::new($before)
    $canvas = [System.Drawing.Graphics]::FromImage($after)
    $canvas.DrawImageUnscaled($patch,$config.display.x,$config.display.y); $canvas.Dispose()
    $preview = [System.Drawing.Bitmap]::new(600,300)
    $canvas = [System.Drawing.Graphics]::FromImage($preview)
    try {
      $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $canvas.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $crop = [System.Drawing.Rectangle]::new(204,265,50,50)
      $canvas.DrawImage($before,[System.Drawing.Rectangle]::new(0,0,300,300),$crop,[System.Drawing.GraphicsUnit]::Pixel)
      $canvas.DrawImage($after,[System.Drawing.Rectangle]::new(300,0,300,300),$crop,[System.Drawing.GraphicsUnit]::Pixel)
      $preview.Save($PreviewPath,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $canvas.Dispose(); $preview.Dispose(); $before.Dispose(); $after.Dispose() }
  }
} finally { $patch.Dispose(); $approved.Dispose(); $map.Dispose() }
