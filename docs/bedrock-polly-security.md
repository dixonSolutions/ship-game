# Bedrock / Polly integration & security

## Hard rules

1. **Never** send AWS credentials to the browser, logs, commits, or client bundles.
2. Bedrock and Polly run **only** in `server/`.
3. `.env` is gitignored; ship `.env.example` with empty secrets.
4. Default `MOCK_AWS=true` for local development without credentials.

## Request path

1. Browser → `POST /api/dialogue` or `POST /api/tts`
2. Helmet + CORS origin allowlist
3. Per-route rate limits (`BEDROCK_RATE_LIMIT_PER_MINUTE`, `POLLY_RATE_LIMIT_PER_MINUTE`)
4. Zod schema validation (`@ship-game/shared`)
5. Constrained prompt builder (game context only; no free-form system takeover)
6. AWS SDK v3 call (or mock)
7. Safe error handler strips stacks and secret-like fields

## Constrained dialogue

Prompts include only validated fields: crew role/name, ship, weather, combat, wind, hull, optional recent event, and a short player line (≤280 chars). Model instructions forbid credentials, URLs, and breaking character.

## TTS

Text capped at 500 characters. Voice IDs are an allowlist enum. Audio returned as `audio/mpeg` bytes — no credential headers to the client.

## Threat notes

| Risk | Mitigation |
| --- | --- |
| Credential exfiltration | Server-only env; never echo env in errors |
| Prompt injection | Schema limits + fixed system rules + short outputs |
| Cost abuse | Rate limits + max tokens |
| CORS abuse | Explicit `CORS_ORIGIN` |
| Oversized payloads | `express.json({ limit: '16kb' })` |
