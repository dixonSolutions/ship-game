#!/bin/sh
# Flatpak entrypoint — DarkPlaces + shipgame gamedir (free assets only)
# basedir layout: $BASE/id1 (stub) + $BASE/shipgame (mod)
BASE="${SHIP_GAME_BASEDIR:-/app/share/ship-game/darkplaces}"
# Do not force SDL_VIDEODRIVER. Comma lists / wayland-first break on hosts
# where Wayland has no usable display; SDL picks X11 from --socket=x11.
exec /app/bin/darkplaces-sdl -basedir "$BASE" -game shipgame +map ocean1 "$@"
