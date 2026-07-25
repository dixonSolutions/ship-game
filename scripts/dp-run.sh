#!/usr/bin/env bash
# Launch DarkPlaces with the shipgame gamedir.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/darkplaces"
GAME="shipgame"

BIN="${DARKPLACES_BIN:-}"
if [[ -z "$BIN" ]]; then
  for c in \
    "$ROOT/.local/darkplaces/darkplaces-sdl" \
    "$ROOT/.local/darkplaces/darkplaces" \
    "$(command -v darkplaces-sdl || true)" \
    "$(command -v darkplaces || true)"
  do
    if [[ -n "$c" && -x "$c" ]]; then BIN="$c"; break; fi
  done
fi

if [[ -z "${BIN}" ]]; then
  echo "error: DarkPlaces binary not found." >&2
  echo "Set DARKPLACES_BIN or build engine into .local/darkplaces (see docs/darkplaces.md)." >&2
  exit 1
fi

if [[ ! -f "$BASE/id1/pak0.pak" ]]; then
  echo "[dp-run] missing free LibreQuake id1 data — fetching…" >&2
  bash "$ROOT/scripts/dp-fetch-librequake.sh"
fi
if [[ ! -f "$BASE/id1/pak0.pak" ]]; then
  echo "error: DarkPlaces needs $BASE/id1/pak0.pak (LibreQuake)." >&2
  echo "Run: ./scripts/dp-fetch-librequake.sh" >&2
  exit 1
fi
if [[ ! -f "$BASE/$GAME/maps/start.bsp" ]]; then
  echo "warn: missing $BASE/$GAME/maps/start.bsp — copying from ocean1.bsp" >&2
  cp -f "$BASE/$GAME/maps/ocean1.bsp" "$BASE/$GAME/maps/start.bsp"
fi

MAP="${1:-ocean1}"
echo "[dp-run] bin=$BIN basedir=$BASE -game $GAME +map $MAP"
exec "$BIN" -basedir "$BASE" -game "$GAME" +map "$MAP" "${@:2}"
