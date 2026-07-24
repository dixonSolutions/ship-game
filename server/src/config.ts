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
if (existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}
if (existsSync(localEnv) && localEnv !== rootEnv) {
  loadEnv({ path: localEnv, override: false });
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
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
});

export type ServerConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return EnvSchema.parse(env);
}
