# Setup

## Requirements

- Node.js 20+
- npm 10+
- Modern desktop or mobile browser with WebGL

## Install

```bash
cd "/home/borys/Projects/SideProjects/Ship game"
cp .env.example .env
npm install
```

## Environment

Copy `.env.example` → `.env`. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `AWS_REGION` | AWS region for Bedrock/Polly |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Server-only credentials |
| `BEDROCK_MODEL_ID` | Converse model id |
| `MOCK_AWS` | `true` (default) stubs AWS for local play |
| `ELEVENLABS_API_KEY` | Server-only ElevenLabs key for TTS/SFX |
| `AUDIO_PROVIDER` | `elevenlabs` (default), `polly`, or `mock` |
| `CLIENT_PORT` | Angular dev server port (default `4200`) |
| `ELEVENLABS_API_KEY` | **Dev download only** — used by `npm run assets:download` |
| `SERVER_PORT` | Legacy optional API port (not required for play) |

### Ports (not hard-coded)

Both client and server startup ports come from the **root** `.env`:

| Variable | Used by |
| --- | --- |
| `CLIENT_PORT` | `scripts/run-client.mjs` → `ng serve --port …` |
| `SERVER_PORT` (or legacy `PORT`) | Express listen via `server/src/config.ts` |
| `API_BASE_URL` | Written into `client/src/environments/environment.generated.ts` on client start/build |
| `CORS_ORIGIN` | Defaults to `http://localhost:$CLIENT_PORT` when unset |

```bash
# example: run on alternate ports
CLIENT_PORT=4300
SERVER_PORT=9090
# optional explicit overrides:
# API_BASE_URL=http://localhost:9090
# CORS_ORIGIN=http://localhost:4300
```

`npm run start -w client` runs `scripts/sync-client-env.mjs` then serves on `CLIENT_PORT`.  
`npm run start:bg` / `restart` / `stop` also read the same root `.env` via `scripts/dev-ctl.mjs`.

## Run / stop / restart / build

From the **repo root**:

```bash
npm run assets:download  # optional: fill public/assets from .env secrets
npm run dev              # Angular client only
npm run build            # production client build
npm run stop             # stop client
npm run restart          # background restart client
```

Open `http://localhost:$CLIENT_PORT` (default `4200`) and click **Cast off**.  
See [offline-assets.md](offline-assets.md).

## Optimus UI

Installed from npm:

```bash
npm install @openng/optimus-ui @openng/optimus-ui-themes
```

Configured via `provideOptimus({ theme: { preset: Aura } })` in `client/src/app/app.config.ts`.  
Source: https://github.com/openng-org/optimus-ui · Docs: https://optimus.openng.org/installation

## Verify

```bash
npm run typecheck
npm test
npm run build
```
