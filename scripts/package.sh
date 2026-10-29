#!/usr/bin/env bash
# Builds dist/declutter-for-clickup-<version>.zip for Chrome Web Store upload.
# Only runtime files go in; docs, store assets and scripts stay out.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(grep -m1 '"version"' manifest.json | sed -E 's/.*"version": *"([^"]+)".*/\1/')
out="dist/declutter-for-clickup-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -X "$out" manifest.json rules.js content.js content.css popup.html popup.js LICENSE icons/*.png
echo "Built $out ($(du -h "$out" | cut -f1))"
