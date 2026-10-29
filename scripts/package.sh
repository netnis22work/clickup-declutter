#!/usr/bin/env bash
# Builds dist/declutter-for-clickup-<version>.zip for Chrome Web Store upload.
# Only runtime files go in; docs, store assets and scripts stay out.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(grep -m1 '"version"' manifest.json | sed -E 's/.*"version": *"([^"]+)".*/\1/')
out="dist/declutter-for-clickup-${version}.zip"

files=(manifest.json rules.js content.js background.js content.css popup.html popup.js LICENSE icons/*.png)

mkdir -p dist
rm -f "$out"
if command -v zip >/dev/null; then
  zip -q -X "$out" "${files[@]}"
else
  python3 -c 'import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:
    [z.write(f) for f in sys.argv[2:]]' "$out" "${files[@]}"
fi
echo "Built $out ($(du -h "$out" | cut -f1))"
