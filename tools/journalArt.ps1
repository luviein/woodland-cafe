# Import approved PNGs without repainting: crop transparent padding and sample
# at nearest-neighbour positions. Keep their alpha instead of guessing a backdrop.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$jobs = @(
  @{ Source='journal-open-source.png'; Name='fieldJournal'; Width=540; Segment=-1 },
  @{ Source='journal-closed-source.png'; Name='fieldJournalIcon'; Width=16; Segment=-1 },
  @{ Source='journal-badges-source.png'; Name='discoveryBadge'; Width=28; Segment=0 },
  @{ Source='journal-badges-source.png'; Name='goldenBadge'; Width=28; Segment=1 },
  @{ Source='journal-badges-source.png'; Name='collectorBadge'; Width=28; Segment=2 },
  @{ Source='journal-bookmarks-source.png'; Name='journalCropsBookmark'; Width=112; Segment=-1; Crop=@(17,197,290,106); Outline=@(@(20,201),@(29,197),@(263,197),@(273,201),@(306,245),@(273,293),@(263,301),@(29,301),@(20,295)) },
  @{ Source='journal-bookmarks-source.png'; Name='journalMilestonesBookmark'; Width=112; Segment=-1; Crop=@(17,307,290,114); Outline=@(@(20,318),@(29,307),@(263,307),@(274,320),@(306,361),@(274,410),@(263,419),@(29,419),@(20,411)) },
  @{ Source='master-collector-ribbon-source.png'; Name='masterCollectorRibbon'; Width=160; Segment=-1 },
  @{ Source='master-collector-ribbon-source.png'; Name='masterCollectorWorldRibbon'; Width=128; Segment=-1 }
)
$manifest = @()
foreach ($job in $jobs) {
  $source = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) "art-templates/$($job.Source)"))
  $start=0; $end=$source.Width
  if ($job.Segment -ge 0) { $start=[int]($job.Segment*$source.Width/3); $end=[int](($job.Segment+1)*$source.Width/3) }
  $left=$end; $right=0; $top=$source.Height; $bottom=0
  for ($y=0; $y -lt $source.Height; $y++) { for ($x=$start; $x -lt $end; $x++) {
    if ($source.GetPixel($x,$y).A -ge 128) { $left=[Math]::Min($left,$x); $right=[Math]::Max($right,$x); $top=[Math]::Min($top,$y); $bottom=[Math]::Max($bottom,$y) }
  } }
  $mask=$null
  if ($job.Crop) {
    $left=$job.Crop[0]; $top=$job.Crop[1]; $right=$left+$job.Crop[2]-1; $bottom=$top+$job.Crop[3]-1
    # Isolate the supplied bookmark from the photographed book behind it.
    $mask=[Drawing.Drawing2D.GraphicsPath]::new()
    $points=[Drawing.PointF[]]@($job.Outline | ForEach-Object { [Drawing.PointF]::new($_[0],$_[1]) })
    $mask.AddPolygon($points)
  }
  $width=$job.Width; $height=[int][Math]::Round(($bottom-$top+1)*$width/($right-$left+1))
  $target=[System.Drawing.Bitmap]::new($width,$height)
  $bytes=[byte[]]::new($width*$height*4)
  for ($y=0; $y -lt $height; $y++) { for ($x=0; $x -lt $width; $x++) {
    $sx=$left+[int][Math]::Floor(($x+0.5)*($right-$left+1)/$width)
    $sy=$top+[int][Math]::Floor(($y+0.5)*($bottom-$top+1)/$height)
    $c=$source.GetPixel($sx,$sy)
    if ($mask -and (-not $mask.IsVisible($sx,$sy) -or ($c.R -lt 24 -and $c.G -lt 24 -and $c.B -lt 24))) { $c=[Drawing.Color]::Transparent }
    $target.SetPixel($x,$y,$c)
    $at=($y*$width+$x)*4; $bytes[$at]=$c.R; $bytes[$at+1]=$c.G; $bytes[$at+2]=$c.B; $bytes[$at+3]=$c.A
  } }
  $target.Save((Join-Path (Get-Location) "src/art/drawn/$($job.Name).png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $raw=Join-Path $env:TEMP "woodland-$($job.Name).rgba"
  [IO.File]::WriteAllBytes($raw,$bytes)
  $manifest += @{ name=$job.Name; width=$width; height=$height; raw=$raw }
  $source.Dispose(); $target.Dispose()
  if ($mask) { $mask.Dispose() }
}
$manifestPath=Join-Path $env:TEMP 'woodland-journal-assets.json'
[IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject $manifest), [Text.UTF8Encoding]::new($false))
node tools/journalArt.cjs $manifestPath
if ($LASTEXITCODE -ne 0) { throw 'Journal fallback generation failed' }
