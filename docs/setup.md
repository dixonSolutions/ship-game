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
| `PORT` | API port (default `8787`) |
| `CORS_ORIGIN` | Allowed browser origin (default `http://localhost:4200`) |

## Run / stop / restart / build

From the **repo root**:

```bash
npm run dev              # foreground client + server
npm run dev:client       # Angular only
npm run dev:server       # API only
npm run build            # production build
npm run stop             # stop client + server
npm run restart          # background restart both
npm run start:bg         # start both detached
```

Open http://localhost:4200 and click **Cast off**.

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
curl -s http://localhost:8787/health
```
