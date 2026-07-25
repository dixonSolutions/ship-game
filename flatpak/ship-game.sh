#!/bin/sh
# Flatpak entrypoint — DarkPlaces + shipgame gamedir (free assets only)
BASE="${SHIP_GAME_BASEDIR:-/app/share/ship-game/darkplaces}"
exec /app/bin/darkplaces-sdl -basedir "$BASE" -game shipgame +map ocean1 "$@"
