# Ship Game

Immersive sailing combat game.

**Primary native build:** [DarkPlaces](https://github.com/darkplacesengine/darkplaces) Quake engine + QuakeC (`darkplaces/shipgame/`).  
**Legacy web build:** Angular + Optimus UI + Three.js client and Node API (`client/`, `server/`) — still supported for browser play.

## Quick start (DarkPlaces / QuakeC)

```bash
./scripts/qc-build.sh          # compile QuakeC → progs.dat (needs fteqcc)
./scripts/dp-build-engine.sh   # optional: build DarkPlaces (needs SDL2)
./scripts/dp-run.sh ocean1     # run free ocean arena map
```

See [docs/darkplaces.md](docs/darkplaces.md) for Flatpak / GitHub Pages remote install.

## Quick start (legacy browser)

```bash
cp .env.example .env   # fill secrets only on the server machine; never commit
npm install
npm run dev            # ports from root .env (defaults client :4200, server :8787)
```

- Ports: set `CLIENT_PORT` / `SERVER_PORT` in `.env` (see `.env.example`)
- Client: `http://localhost:$CLIENT_PORT`  
- API health: `http://localhost:$SERVER_PORT/health`  
- Default `MOCK_AWS=true` so the UI runs without AWS credentials.
- Set `ELEVENLABS_API_KEY` for generative sea audio (see [docs/elevenlabs-audio.md](docs/elevenlabs-audio.md)).

## Workspace

| Package | Role |
| --- | --- |
| `darkplaces/shipgame/` | QuakeC gamedir (sailing, weather, combat) + free `ocean1` map |
| `flatpak/` | `com.dixonsolutions.ShipGame` Flatpak + desktop/metainfo |
| `branding/icons/` | App icon (SVG + PNG) |
| `client/` | Legacy Angular 21 + Three.js browser client |
| `server/` | Legacy Express API — Bedrock / Polly / ElevenLabs |
| `shared/` | Zod schemas & shared API contracts |
| `docs/` | Architecture, DarkPlaces, controls, security, testing |

## Scripts (from repo root)

| Script | Description |
| --- | --- |
| `npm run dev` | Foreground client + server (same as `npm start`) |
| `npm run dev:client` | Angular only (`CLIENT_PORT`) |
| `npm run dev:server` | API only (`SERVER_PORT`, watch mode) |
| `npm run build` | Production build (shared → server → client) |
| `npm run build:client` / `build:server` / `build:shared` | Partial builds |
| `npm run stop` | Stop client + server |
| `npm run stop:client` / `stop:server` | Stop one side |
| `npm run restart` | Stop then start both in background |
| `npm run restart:client` / `restart:server` | Restart one side |
| `npm run start:bg` | Start both detached (PID files in `.local/pids/`) |
| `npm run typecheck` | Shared + server + client |
| `npm test` | Unit tests |
| `npm run lint` | Lint / compile checks |

### Typical loop

```bash
npm run dev          # develop (Ctrl+C to stop the foreground pair)
npm run build        # production build
npm run stop         # kill stray client/server processes
npm run restart      # background restart of both
```

## Security

Secrets stay in `.env` (gitignored). The browser calls `/api/dialogue`, `/api/tts`, and `/api/sfx` only — never AWS or ElevenLabs keys. See [docs/bedrock-polly-security.md](docs/bedrock-polly-security.md) and [docs/elevenlabs-audio.md](docs/elevenlabs-audio.md).

## Docs

| Doc | Contents |
| --- | --- |
| [docs/darkplaces.md](docs/darkplaces.md) | QuakeC build, DarkPlaces run, Flatpak Pages remote |
| [docs/setup.md](docs/setup.md) | Legacy browser install, `.env` ports/secrets |
| [docs/architecture.md](docs/architecture.md) | Client/server modules and tech choices |
| [docs/controls.md](docs/controls.md) | Keyboard, mouse, touch, gamepad, settings |
| [docs/gameplay-systems.md](docs/gameplay-systems.md) | Wind, ocean, weather, collisions, combat, crew |
| [docs/elevenlabs-audio.md](docs/elevenlabs-audio.md) | Server-side TTS/SFX |
| [docs/bedrock-polly-security.md](docs/bedrock-polly-security.md) | Credential boundary |
| [docs/screenshots/](docs/screenshots/) | Browser playtest captures |
