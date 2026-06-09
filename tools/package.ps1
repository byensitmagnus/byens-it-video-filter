<#
.SYNOPSIS
  Builds a Chrome Web Store-ready ZIP of the Byens IT Video Filter extension.

.DESCRIPTION
  Reads the version from manifest.json, assembles a clean staging copy of only
  the runtime files Chrome needs (manifest.json, icons, src, popup), and zips
  them so that manifest.json sits at the ROOT of the archive (a hard Chrome
  requirement). Development-only files (tools, docs, .git, dist, *.md, LICENSE,
  .gitignore, screenshots, *.zip) are never included.

  Run from anywhere:  powershell -ExecutionPolicy Bypass -File tools\package.ps1
#>

# Stop on the first unhandled error so a broken build never produces a half-zip.
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Locate the repo root. This script lives in <repo>\tools, so the root is
#    one directory up from $PSScriptRoot. GetFullPath normalises the "..".
# ---------------------------------------------------------------------------
$repoRoot     = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifestPath = Join-Path $repoRoot "manifest.json"

if (-not (Test-Path $manifestPath)) {
    throw "manifest.json not found at '$manifestPath'. Run this from the repo's tools folder."
}

# ---------------------------------------------------------------------------
# 2. Read the version straight out of manifest.json.
# ---------------------------------------------------------------------------
$manifest = Get-Content -Path $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$version  = $manifest.version

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Could not read a 'version' field from manifest.json."
}

Write-Output "Packaging Byens IT Video Filter v$version ..."

# ---------------------------------------------------------------------------
# 3. Ensure the dist folder exists at the repo root.
# ---------------------------------------------------------------------------
$distDir = Join-Path $repoRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

# Final output path. Overwrite any previous build of the same version.
$zipName = "byens-it-video-filter-v$version.zip"
$zipPath = Join-Path $distDir $zipName
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

# ---------------------------------------------------------------------------
# 4. Build a clean staging copy in a fresh temp folder. Zipping the staging
#    folder's CONTENTS (not the folder itself) guarantees manifest.json ends
#    up at the zip root rather than nested inside a subfolder.
#
#    Only the runtime payload is copied in:
#      - manifest.json   (single file)
#      - icons\          (whole folder)
#      - src\            (whole folder: background.js, inject.js, content.js, panel.css, ...)
#      - popup\          (whole folder: popup.html, popup.js, ...)
#
#    Everything else (tools, docs, .git, dist, *.md, LICENSE, .gitignore,
#    screenshots, *.zip) is simply never copied, so it cannot leak into the zip.
# ---------------------------------------------------------------------------
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) ("bivf-pkg-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

try {
    # Single runtime file.
    Copy-Item -Path $manifestPath -Destination (Join-Path $stagingDir "manifest.json") -Force

    # Runtime folders. Each is required; fail loudly if one is missing.
    $runtimeFolders = @("icons", "src", "popup")
    foreach ($folder in $runtimeFolders) {
        $srcFolder = Join-Path $repoRoot $folder
        if (-not (Test-Path $srcFolder)) {
            throw "Required runtime folder '$folder' is missing at '$srcFolder'."
        }
        # -Recurse copies the folder and everything beneath it into staging.
        Copy-Item -Path $srcFolder -Destination $stagingDir -Recurse -Force
    }

    # -----------------------------------------------------------------------
    # 5. Create the zip from the staging folder's contents. The "\*" wildcard
    #    on the source makes Compress-Archive place those items at the archive
    #    root, so manifest.json lands at the top level.
    # -----------------------------------------------------------------------
    Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force
}
finally {
    # -----------------------------------------------------------------------
    # 6. Always clean up the temp staging folder, even if zipping failed.
    # -----------------------------------------------------------------------
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------------------
# 7. Report the result: path, size, and the Chrome reminder.
# ---------------------------------------------------------------------------
$zipItem  = Get-Item -Path $zipPath
$sizeKB   = [math]::Round($zipItem.Length / 1KB, 1)

Write-Output ""
Write-Output "Done. Chrome Web Store package created:"
Write-Output "  Path: $($zipItem.FullName)"
Write-Output "  Size: $sizeKB KB ($($zipItem.Length) bytes)"
Write-Output ""
Write-Output "Reminder: manifest.json must sit at the ROOT of the zip (NOT inside a"
Write-Output "subfolder) or Chrome will reject the upload. This script guarantees that"
Write-Output "by zipping a flat staging copy."
