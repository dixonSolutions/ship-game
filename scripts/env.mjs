/**
 * Shared root .env loader for startup scripts.
 * Never logs secret values.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(__dirname, '..');

/** Parse KEY=VALUE lines from a dotenv file (no expansion). */
export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Merge process.env over root .env for ports / public URLs.
 * SERVER_PORT wins over legacy PORT when both are set in .env;
 * process.env still wins for explicit shell overrides.
 */
export function loadProjectEnv() {
  const fileEnv = parseEnvFile(join(repoRoot, '.env'));
  const merged = { ...fileEnv, ...process.env };

  const clientPort = positiveInt(merged.CLIENT_PORT, 4200);
  const serverPort = positiveInt(merged.SERVER_PORT ?? merged.PORT, 8787);
  const apiBaseUrl = (merged.API_BASE_URL || `http://localhost:${serverPort}`).replace(/\/$/, '');
  const corsOrigin = merged.CORS_ORIGIN || `http://localhost:${clientPort}`;

  return {
    ...merged,
    CLIENT_PORT: String(clientPort),
    SERVER_PORT: String(serverPort),
    PORT: String(serverPort),
    API_BASE_URL: apiBaseUrl,
    CORS_ORIGIN: corsOrigin,
  };
}

function positiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
