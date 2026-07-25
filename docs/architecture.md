# Architecture

## Overview

```
Browser (Angular)                    Server (Node/TS)
┌─────────────────────────┐         ┌──────────────────────────┐
│ Optimus UI HUD / overlays│         │ Express + helmet + CORS  │
│ Input / Audio (Howler)   │  HTTP   │ Zod validation           │
│ GameEngine + systems     │ ──────► │ Rate limits              │
│ SceneHost (Three.js)     │         │ Constrained prompts      │
└─────────────────────────┘         │ Bedrock + Polly (AWS SDK)│
                                    └──────────────────────────┘
                                              ▲
                                              │ env credentials only
```

## Tech decisions

| Layer | Choice | Why |
| --- | --- | --- |
| UI framework | Angular 21, strict TypeScript, standalone components | Strong structure for a long-lived game client |
| HUD kit | **Optimus UI** (`@openng/optimus-ui` 1.0.0-rc.1) | OpenNG MIT fork of PrimeNG; installable from npm |
| 3D | **Three.js** | Lightweight enough for a vertical slice; procedural ocean/ships |
| Physics | Custom lightweight systems | Enough for sailing feel without native WASM physics yet |
| Audio | **Howler.js** | Simple layered ambient beds; upgrade path to spatial buses |
| API | Express + Zod + express-rate-limit | Small surface, schema-first, safe errors |
| AI / TTS | AWS Bedrock Runtime + Polly via server only | Credentials never reach the browser |
| Tests | Vitest (shared/server/systems) + Angular unit-test builder | Fast simulation & API security checks |

## Client modules

- `client/src/app/game/` — `GameEngineService`, `SceneHost`, `InputService`, `AudioService`, dialogue HTTP client
- `client/src/app/systems/` — wind, weather, ocean, ship physics, collision, combat, damage FX, crew, AI
- `client/src/app/ui/` — HUD, settings, pause/onboarding/victory overlays
- `client/public/assets/` — original SVG hull / sail / foam textures
- `client/src/environments/environment.generated.ts` — API base URL synced from root `.env` ports

## Server modules

- `server/src/routes/` — `/api/dialogue`, `/api/tts`, `/api/sfx`
- `server/src/services/` — Bedrock converse, Polly / ElevenLabs synthesize, constrained prompts
- `server/src/middleware/` — Zod body validation, safe error mapping
- `server/src/config.ts` — loads root `.env`; `SERVER_PORT` / `CLIENT_PORT` / CORS defaults

## Startup ports

Root scripts (`scripts/env.mjs`, `run-client.mjs`, `dev-ctl.mjs`) and the server config share `CLIENT_PORT` + `SERVER_PORT` from `.env`. Defaults remain `4200` / `8787`. See [setup.md](setup.md).

## Shared contracts

`shared/` owns Zod schemas for dialogue and TTS. The server validates every request against these schemas before any AWS call.
