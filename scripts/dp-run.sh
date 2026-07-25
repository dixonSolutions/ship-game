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

MAP="${1:-ocean1}"
echo "[dp-run] bin=$BIN basedir=$BASE -game $GAME +map $MAP"
exec "$BIN" -basedir "$BASE" -game "$GAME" +map "$MAP" "${@:2}"
