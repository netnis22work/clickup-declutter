# Builds dist/declutter-for-clickup-<version>.zip for Chrome Web Store upload.
# Only runtime files go in; docs, store assets and scripts stay out.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$files = @('manifest.json', 'rules.js', 'content.js', 'content.css', 'popup.html', 'popup.js', 'LICENSE') +
  (Get-ChildItem (Join-Path $root 'icons') -Filter *.png | ForEach-Object { "icons/$($_.Name)" })

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$zipPath = Join-Path $dist "declutter-for-clickup-$version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

# Built entry by entry: Compress-Archive on Windows PowerShell 5.1 writes "\" separators,
# which the Chrome Web Store rejects.
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($f in $files) {
    $src = Join-Path $root ($f -replace '/', '\')
    if (-not (Test-Path $src)) { throw "Missing $f" }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $src, $f, 'Optimal') | Out-Null
  }
} finally { $zip.Dispose() }

"Built $zipPath ($([Math]::Round((Get-Item $zipPath).Length / 1KB, 1)) KB, $($files.Count) files)"
