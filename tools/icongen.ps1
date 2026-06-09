Add-Type -AssemblyName System.Drawing

$sizes  = @(16, 48, 128)
$outDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\icons"))
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

function New-RoundedRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Funnel (filter) shape, points relative to canvas size (0..1)
$funnel = @(
  @(0.20, 0.24), @(0.80, 0.24), @(0.575, 0.50),
  @(0.575, 0.82), @(0.425, 0.71), @(0.425, 0.50)
)

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad    = [single]($s * 0.06)
  $rectF  = New-Object System.Drawing.RectangleF($pad, $pad, ($s - 2 * $pad), ($s - 2 * $pad))
  $radius = [single]($s * 0.22)
  $bg     = New-RoundedRect $rectF.X $rectF.Y $rectF.Width $rectF.Height $radius

  $c1   = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)   # purple
  $c2   = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)    # blue
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rectF, $c1, $c2, [single]55)
  $g.FillPath($grad, $bg)

  $pts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
  foreach ($pt in $funnel) {
    $pts.Add((New-Object System.Drawing.PointF([single]($pt[0] * $s), [single]($pt[1] * $s))))
  }
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.FillPolygon($white, $pts.ToArray())

  $path = Join-Path $outDir ("icon{0}.png" -f $s)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $bmp.Dispose(); $grad.Dispose(); $white.Dispose(); $bg.Dispose()
  Write-Output "wrote $path"
}
