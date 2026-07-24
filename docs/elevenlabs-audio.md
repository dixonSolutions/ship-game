# ElevenLabs audio integration

## What we use

| Capability | Endpoint | Game use |
| --- | --- | --- |
| Text to Speech (Flash) | `POST /v1/text-to-speech/{voice_id}` | Distinct crew dialogue voices |
| Sound Effects | `POST /v1/sound-generation` | Wind, waves, creaks, rain, thunder, cannon, splash, sail, anchor, horizon bed |

ElevenLabs also offers music, voice design, agents, and STT — we can expand later. The vertical slice focuses on **TTS + SFX** for a sound-driven sea.

## Security

1. `ELEVENLABS_API_KEY` lives only in server `.env` (gitignored).
2. Browser never receives the key.
3. SFX requests use an **allowlisted `soundId`**; prompts are hard-coded server-side.
4. Rate limits on `/api/tts` and `/api/sfx`.
5. Generated MP3s cache under `.audio-cache/elevenlabs/` (gitignored).

If a key is ever pasted into chat or committed, **rotate it** in the ElevenLabs dashboard.

## Client behavior

On **Cast off**, `AudioService.unlock()`:

1. Prefetches ambient beds + cannon from `/api/sfx`
2. Plays layered Howler loops (wind / waves / creak / music)
3. Reactive one-shots: thunder on lightning, splash in chop, sail flap on trim, anchor drop
4. Crew lines use `/api/tts` with role voice keys (`captain`, `gunner`, …)

If ElevenLabs is unavailable, procedural WAV placeholders keep the game playable.

## Configure

```bash
# .env
ELEVENLABS_API_KEY=sk_...
AUDIO_PROVIDER=elevenlabs
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
ELEVENLABS_SFX_MODEL=eleven_text_to_sound_v2
```

## Run

```bash
npm start
```

First cast-off may take several seconds while ambients generate; later launches hit the disk cache.
