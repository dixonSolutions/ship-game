#!/usr/bin/env node
/**
 * Dev-only asset downloader.
 * Reads secrets from root .env and writes playable files under client/public/assets/.
 * The browser never sees API keys and does not call a runtime server.
 *
 * Usage: npm run assets:download
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv, repoRoot } from './env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, 'asset-catalog.json'), 'utf8'));
const env = loadProjectEnv();

const outAudio = join(repoRoot, 'client/public/assets/audio');
const outVoice = join(repoRoot, 'client/public/assets/voice');
const cacheRoot = join(repoRoot, '.audio-cache/elevenlabs');

// Prefer premade voices known to work on free API tiers (Adam).
const DEFAULT_VOICE = 'pNInz6obpgDQGcFmaJgB';
const VOICE_MAP = {
  Matthew: DEFAULT_VOICE,
  Stephen: DEFAULT_VOICE,
  Ruth: DEFAULT_VOICE,
  Joanna: DEFAULT_VOICE,
  Brian: DEFAULT_VOICE,
  captain: DEFAULT_VOICE,
  helmsman: DEFAULT_VOICE,
  gunner: DEFAULT_VOICE,
  lookout: DEFAULT_VOICE,
  boatswain: DEFAULT_VOICE,
};

/** Short canned lines pre-rendered for offline crew radio. */
const VOICE_LINES = [
  { id: 'captain_clear', voice: 'captain', text: 'Steady as she goes. Keep the wind on our beam.' },
  { id: 'captain_storm', voice: 'captain', text: 'Storm rising. Trim for the blow and mind the heel.' },
  { id: 'helmsman_steer', voice: 'helmsman', text: 'Helm answering. Holding course through the chop.' },
  { id: 'gunner_ready', voice: 'gunner', text: 'Guns ready. Waiting on your mark, Captain.' },
  { id: 'lookout_sail', voice: 'lookout', text: 'Sail on the horizon. Hostile colors, maybe.' },
  { id: 'boatswain_damage', voice: 'boatswain', text: 'Hull takes a beating. We need care below.' },
  { id: 'generic_sharp', voice: 'boatswain', text: 'Stay sharp.' },
];

mkdirSync(outAudio, { recursive: true });
mkdirSync(outVoice, { recursive: true });
mkdirSync(cacheRoot, { recursive: true });

const apiKey = (env.ELEVENLABS_API_KEY || '').trim();
const sfxModel = env.ELEVENLABS_SFX_MODEL || 'eleven_text_to_sound_v2';
const ttsModel = env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5';

if (!apiKey) {
  console.error('[assets:download] ELEVENLABS_API_KEY missing in root .env — cannot download.');
  console.error('[assets:download] Game still runs with procedural fallback audio.');
  process.exit(1);
}

function cachePath(kind, key) {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
  const dir = join(cacheRoot, kind);
  mkdirSync(dir, { recursive: true });
  return join(dir, `${hash}.mp3`);
}

async function downloadSfx(soundId, entry) {
  const dest = join(outAudio, `${soundId}.mp3`);
  if (existsSync(dest) && !process.env.FORCE_ASSETS) {
    console.log(`[skip] ${soundId} (exists)`);
    return;
  }
  const cacheKey = `${sfxModel}|${soundId}|${entry.text}|${entry.durationSeconds}|${entry.loop}`;
  const cached = cachePath('sfx', cacheKey);
  let buf;
  if (existsSync(cached)) {
    buf = readFileSync(cached);
    console.log(`[cache] ${soundId}`);
  } else {
    console.log(`[fetch] ${soundId}…`);
    const res = await fetch(
      'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: entry.text,
          duration_seconds: entry.durationSeconds,
          loop: entry.loop,
          prompt_influence: 0.35,
          model_id: sfxModel,
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`SFX ${soundId} failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(cached, buf);
  }
  writeFileSync(dest, buf);
}

async function downloadVoice(line) {
  const dest = join(outVoice, `${line.id}.mp3`);
  if (existsSync(dest) && !process.env.FORCE_ASSETS) {
    console.log(`[skip] voice ${line.id}`);
    return;
  }
  const voiceId = VOICE_MAP[line.voice] || VOICE_MAP.Matthew;
  const cacheKey = `${ttsModel}|${voiceId}|${line.text}`;
  const cached = cachePath('tts', cacheKey);
  let buf;
  if (existsSync(cached)) {
    buf = readFileSync(cached);
    console.log(`[cache] voice ${line.id}`);
  } else {
    console.log(`[fetch] voice ${line.id}…`);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: line.text,
          model_id: ttsModel,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`TTS ${line.id} failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(cached, buf);
  }
  writeFileSync(dest, buf);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  provider: 'elevenlabs',
  sounds: Object.keys(catalog.sounds),
  voices: VOICE_LINES.map((l) => l.id),
};

let failed = 0;
try {
  for (const [id, entry] of Object.entries(catalog.sounds)) {
    try {
      await downloadSfx(id, entry);
    } catch (err) {
      failed += 1;
      console.error(`[warn] SFX ${id}:`, err.message || err);
    }
  }
  for (const line of VOICE_LINES) {
    try {
      await downloadVoice(line);
    } catch (err) {
      failed += 1;
      console.error(`[warn] voice ${line.id}:`, err.message || err);
    }
  }
  writeFileSync(join(outAudio, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const dialogueDir = join(repoRoot, 'client/public/assets/dialogue');
  mkdirSync(dialogueDir, { recursive: true });
  writeFileSync(
    join(dialogueDir, 'pack.json'),
    JSON.stringify(
      {
        lines: VOICE_LINES,
        byCue: {
          clear: 'captain_clear',
          storm: 'captain_storm',
          weather: 'captain_storm',
          steer: 'helmsman_steer',
          combat: 'gunner_ready',
          sail: 'lookout_sail',
          damage: 'boatswain_damage',
          default: 'generic_sharp',
        },
      },
      null,
      2,
    ),
  );
  console.log('[assets:download] done — play with npm run dev (client only).');
  console.log(`[assets:download] audio → ${outAudio}`);
  console.log(`[assets:download] voice → ${outVoice}`);
  if (failed) {
    console.warn(
      `[assets:download] ${failed} clip(s) skipped (plan limits / network). Text dialogue + procedural audio still work.`,
    );
  }
} catch (err) {
  console.error('[assets:download] failed:', err.message || err);
  process.exit(1);
}
