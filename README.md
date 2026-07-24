# Ship Game

Immersive browser-based sailing game: Angular + Optimus UI HUD, Three.js ocean, and a secure Node/TypeScript API for Amazon Bedrock dialogue and Polly voices.

## Quick start

```bash
cp .env.example .env   # fill AWS keys only on the server machine; never commit
npm install
npm start              # client :4200 + server :8787
```

- Client: http://localhost:4200  
- API health: http://localhost:8787/health  
- Default `MOCK_AWS=true` so the UI runs without credentials.

## Workspace

| Package | Role |
| --- | --- |
| `client/` | Angular 21 app (strict TS), Three.js scene, Optimus UI HUD |
| `server/` | Express API — Bedrock + Polly only here |
| `shared/` | Zod schemas & shared API contracts |
| `docs/` | Architecture, controls, security, testing, roadmap |

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Client + server |
| `npm run start:client` | Angular dev server |
| `npm run start:server` | API with watch |
| `npm run typecheck` | Shared + server + client |
| `npm test` | Vitest / Angular unit tests |
| `npm run build` | Production builds |

## Security

AWS credentials stay in `.env` (gitignored). The browser calls `/api/dialogue` and `/api/tts` only. See [docs/bedrock-polly-security.md](docs/bedrock-polly-security.md).

## Docs

Start with [docs/setup.md](docs/setup.md) and [docs/architecture.md](docs/architecture.md).
