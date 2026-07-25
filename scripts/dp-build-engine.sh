#!/usr/bin/env bash
# Clone and build DarkPlaces engine (best-effort; needs SDL2 + build tools).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.local/darkplaces"
SRC="$OUT/src"

mkdir -p "$OUT"
if [[ ! -d "$SRC/.git" ]]; then
  git clone --depth 1 https://github.com/darkplacesengine/darkplaces.git "$SRC"
fi

if ! command -v sdl2-config >/dev/null 2>&1 && [[ ! -f /usr/include/SDL2/SDL.h ]]; then
  echo "error: SDL2 headers required (Debian: libsdl2-dev libjpeg-dev)." >&2
  echo "CI Flatpak SDK provides these; local engine build skipped." >&2
  exit 2
fi

cd "$SRC"
# DarkPlaces makefile targets vary by revision; try common ones.
if make -j"$(nproc)" sdl-release 2>/tmp/dp-make.log; then
  :
elif make -j"$(nproc)" release 2>>/tmp/dp-make.log; then
  :
else
  echo "engine build failed — see /tmp/dp-make.log" >&2
  tail -40 /tmp/dp-make.log >&2 || true
  exit 1
fi

# Locate binary
BIN=$(find "$SRC" -maxdepth 2 -type f -name 'darkplaces*' -perm -111 | head -1 || true)
if [[ -z "$BIN" ]]; then
  echo "built but binary not found" >&2
  exit 1
fi
cp -f "$BIN" "$OUT/darkplaces-sdl"
chmod +x "$OUT/darkplaces-sdl"
echo "[dp-build-engine] $OUT/darkplaces-sdl"
