#!/bin/sh
# Flatpak entrypoint — DarkPlaces + shipgame gamedir (free assets only)
# basedir layout: $BASE/id1 (stub) + $BASE/shipgame (mod)
BASE="${SHIP_GAME_BASEDIR:-/app/share/ship-game/darkplaces}"
# Prefer X11 when available. SDL often tries Wayland first and fails with
# "video driver did not add any displays" even when X11 works (XWayland/desktop).
if [ -z "${SDL_VIDEODRIVER:-}" ] && [ -n "${DISPLAY:-}" ]; then
  export SDL_VIDEODRIVER=x11
fi
exec /app/bin/darkplaces-sdl -basedir "$BASE" -game shipgame +map ocean1 "$@"
