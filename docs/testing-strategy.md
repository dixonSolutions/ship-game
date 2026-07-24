# Testing strategy

## Layers

1. **Shared schemas** — Vitest ensures dialogue/TTS Zod contracts accept good data and reject oversized/invalid payloads.
2. **Server API security** — Supertest checks validation failures, happy-path mock dialogue, and that error bodies never contain `AWS_` / secret-like strings.
3. **Simulation** — Vitest on ship physics (wind thrust, anchor braking). Expand to combat/AI.
4. **Client** — Angular unit-test builder (Vitest) for components/services as they grow.
5. **Manual / browser** — Play the vertical slice; watch console for WebGL/audio errors (Playwright later).

## Commands

```bash
npm test
npm run typecheck
npm run build
```

## Coverage priorities

- Schema validation & rate-limit wiring
- Prompt builder constraints
- Physics invariants (non-NaN, clamp ranges)
- No credential leakage in HTTP responses
