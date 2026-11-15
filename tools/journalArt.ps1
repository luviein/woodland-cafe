# Prepare PNG cutouts from approved originals. No letter grids or code art.
param([string[]]$Only = @())
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$jobs = @(
  @{ Source='journal-open-source.png'; Name='fieldJournal'; Width=540; Segment=-1 },
  @{ Source='journal-closed-source.png'; Name='fieldJournalIcon'; Width=16; Segment=-1 },
  @{ Source='journal-badges-source.png'; Name='discoveryBadge'; Width=28; Segment=0 },
  @{ Source='journal-badges-source.png'; Name='goldenBadge'; Width=28; Segment=1 },
  @{ Source='journal-badges-source.png'; Name='collectorBadge'; Width=28; Segment=2 },
  @{ Source='journal-bookmarks-source.png'; Name='journalCropsBookmark'; Width=112; Segment=-1; Crop=@(17,197,288,100); Outline=@(@(20,202),@(28,197),@(263,197),@(272,203),@(304,245),@(272,288),@(263,296),@(28,296),@(20,290)) },
  @{ Source='journal-bookmarks-source.png'; Name='journalMilestonesBookmark'; Width=112; Segment=-1; Crop=@(17,317,288,98); Outline=@(@(20,320),@(28,317),@(263,317),@(272,319),@(304,361),@(272,405),@(263,414),@(28,414),@(20,408)) },
  @{ Source='master-collector-ribbon-source.png'; Name='masterCollectorRibbon'; Width=160; Segment=-1 },
  @{ Source='master-collector-ribbon-source.png'; Name='masterCollectorWorldRibbon'; Width=128; Segment=-1 },
  @{ Source='golden-title-source.png'; Name='goldenCollectorRibbon'; Segment=-1; Native=$true },
  @{ Source='christmas-title-source.png'; Name='christmasDevoteeRibbon'; Segment=-1; Native=$true }
)
if ($Only.Count) { $jobs = @($jobs | Where-Object { $Only -contains $_.Name }) }
foreach ($job in $jobs) {
  $source = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) "src/assets/journal/source/$($job.Source)"))
  $start=0; $end=$source.Width
  if ($job.Segment -ge 0) { $start=[int]($job.Segment*$source.Width/3); $end=[int](($job.Segment+1)*$source.Width/3) }
  $left=$end; $right=0; $top=$source.Height; $bottom=0
  $startY=0; $endY=$source.Height
  if ($job.RangeY) { $startY=$job.RangeY[0]; $endY=$job.RangeY[1] }
  if (-not $job.Crop) { for ($y=$startY; $y -lt $endY; $y++) { for ($x=$start; $x -lt $end; $x++) {
    if ($source.GetPixel($x,$y).A -ge 128) { $left=[Math]::Min($left,$x); $right=[Math]::Max($right,$x); $top=[Math]::Min($top,$y); $bottom=[Math]::Max($bottom,$y) }
  } } }
  $mask=$null
  if ($job.Crop) {
    $left=$job.Crop[0]; $top=$job.Crop[1]; $right=$left+$job.Crop[2]-1; $bottom=$top+$job.Crop[3]-1
    # Isolate the supplied bookmark from the photographed book behind it.
    $mask=[Drawing.Drawing2D.GraphicsPath]::new()
    $points=[Drawing.PointF[]]@($job.Outline | ForEach-Object { [Drawing.PointF]::new($_[0],$_[1]) })
    $mask.AddPolygon($points)
  }
  $width=if($job.Native){$right-$left+1}else{$job.Width}
  $height=if($job.Native){$bottom-$top+1}else{[int][Math]::Round(($bottom-$top+1)*$width/($right-$left+1))}
  $target=[System.Drawing.Bitmap]::new($width,$height)
  for ($y=0; $y -lt $height; $y++) { for ($x=0; $x -lt $width; $x++) {
    $sx=$left+[int][Math]::Floor(($x+0.5)*($right-$left+1)/$width)
    $sy=$top+[int][Math]::Floor(($y+0.5)*($bottom-$top+1)/$height)
    $c=$source.GetPixel($sx,$sy)
    if ($mask -and (-not $mask.IsVisible($sx,$sy) -or ($c.R -lt 24 -and $c.G -lt 24 -and $c.B -lt 24))) { $c=[Drawing.Color]::Transparent }
    $target.SetPixel($x,$y,$c)
  } }
  $target.Save((Join-Path (Get-Location) "src/assets/journal/$($job.Name).png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $source.Dispose(); $target.Dispose()
  if ($mask) { $mask.Dispose() }
}
