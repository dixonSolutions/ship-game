import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
// server/src -> repo root
const repoRoot = resolve(here, '../..');
const rootEnv = resolve(repoRoot, '.env');
const localEnv = resolve(process.cwd(), '.env');

// Load root .env if present — values never leave the server process.
// override: true so project .env wins over a polluted shell (e.g. unrelated PORT).
if (existsSync(rootEnv)) {
  loadEnv({ path: rootEnv, override: true });
}
if (existsSync(localEnv) && localEnv !== rootEnv) {
  loadEnv({ path: localEnv, override: false });
}

const EnvSchema = z
  .object({
  /** Preferred API listen port. */
  SERVER_PORT: z.coerce.number().int().positive().optional(),
  /** Legacy alias for SERVER_PORT. */
  PORT: z.coerce.number().int().positive().optional(),
  CLIENT_PORT: z.coerce.number().int().positive().default(4200),
  CORS_ORIGIN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AWS_REGION: z.string().default('us-east-1'),
  BEDROCK_MODEL_ID: z.string().default('anthropic.claude-3-haiku-20240307-v1:0'),
  BEDROCK_MAX_TOKENS: z.coerce.number().int().positive().default(256),
  BEDROCK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  POLLY_VOICE_ID: z.string().default('Matthew'),
  POLLY_ENGINE: z.enum(['standard', 'neural']).default('neural'),
  POLLY_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
  /** When true, AWS calls are stubbed (useful for local UI without credentials). */
  MOCK_AWS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  /** Prefer ElevenLabs when key is present. */
  AUDIO_PROVIDER: z.enum(['elevenlabs', 'polly', 'mock']).default('elevenlabs'),
  ELEVENLABS_API_KEY: z.string().optional().default(''),
  ELEVENLABS_TTS_MODEL: z.string().default('eleven_flash_v2_5'),
  ELEVENLABS_SFX_MODEL: z.string().default('eleven_text_to_sound_v2'),
  ELEVENLABS_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(40),
})
  .transform((raw) => {
    const PORT = raw.SERVER_PORT ?? raw.PORT ?? 8787;
    const CLIENT_PORT = raw.CLIENT_PORT;
    const CORS_ORIGIN = raw.CORS_ORIGIN ?? `http://localhost:${CLIENT_PORT}`;
    return {
      ...raw,
      PORT,
      SERVER_PORT: PORT,
      CLIENT_PORT,
      CORS_ORIGIN,
    };
  });

export type ServerConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return EnvSchema.parse(env);
}
