import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SoundId, TtsRequest } from '@ship-game/shared';
import type { ServerConfig } from '../config.js';

const here = dirname(fileURLToPath(import.meta.url));
const cacheRoot = join(here, '../../../.audio-cache/elevenlabs');

/** Premade ElevenLabs voices mapped from logical crew IDs. */
const VOICE_MAP: Record<string, string> = {
  Matthew: 'pNInz6obpgDQGcFmaJgB', // Adam — steady captain energy
  Stephen: 'VR6AewLTigWG4xSOukaG', // Arnold — deeper helmsman
  Ruth: 'EXAVITQu4vr4xnSDxMaL', // Bella — sharp gunner
  Joanna: '21m00Tcm4TlvDq8ikWAM', // Rachel — clear lookout
  Brian: 'TxGEqnHWrfWFTfGW9XjX', // Josh — rough boatswain
  Amy: 'MF3mGyEYCl7XYWbV9V6O', // Elli
  captain: 'pNInz6obpgDQGcFmaJgB',
  helmsman: 'VR6AewLTigWG4xSOukaG',
  gunner: 'EXAVITQu4vr4xnSDxMaL',
  lookout: '21m00Tcm4TlvDq8ikWAM',
  boatswain: 'TxGEqnHWrfWFTfGW9XjX',
};

/** Constrained cinematic prompts — never accept free-form SFX from the browser. */
export const SOUND_CATALOG: Record<
  SoundId,
  { text: string; durationSeconds: number; loop: boolean }
> = {
  ambient_wind: {
    text: 'Continuous ocean wind across open sea, airy whoosh, no melody, seamless loopable ambience',
    durationSeconds: 8,
    loop: true,
  },
  ambient_waves: {
    text: 'Continuous deep ocean waves lapping and rolling against a wooden hull, wet splash texture, seamless loop',
    durationSeconds: 8,
    loop: true,
  },
  ambient_creak: {
    text: 'Old wooden sailing ship creaking ropes and timber under strain, sparse soft groans, seamless loop',
    durationSeconds: 6,
    loop: true,
  },
  ambient_rain: {
    text: 'Heavy rain on wooden deck and sail cloth at sea, dense droplets, seamless loop, no thunder',
    durationSeconds: 7,
    loop: true,
  },
  sfx_thunder: {
    text: 'Distant then close ocean storm thunder crack with rumble over open water',
    durationSeconds: 3.5,
    loop: false,
  },
  sfx_cannon: {
    text: 'Naval cannon firing from wooden warship, deep boom, brief powder smoke crackle, short',
    durationSeconds: 2.2,
    loop: false,
  },
  sfx_impact: {
    text: 'Cannonball smashing into wooden hull at sea, splintering timber impact, short',
    durationSeconds: 1.8,
    loop: false,
  },
  sfx_splash: {
    text: 'Ship bow cutting choppy waves with spray splash, wet ocean spray burst',
    durationSeconds: 1.6,
    loop: false,
  },
  sfx_sail_flap: {
    text: 'Large canvas sail snapping and flapping hard in strong wind, short burst',
    durationSeconds: 1.4,
    loop: false,
  },
  sfx_anchor: {
    text: 'Heavy ship anchor chain rattling then splash into ocean water',
    durationSeconds: 2.5,
    loop: false,
  },
  music_horizon: {
    text: 'Sparse atmospheric nautical underscore, low drones and soft strings, no vocals, melancholic sea horizon, seamless loopable',
    durationSeconds: 12,
    loop: true,
  },
};

export interface AudioResult {
  audio: Buffer;
  contentType: 'audio/mpeg';
  voiceId?: string;
  characters?: number;
  cached: boolean;
  provider: 'elevenlabs' | 'mock';
}

function cachePath(kind: string, key: string): string {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
  return join(cacheRoot, kind, `${hash}.mp3`);
}

async function readCache(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function writeCache(path: string, data: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

function requireKey(config: ServerConfig): string {
  const key = config.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error('CLIENT: ElevenLabs is not configured on the server.');
  }
  return key;
}

export function resolveElevenVoiceId(logical: string): string {
  return VOICE_MAP[logical] ?? VOICE_MAP['Matthew']!;
}

export async function synthesizeElevenSpeech(
  config: ServerConfig,
  request: TtsRequest,
): Promise<AudioResult> {
  const logical = request.voiceId ?? 'Matthew';
  const voiceId = resolveElevenVoiceId(logical);
  const cacheKey = `${config.ELEVENLABS_TTS_MODEL}|${voiceId}|${request.text}|${request.ratePercent ?? 100}`;
  const path = cachePath('tts', cacheKey);
  const cached = await readCache(path);
  if (cached) {
    return {
      audio: cached,
      contentType: 'audio/mpeg',
      voiceId: logical,
      characters: request.text.length,
      cached: true,
      provider: 'elevenlabs',
    };
  }

  const apiKey = requireKey(config);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: request.text,
      model_id: config.ELEVENLABS_TTS_MODEL,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `CLIENT: ElevenLabs TTS failed (${res.status}). ${detail.slice(0, 160)}`.trim(),
    );
  }

  const audio = Buffer.from(await res.arrayBuffer());
  await writeCache(path, audio);
  return {
    audio,
    contentType: 'audio/mpeg',
    voiceId: logical,
    characters: request.text.length,
    cached: false,
    provider: 'elevenlabs',
  };
}

export async function generateElevenSound(
  config: ServerConfig,
  soundId: SoundId,
): Promise<AudioResult> {
  const entry = SOUND_CATALOG[soundId];
  const cacheKey = `${config.ELEVENLABS_SFX_MODEL}|${soundId}|${entry.text}|${entry.durationSeconds}|${entry.loop}`;
  const path = cachePath('sfx', cacheKey);
  const cached = await readCache(path);
  if (cached) {
    return {
      audio: cached,
      contentType: 'audio/mpeg',
      cached: true,
      provider: 'elevenlabs',
    };
  }

  const apiKey = requireKey(config);
  const url = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';
  const res = await fetch(url, {
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
      model_id: config.ELEVENLABS_SFX_MODEL,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `CLIENT: ElevenLabs SFX failed (${res.status}). ${detail.slice(0, 160)}`.trim(),
    );
  }

  const audio = Buffer.from(await res.arrayBuffer());
  await writeCache(path, audio);
  return {
    audio,
    contentType: 'audio/mpeg',
    cached: false,
    provider: 'elevenlabs',
  };
}

export function elevenLabsConfigured(config: ServerConfig): boolean {
  return Boolean(config.ELEVENLABS_API_KEY?.trim()) && config.AUDIO_PROVIDER === 'elevenlabs';
}
