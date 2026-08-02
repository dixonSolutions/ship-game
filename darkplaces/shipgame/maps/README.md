# Ship Game maps

| File | Role |
| --- | --- |
| `ocean1.map` / `ocean1.bsp` | Sealed ocean arena (water, sky, rim walls, spawn deck). Textures from LibreQuake via `shipgame.wad`. |
| `shipgame.wad` | Miptex WAD extracted from LibreQuake maps for compiling `ocean1`. |
| `start.bsp` (+ `.lit`) | Optional LibreQuake hub extract for playtests (`scripts/dp-extract-lq-maps.sh`). Gitignored. |

## Rebuild ocean1

```bash
# needs ericw-tools (qbsp, light) — https://github.com/ericwa/ericw-tools/releases
./scripts/map-build-ocean1.sh
```

## Launch

```bash
./scripts/qc-build.sh
./scripts/dp-fetch-librequake.sh
flatpak run --filesystem="$PWD/darkplaces" --command=/app/bin/darkplaces-sdl \
  com.dixonsolutions.ShipGame -basedir "$PWD/darkplaces" -game shipgame
```

Default `quake.rc` loads `ocean1`.
