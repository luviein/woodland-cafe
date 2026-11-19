param([string]$PreviewPath = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'src/assets/prep'
$config = Get-Content -LiteralPath (Join-Path $assetRoot 'layers.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$layers = @()
try {
  foreach ($entry in $config.sources.PSObject.Properties) {
    $source = [System.Drawing.Bitmap]::new((Join-Path $assetRoot ('source/' + $entry.Value.file)))
    $crop = $entry.Value.crop
    $outputHeight = if ($entry.Value.height) { [int]$entry.Value.height } else { [int]$config.height }
    $contentHeight = if ($entry.Value.contentHeight) { [int]$entry.Value.contentHeight } else { $outputHeight }
    $outside = [bool[]]::new($crop.width * $crop.height)
    $queue = [System.Collections.Generic.Queue[int]]::new()
    # The supplied checkerboard is opaque. Flood only neutral black/grey pixels
    # connected to the crop edge, preserving enclosed ingredient details.
    for ($y = 0; $y -lt $crop.height; $y++) {
      for ($x = 0; $x -lt $crop.width; $x++) {
        if ($x -eq 0 -or $y -eq 0 -or $x -eq $crop.width - 1 -or $y -eq $crop.height - 1) { $queue.Enqueue($y * $crop.width + $x) }
      }
    }
    while ($queue.Count -gt 0) {
      $index = $queue.Dequeue()
      if ($outside[$index]) { continue }
      $x = $index % $crop.width; $y = [int][Math]::Floor($index / $crop.width)
      $colour = $source.GetPixel(($crop.x + $x),($crop.y + $y))
      if ($colour.A -gt 0 -and ($colour.R -gt 24 -or $colour.G -gt 24 -or $colour.B -gt 24 -or
          [Math]::Abs([int]$colour.R - $colour.G) -gt 2 -or [Math]::Abs([int]$colour.G - $colour.B) -gt 2)) { continue }
      $outside[$index] = $true
      if ($x -gt 0) { $queue.Enqueue($index - 1) }
      if ($x -lt $crop.width - 1) { $queue.Enqueue($index + 1) }
      if ($y -gt 0) { $queue.Enqueue($index - $crop.width) }
      if ($y -lt $crop.height - 1) { $queue.Enqueue($index + $crop.width) }
    }
    $layer = [System.Drawing.Bitmap]::new($config.width,$outputHeight,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $visible = 0
    for ($y = 0; $y -lt $contentHeight; $y++) {
      for ($x = 0; $x -lt $config.width; $x++) {
        $sx = [int][Math]::Floor(($x + 0.5) * $crop.width / $config.width)
        $sy = [int][Math]::Floor(($y + 0.5) * $crop.height / $contentHeight)
        if (-not $outside[$sy * $crop.width + $sx]) {
          $layer.SetPixel($x,$y,$source.GetPixel(($crop.x + $sx),($crop.y + $sy))); $visible++
        }
      }
    }
    $source.Dispose()
    if ($visible -eq 0) { throw "$($entry.Name) is empty." }
    $layer.Save((Join-Path $assetRoot ($entry.Name + '.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $layers += $layer
    Write-Output "$($entry.Name): $($config.width)x$outputHeight, $visible foreground pixels, checkerboard removed."
  }
  if ($PreviewPath) {
    $preview = [System.Drawing.Bitmap]::new(800,300)
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    try {
      $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#ead4ad'))
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      for ($i = 0; $i -lt $layers.Count; $i++) {
        $graphics.DrawImage($layers[$i],[System.Drawing.Rectangle]::new(24,(24+$i*78),336,($layers[$i].Height*6)))
        $graphics.DrawImage($layers[$i],[System.Drawing.Rectangle]::new(430,(220-$i*36),336,($layers[$i].Height*6)))
      }
      $preview.Save($PreviewPath,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $preview.Dispose() }
  }
} finally { foreach($layer in $layers) { $layer.Dispose() } }
