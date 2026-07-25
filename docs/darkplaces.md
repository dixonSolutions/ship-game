# DarkPlaces / QuakeC build

Ship Game’s primary native slice runs on the [DarkPlaces](https://github.com/darkplacesengine/darkplaces) Quake engine with custom QuakeC under `darkplaces/shipgame/`.

The Angular + Node browser client remains in the repo as a **legacy** web build (`client/`, `server/`).

## Layout

| Path | Purpose |
| --- | --- |
| `darkplaces/shipgame/src/*.qc` | QuakeC sources (sailing, weather, combat, AI) |
| `darkplaces/shipgame/progs.dat` | Compiled progs (via `scripts/qc-build.sh`) |
| `darkplaces/shipgame/maps/ocean1.map` | Free CC0 map source |
| `darkplaces/shipgame/maps/ocean1.bsp` | Compiled free arena map |
| `darkplaces/shipgame/default.cfg` | Key binds |
| `branding/icons/` | App icon SVG + PNGs |
| `flatpak/` | Flatpak manifest, desktop, AppStream |
| `.github/workflows/main-ci.yml` | Main-branch QuakeC + Pages Flatpak remote |

## Compile QuakeC

```bash
# needs fteqcc (Debian/Ubuntu: apt install fteqcc)
./scripts/qc-build.sh
```

## Run (local engine)

```bash
# optional: build engine (needs SDL2 + toolchain)
./scripts/dp-build-engine.sh

export DARKPLACES_BIN="$PWD/.local/darkplaces/darkplaces-sdl"
./scripts/dp-run.sh ocean1
```

Controls (also in `default.cfg`):

| Key | Action |
| --- | --- |
| W / S | Sail trim + / − |
| Q / E | Rudder |
| Space / F | Fire cannons |
| A | Toggle anchor |
| 7 / 8 / 9 | Tornado / tsunami / clear weather |

## Free assets policy

- Flatpak **does not** redistribute proprietary Quake `id1` pak files.
- `ocean1.bsp` is a free map compiled from CC0 `.map` source.
- Models/sounds are optional; gameplay hulls work without id1 MDLs.
- Optional: place free LibreQuake (or other free) assets under `darkplaces/shipgame/progs/` and `sound/`, then re-enable `setmodel` / `precache_sound` in QuakeC.

## Flatpak + GitHub Pages remote

CI workflow **Main CI — QuakeC + Flatpak Pages remote** (`.github/workflows/main-ci.yml`) on every push to `main`:

1. Compiles QuakeC with fteqcc  
2. Builds Flatpak `com.dixonsolutions.ShipGame` into a full OSTree archive  
3. Uploads **`com.dixonsolutions.ShipGame.flatpak`** to GitHub **Releases** (`flatpak-latest`)  
4. Publishes the full Flatpak remote (`.flatpakrepo` + `.flatpakref` + `repo/`) to GitHub Pages  

### Install from Releases (the .flatpak file)

https://github.com/dixonSolutions/ship-game/releases/latest

```bash
flatpak install --user ./com.dixonsolutions.ShipGame.flatpak
flatpak run com.dixonsolutions.ShipGame
```

### Install from Pages remote (updates via `flatpak update`)

https://dixonsolutions.github.io/ship-game/

```bash
flatpak remote-add --if-not-exists --user shipgame \
  https://dixonsolutions.github.io/ship-game/shipgame.flatpakrepo
flatpak install shipgame com.dixonsolutions.ShipGame
flatpak run com.dixonsolutions.ShipGame
```

App ID: `com.dixonsolutions.ShipGame`  
Icon: `branding/icons/ship-game.svg` (+ PNG sizes).
