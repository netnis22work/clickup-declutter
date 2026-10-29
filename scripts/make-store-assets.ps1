# Builds the extension icons and Chrome Web Store images.
# Usage: powershell -File scripts/make-store-assets.ps1 -Before <png|jpg> -After <png|jpg> -Popup <png|jpg>
# Before/After are raw tab screenshots (any size, 16:10 region taken from the left edge).
# Popup is a screenshot of popup.html alone (340px wide), composited over the After shot.
# Optional -Blur "x1,y1,x2,y2" pixelates a region of the Before shot (in its own pixels).
param(
  [string]$Before,
  [string]$After,
  [string]$Popup,
  [string]$Blur = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$store = Join-Path $root 'store'
$icons = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $store, $icons | Out-Null

# Non-ASCII via char codes: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.
$dot = " $([char]0x00B7) "
$purple = [System.Drawing.Color]::FromArgb(123, 104, 238)
$pink = [System.Drawing.Color]::FromArgb(196, 76, 220)
$ink = [System.Drawing.Color]::FromArgb(22, 21, 29)

function New-Canvas($w, $h) {
  $b = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  return @($b, $g)
}

function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Grad($x, $y, $w, $h) {
  New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.RectangleF $x, $y, $w, $h), $purple, $pink, 45
}

# Icon art: rounded gradient square with three "list" bars, the last one swept away.
function Draw-IconArt($g, $x, $y, $s) {
  $g.FillPath((Grad $x $y $s $s), (RoundRect $x $y $s $s ($s * 0.22)))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $faint = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 255, 255, 255))
  $bh = [Math]::Max(2, $s * 0.11); $bx = $x + $s * 0.22
  $g.FillPath($white, (RoundRect $bx ($y + $s * 0.27) ($s * 0.56) $bh ($bh / 2)))
  $g.FillPath($white, (RoundRect $bx ($y + $s * 0.45) ($s * 0.40) $bh ($bh / 2)))
  $g.FillPath($faint, (RoundRect $bx ($y + $s * 0.63) ($s * 0.20) $bh ($bh / 2)))
  # sparkle
  $cx = $x + $s * 0.72; $cy = $y + $s * 0.68; $r = $s * 0.13
  $pts = @(
    (New-Object System.Drawing.PointF $cx, ($cy - $r)), (New-Object System.Drawing.PointF ($cx + $r * 0.28), ($cy - $r * 0.28)),
    (New-Object System.Drawing.PointF ($cx + $r), $cy), (New-Object System.Drawing.PointF ($cx + $r * 0.28), ($cy + $r * 0.28)),
    (New-Object System.Drawing.PointF $cx, ($cy + $r)), (New-Object System.Drawing.PointF ($cx - $r * 0.28), ($cy + $r * 0.28)),
    (New-Object System.Drawing.PointF ($cx - $r), $cy), (New-Object System.Drawing.PointF ($cx - $r * 0.28), ($cy - $r * 0.28))
  )
  $g.FillPolygon($white, $pts)
}

# ---------- icons ----------
foreach ($s in 16, 32, 48, 128) {
  $b, $g = New-Canvas $s $s
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($s -eq 128) { Draw-IconArt $g 16 16 96 } else { Draw-IconArt $g 0 0 $s }
  $b.Save((Join-Path $icons "$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $b.Dispose()
}

# ---------- screenshots ----------
function Load-Shot($path, $blurRect) {
  $src = [System.Drawing.Image]::FromFile((Resolve-Path $path))
  $cropW = [int][Math]::Min($src.Width, [Math]::Round($src.Height * 1.6))
  $cropH = [int][Math]::Round($cropW / 1.6)
  $b, $g = New-Canvas 1280 800
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, 1280, 800), (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), 'Pixel')
  if ($blurRect) {
    $k = 1280 / $cropW
    $x1, $y1, $x2, $y2 = $blurRect.Split(',') | ForEach-Object { [int]([int]$_ * $k) }
    $cell = 14
    for ($yy = $y1; $yy -lt $y2; $yy += $cell) {
      for ($xx = $x1; $xx -lt $x2; $xx += $cell) {
        $c = $b.GetPixel([Math]::Min($xx + $cell / 2, 1279), [Math]::Min($yy + $cell / 2, 799))
        $g.FillRectangle((New-Object System.Drawing.SolidBrush $c), $xx, $yy, [Math]::Min($cell, $x2 - $xx), [Math]::Min($cell, $y2 - $yy))
      }
    }
  }
  $g.Dispose(); $src.Dispose()
  return $b
}

$beforeImg = Load-Shot $Before $Blur
$afterImg = Load-Shot $After $null
$beforeImg.Save((Join-Path $store 'screenshot-3-before.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$afterImg.Save((Join-Path $store 'screenshot-2-after.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# Screenshot 4: popup panel over a dimmed After shot, anchored top-right like a real extension popup
$panel = [System.Drawing.Image]::FromFile((Resolve-Path $Popup))
$b, $g = New-Canvas 1280 800
$g.DrawImage($afterImg, 0, 0, 1280, 800)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 0, 0, 0))), 0, 0, 1280, 800)
$pw = [int]($panel.Width * 1.25); $ph = [int]($panel.Height * 1.25)
$px = 1280 - $pw - 48; $py = 20
for ($i = 1; $i -le 8; $i++) {
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(10, 0, 0, 0))), (RoundRect ($px - $i) ($py - $i + 6) ($pw + 2 * $i) ($ph + 2 * $i) (14 + $i)))
}
$g.SetClip((RoundRect $px $py $pw $ph 14))
$g.DrawImage($panel, $px, $py, $pw, $ph)
$g.ResetClip()
$g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 255, 255, 255)), 1), (RoundRect $px $py $pw $ph 14))
$b.Save((Join-Path $store 'screenshot-4-popup.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $b.Dispose(); $panel.Dispose()

$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(185, 182, 205))
$fontTitle = New-Object System.Drawing.Font 'Segoe UI Semibold', 40
$fontLabel = New-Object System.Drawing.Font 'Segoe UI Semibold', 15
$fontBody = New-Object System.Drawing.Font 'Segoe UI', 17
$center = New-Object System.Drawing.StringFormat; $center.Alignment = 'Center'

function Framed($g, $img, $x, $y, $w, $h) {
  $g.SetClip((RoundRect $x $y $w $h 12))
  $g.DrawImage($img, $x, $y, $w, $h)
  $g.ResetClip()
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), 1), (RoundRect $x $y $w $h 12))
}

function Pill($g, $text, $x, $y, $brush) {
  $sz = $g.MeasureString($text, $fontLabel)
  $g.FillPath($brush, (RoundRect $x $y ($sz.Width + 24) 34 17))
  $g.DrawString($text, $fontLabel, $white, ($x + 12), ($y + 5))
}

# Screenshot 1: before / after side by side
$b, $g = New-Canvas 1280 800
$g.Clear($ink)
$g.FillRectangle((Grad 0 0 1280 6), 0, 0, 1280, 6)
$g.DrawString('Same ClickUp. None of the clutter.', $fontTitle, $white, (New-Object System.Drawing.RectangleF 0, 50, 1280, 70), $center)
$g.DrawString('Hides AI buttons, chat, "What''s new" popups and upgrade nags. Toggle anything back anytime.', $fontBody, $muted, (New-Object System.Drawing.RectangleF 0, 122, 1280, 40), $center)
$w = 596; $h = [int]($w / 1.6)
Framed $g $beforeImg 32 236 $w $h
Framed $g $afterImg 652 236 $w $h
Pill $g 'BEFORE' 32 188 (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 70, 70, 80)))
Pill $g 'AFTER' 652 188 (Grad 652 188 100 34)
$g.DrawString((@('AI', 'Chat & channels', 'Popups & tours', 'Upgrade nags', 'Unused rail items') -join "  $dot  "), $fontBody, $muted, (New-Object System.Drawing.RectangleF 0, 656, 1280, 40), $center)
$g.DrawString((@('Free', 'Open source', 'No data collected') -join $dot), $fontLabel, $white, (New-Object System.Drawing.RectangleF 0, 716, 1280, 40), $center)
$b.Save((Join-Path $store 'screenshot-1-before-after.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $b.Dispose()

# Small promo tile 440x280
$b, $g = New-Canvas 440 280
$g.FillRectangle((Grad 0 0 440 280), 0, 0, 440, 280)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 0, 0, 0))), 0, 0, 440, 280)
Draw-IconArt $g 40 64 72
$g.DrawString('Declutter', (New-Object System.Drawing.Font 'Segoe UI Semibold', 30), $white, 130, 58)
$g.DrawString('for ClickUp', (New-Object System.Drawing.Font 'Segoe UI', 20), $white, 133, 104)
$g.DrawString("Hide AI, chat, popups`nand upgrade nags.", (New-Object System.Drawing.Font 'Segoe UI', 17), $white, 40, 172)
$b.Save((Join-Path $store 'promo-small-440x280.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $b.Dispose()

# Marquee 1400x560
$b, $g = New-Canvas 1400 560
$g.FillRectangle((Grad 0 0 1400 560), 0, 0, 1400, 560)
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 0, 0, 0))), 0, 0, 1400, 560)
Draw-IconArt $g 80 120 88
$g.DrawString('Declutter for ClickUp', (New-Object System.Drawing.Font 'Segoe UI Semibold', 40), $white, 74, 222)
$g.DrawString("Hide the AI, chat, popups and upgrade`nnags. Keep your tasks.", (New-Object System.Drawing.Font 'Segoe UI', 22), $white, 80, 300)
$g.DrawString((@('Free', 'Open source', 'No data collected') -join " $dot "),(New-Object System.Drawing.Font 'Segoe UI Semibold', 15), $white, 82, 420)
Framed $g $afterImg 660 70 784 490
$b.Save((Join-Path $store 'promo-marquee-1400x560.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $b.Dispose()

$beforeImg.Dispose(); $afterImg.Dispose()
Get-ChildItem $store, $icons -Filter *.png | ForEach-Object {
  $i = [System.Drawing.Image]::FromFile($_.FullName); "{0,-34} {1}x{2}" -f $_.Name, $i.Width, $i.Height; $i.Dispose()
}
