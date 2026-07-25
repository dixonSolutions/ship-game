#!/usr/bin/env node
/**
 * Start Angular with CLIENT_PORT / API_BASE_URL from root .env.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { loadProjectEnv, repoRoot } from './env.mjs';
import { execSync } from 'node:child_process';

const env = loadProjectEnv();
execSync('node scripts/sync-client-env.mjs', { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, ...env } });

const ng = join(repoRoot, 'node_modules/.bin/ng');
const child = spawn(
  ng,
  ['serve', '--host', '0.0.0.0', '--port', env.CLIENT_PORT],
  {
    cwd: join(repoRoot, 'client'),
    env: { ...process.env, ...env },
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
