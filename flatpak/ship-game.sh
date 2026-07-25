#!/bin/sh
# Flatpak entrypoint — DarkPlaces + shipgame gamedir (free assets only)
# basedir layout: $BASE/id1 (stub) + $BASE/shipgame (mod)
BASE="${SHIP_GAME_BASEDIR:-/app/share/ship-game/darkplaces}"
# Prefer Wayland when available; fall back to X11.
export SDL_VIDEODRIVER="${SDL_VIDEODRIVER:-wayland,x11}"
exec /app/bin/darkplaces-sdl -basedir "$BASE" -game shipgame +map ocean1 "$@"
