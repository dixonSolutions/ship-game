# Asset & library attribution

## Libraries

| Library | License | Use |
| --- | --- | --- |
| Angular | MIT | Client framework |
| Optimus UI (`@openng/optimus-ui`) | MIT (OpenNG fork of final MIT PrimeNG) | HUD / settings controls |
| Three.js | MIT | 3D rendering |
| Howler.js | MIT | Ambient audio + SFX + voice playback |
| Express, Zod, Helmet, express-rate-limit | MIT | Secure API |
| AWS SDK for JavaScript v3 | Apache-2.0 | Bedrock + Polly (server only) |
| Vitest | MIT | Unit tests |

## Placeholders (procedural / generated)

- **Ships, sails, rudders, cannons, crew figures** — procedural Three.js geometry (no third-party meshes).
- **Ocean** — custom vertex/fragment shaders (Gerstner-like displacement + foam).
- **Sky / atmosphere** — procedural gradient shader with lightning flash uniform.
- **Rain, spray, wake, shot smoke/impact** — Points / mesh particles generated at runtime.
- **Ambient & SFX** — generated WAV data-URIs (brown noise / tones) via Howler until credited packs are added.
- **Crew voices** — Amazon Polly (server-side) when AWS configured; mock audio bytes when `MOCK_AWS=true`.

No commercial textures or paid audio are bundled.

## Upstream links

- Optimus UI: https://github.com/openng-org/optimus-ui
- Optimus docs: https://optimus.openng.org/installation
- Three.js: https://threejs.org/
- Howler: https://howlerjs.com/
