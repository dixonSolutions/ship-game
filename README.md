# Ship Game

Immersive sailing combat game.

**Primary native build:** [DarkPlaces](https://github.com/darkplacesengine/darkplaces) Quake engine + QuakeC (`darkplaces/shipgame/`).  
**Browser build:** Angular + Optimus UI + Three.js (`client/`) — **offline**; secrets only for `npm run assets:download`.

## Quick start (DarkPlaces / QuakeC)

```bash
./scripts/qc-build.sh          # compile QuakeC → progs.dat (needs fteqcc)
./scripts/dp-build-engine.sh   # optional: build DarkPlaces (needs SDL2)
./scripts/dp-run.sh ocean1     # run free ocean arena map
```

## Flatpak install

**Releases** (download assets): https://github.com/dixonSolutions/ship-game/releases/latest  

| Asset | What it is |
| --- | --- |
| `com.dixonsolutions.ShipGame.flatpak` | Offline installable bundle |
| `com.dixonsolutions.ShipGame.flatpakref` | One-shot install that uses the Pages OSTree remote |
| `shipgame.flatpakrepo` | Remote metadata (same as on Pages) |

**Bundle (from Releases):**

```bash
flatpak install --user ./com.dixonsolutions.ShipGame.flatpak
flatpak run com.dixonsolutions.ShipGame
```

**Remote (GitHub Pages — preferred for updates):**

```bash
flatpak remote-add --if-not-exists --user shipgame \
  https://dixonsolutions.github.io/ship-game/shipgame.flatpakrepo
flatpak install shipgame com.dixonsolutions.ShipGame
flatpak run com.dixonsolutions.ShipGame
```

Or install from the ref file (Releases or Pages):

```bash
flatpak install --user ./com.dixonsolutions.ShipGame.flatpakref
```

Pages remote home: https://dixonsolutions.github.io/ship-game/  
Details: [docs/darkplaces.md](docs/darkplaces.md).

## Quick start (browser, offline)

```bash
cp .env.example .env          # local secrets only; never commit
npm install
npm run assets:download       # optional: pull MP3s via ELEVENLABS_API_KEY
npm run dev                   # client only (CLIENT_PORT, default 4200)
```

- Client: `http://localhost:$CLIENT_PORT`
- No runtime server — see [docs/offline-assets.md](docs/offline-assets.md)
- Without downloaded audio, procedural WAV fallbacks still work

## Workspace

| Package | Role |
| --- | --- |
| `darkplaces/shipgame/` | QuakeC gamedir (sailing, weather, combat) + free `ocean1` map |
| `flatpak/` | `com.dixonsolutions.ShipGame` Flatpak + desktop/metainfo |
| `branding/icons/` | App icon (SVG + PNG) |
| `client/` | Offline Angular 21 + Three.js browser client |
| `server/` | Legacy Express helpers (not required for play) |
| `shared/` | Zod schemas & shared API contracts |
| `docs/` | Architecture, DarkPlaces, controls, security, testing |

## Scripts (from repo root)

| Script | Description |
| --- | --- |
| `npm run dev` | Angular client only (`CLIENT_PORT`) |
| `npm run assets:download` | Dev: download audio/voice using `.env` secrets |
| `npm run dev:client` | Same as `dev` |
| `npm run dev:server` | Legacy API (optional; not needed for play) |
| `npm run build` | Production client build |
| `npm run stop` / `restart` / `start:bg` | Client process control |
| `npm run typecheck` / `test` / `lint` | Shared + client checks |

### Typical loop

```bash
npm run assets:download   # once (or when refreshing audio)
npm run dev               # browser play
npm run build
```

## Security

Secrets stay in `.env` (gitignored) and are read only by the asset download script. The browser loads `/assets/audio` and `/assets/voice` — never API keys. See [docs/offline-assets.md](docs/offline-assets.md).

## Docs

| Doc | Contents |
| --- | --- |
| [docs/darkplaces.md](docs/darkplaces.md) | QuakeC build, DarkPlaces run, Flatpak Pages remote |
| [docs/setup.md](docs/setup.md) | Browser install, ports, `.env` |
| [docs/offline-assets.md](docs/offline-assets.md) | Download script + offline play |
| [docs/architecture.md](docs/architecture.md) | Modules and tech choices |
| [docs/controls.md](docs/controls.md) | Keyboard, mouse, touch, gamepad, settings |
| [docs/gameplay-systems.md](docs/gameplay-systems.md) | Wind, ocean, weather, collisions, combat, crew |
| [docs/screenshots/](docs/screenshots/) | Browser playtest captures |
