#!/bin/sh
# Flatpak entrypoint — DarkPlaces + Ship Game QuakeC
# basedir MUST contain:
#   $BASE/id1/pak0.pak   (LibreQuake free data)
#   $BASE/shipgame/      (this mod)
# Without id1 paks, DarkPlaces shows "The required files were not found"
# and suggests adding -basedir — that hint is misleading if basedir is set
# but empty of Quake-compatible data.
BASE="${SHIP_GAME_BASEDIR:-/app/share/ship-game/darkplaces}"
if [ ! -f "$BASE/id1/pak0.pak" ]; then
  echo "ship-game: missing $BASE/id1/pak0.pak (LibreQuake). Reinstall the Flatpak." >&2
  exit 1
fi
# Prefer X11 when available. SDL often tries Wayland first and fails with
# "video driver did not add any displays" even when X11 works (XWayland/desktop).
if [ -z "${SDL_VIDEODRIVER:-}" ] && [ -n "${DISPLAY:-}" ]; then
  export SDL_VIDEODRIVER=x11
fi
exec /app/bin/darkplaces-sdl -basedir "$BASE" -game shipgame +map ocean1 "$@"
