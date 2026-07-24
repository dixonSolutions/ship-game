# Ship Game

Immersive browser-based sailing game: Angular + Optimus UI HUD, Three.js ocean, and a secure Node/TypeScript API for crew dialogue (Bedrock) plus ElevenLabs voices/SFX (server-side only).

## Quick start

```bash
cp .env.example .env   # fill secrets only on the server machine; never commit
npm install
npm run dev            # client :4200 + server :8787
```

- Client: http://localhost:4200  
- API health: http://localhost:8787/health  
- Default `MOCK_AWS=true` so the UI runs without AWS credentials.
- Set `ELEVENLABS_API_KEY` for generative sea audio (see [docs/elevenlabs-audio.md](docs/elevenlabs-audio.md)).

## Workspace

| Package | Role |
| --- | --- |
| `client/` | Angular 21 app (strict TS), Three.js scene, Optimus UI HUD |
| `server/` | Express API — Bedrock / Polly / ElevenLabs only here |
| `shared/` | Zod schemas & shared API contracts |
| `docs/` | Architecture, controls, security, testing, roadmap |

## Scripts (from repo root)

| Script | Description |
| --- | --- |
| `npm run dev` | Foreground client + server (same as `npm start`) |
| `npm run dev:client` | Angular only (`:4200`) |
| `npm run dev:server` | API only (`:8787`, watch mode) |
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

Start with [docs/setup.md](docs/setup.md) and [docs/architecture.md](docs/architecture.md).
