#!/bin/sh
# Renders tools/og/card.html to the two social preview images at the repo root.
# Needs Google Chrome installed (macOS path below; adjust elsewhere).
set -e
cd "$(dirname "$0")/../.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CARD="file://$PWD/tools/og/card.html"
for pair in "og.png:" "og-guide.png:?guide"; do
  out="${pair%%:*}"
  query="${pair#*:}"
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --screenshot="$PWD/$out" "$CARD$query" 2>/dev/null
  echo "wrote $out"
done
