# Asset & library attribution

## Libraries

| Library | License | Use |
| --- | --- | --- |
| Angular | MIT | Client framework |
| Optimus UI (`@openng/optimus-ui`) | MIT (OpenNG fork of final MIT PrimeNG) | HUD / settings controls |
| Three.js | MIT | 3D rendering |
| Howler.js | MIT | Ambient audio + SFX + voice playback |
| Express, Zod, Helmet, express-rate-limit | MIT | Secure API |
| ElevenLabs API | Commercial API | Server-side TTS + generative SFX (key never in browser) |
| AWS SDK for JavaScript v3 | Apache-2.0 | Bedrock + Polly fallback (server only) |
| Vitest | MIT | Unit tests |

## Placeholders (procedural / generated)

- **Ships, sails, rudders, cannons, crew figures** — procedural Three.js geometry (no third-party meshes).
- **Ocean** — custom vertex/fragment shaders (Gerstner-like displacement + foam).
- **Sky / atmosphere** — procedural gradient shader with lightning flash uniform.
- **Rain, spray, wake, shot smoke/impact/splash, cannonballs** — Points / mesh particles generated at runtime.
- **Ambient & SFX** — ElevenLabs Sound Generation via server allowlisted `soundId`s (cached under `.audio-cache/`); procedural WAV fallback if unavailable.
- **Crew voices** — ElevenLabs Flash TTS (server-side) mapped per crew role; Polly/mock as fallback.

## Original SVG textures (CC0 / public domain by author)

Original designs authored for this project (no third-party downloads):

| File | Description |
| --- | --- |
| `client/public/assets/wood-hull.svg` | Plank + grain hull wood pattern |
| `client/public/assets/sail-canvas.svg` | Canvas weave sail texture |
| `client/public/assets/water-foam.svg` | Foam accent for wake / splash |

Released into the public domain (CC0) for use in this game.

No commercial textures are bundled. Generated ElevenLabs audio is produced at runtime and not redistributed in the repo.

## Upstream links

- Optimus UI: https://github.com/openng-org/optimus-ui
- Optimus docs: https://optimus.openng.org/installation
- Three.js: https://threejs.org/
- Howler: https://howlerjs.com/
- ElevenLabs: https://elevenlabs.io/docs
