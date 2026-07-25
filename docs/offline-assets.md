# Offline assets (no runtime server)

Ship Game plays entirely from the Angular client. There is **no Express server required at play time**.

## Secrets

- Live only in root `.env` (gitignored).
- Used **only** by the download script on your machine.
- Never shipped to the browser, Flatpak, or GitHub Pages.

## Download (dev machine)

```bash
cp .env.example .env   # set ELEVENLABS_API_KEY locally
npm run assets:download
```

Writes:

| Path | Contents |
| --- | --- |
| `client/public/assets/audio/*.mp3` | SFX / ambience bank |
| `client/public/assets/voice/*.mp3` | Pre-rendered crew lines |
| `client/public/assets/dialogue/pack.json` | Text + cue map (committed) |

Re-run with `FORCE_ASSETS=1 npm run assets:download` to refresh.

## Play

```bash
npm run dev          # client only (CLIENT_PORT from .env)
```

If audio files are missing, the client uses procedural WAV fallbacks. Dialogue text still works from `pack.json`.

## Optional legacy server

`server/` remains for historical Bedrock/ElevenLabs HTTP experiments. It is **not** started by `npm run dev`. Prefer `assets:download` instead.
