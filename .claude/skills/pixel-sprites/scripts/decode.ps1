# Decodes an image (png, jpg, webp, bmp, gif) to raw RGB bytes for pixel.cjs.
# Usage: powershell -File decode.ps1 <image> <out.rgb>   -> prints "width height"
# Uses WPF's decoders (they read webp when Windows has the codec, as it does by
# default on Windows 10/11), converted to 24-bit RGB.
param([Parameter(Mandatory)][string]$Image, [Parameter(Mandatory)][string]$Out)
Add-Type -AssemblyName PresentationCore
$stream = [IO.File]::OpenRead((Resolve-Path $Image))
try {
  $frame = [Windows.Media.Imaging.BitmapDecoder]::Create($stream, 'PreservePixelFormat', 'OnLoad').Frames[0]
} finally { $stream.Close() }
$rgb = New-Object Windows.Media.Imaging.FormatConvertedBitmap($frame, [Windows.Media.PixelFormats]::Rgb24, $null, 0)
$w = $rgb.PixelWidth; $h = $rgb.PixelHeight
$bytes = New-Object byte[] ($w * $h * 3)
$rgb.CopyPixels($bytes, $w * 3, 0)
[IO.File]::WriteAllBytes($Out, $bytes)
"$w $h"
