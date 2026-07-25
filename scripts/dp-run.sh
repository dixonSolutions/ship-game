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

if [[ ! -d "$BASE/id1" ]]; then
  echo "error: missing free stub basedir: $BASE/id1" >&2
  echo "DarkPlaces requires an id1 gamedir next to shipgame (empty stub is OK)." >&2
  exit 1
fi
if [[ ! -f "$BASE/$GAME/maps/start.bsp" ]]; then
  echo "warn: missing $BASE/$GAME/maps/start.bsp — copying from ocean1.bsp" >&2
  cp -f "$BASE/$GAME/maps/ocean1.bsp" "$BASE/$GAME/maps/start.bsp"
fi

MAP="${1:-ocean1}"
echo "[dp-run] bin=$BIN basedir=$BASE -game $GAME +map $MAP"
exec "$BIN" -basedir "$BASE" -game "$GAME" +map "$MAP" "${@:2}"
