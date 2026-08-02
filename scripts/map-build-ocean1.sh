#!/usr/bin/env bash
# Build textured ocean1.bsp with ericw-tools (qbsp + light).
# Requires: ericw-tools on PATH, or ERICW_BIN dir, or /tmp/ericw/... from a prior download.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAPDIR="$ROOT/darkplaces/shipgame/maps"
find_tool() {
  local name="$1"
  if [[ -n "${ERICW_BIN:-}" && -x "$ERICW_BIN/$name" ]]; then echo "$ERICW_BIN/$name"; return; fi
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return; fi
  local cand
  cand="$(find /tmp/ericw -type f -name "$name" 2>/dev/null | head -1 || true)"
  if [[ -n "$cand" && -x "$cand" ]]; then echo "$cand"; return; fi
  echo "error: $name not found. Install ericw-tools or set ERICW_BIN." >&2
  exit 1
}
QBSP="$(find_tool qbsp)"
LIGHT="$(find_tool light)"
test -f "$MAPDIR/shipgame.wad"
test -f "$MAPDIR/ocean1.map"
cd "$MAPDIR"
"$QBSP" -wadpath "$MAPDIR" ocean1.map
"$LIGHT" -extra ocean1.bsp
ls -lh ocean1.bsp
echo "[map-build-ocean1] ok"
