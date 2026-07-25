#!/usr/bin/env node
/**
 * Root process control for Ship Game.
 * Usage: node scripts/dev-ctl.mjs <start|stop|restart> [all|client|server]
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { loadProjectEnv, repoRoot } from './env.mjs';

const root = repoRoot;
const pidDir = join(root, '.local', 'pids');
const projectEnv = loadProjectEnv();

const TARGETS = ['all', 'client', 'server'];

function usage(code = 1) {
  console.log(`Usage: node scripts/dev-ctl.mjs <start|stop|restart> [all|client|server]`);
  process.exit(code);
}

function ensurePidDir() {
  mkdirSync(pidDir, { recursive: true });
}

function pidFile(name) {
  return join(pidDir, `${name}.pid`);
}

function readPid(name) {
  const file = pidFile(name);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, 'utf8').trim();
  const pid = Number(raw);
  return Number.isFinite(pid) ? pid : null;
}

function writePid(name, pid) {
  ensurePidDir();
  writeFileSync(pidFile(name), String(pid), 'utf8');
}

function clearPid(name) {
  try {
    unlinkSync(pidFile(name));
  } catch {
    // ignore
  }
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killTree(pid) {
  if (!pid || !isAlive(pid)) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
}

function sleep(ms) {
  const seconds = Math.max(0.1, ms / 1000);
  try {
    execSync(`sleep ${seconds}`, { stdio: 'ignore' });
  } catch {
    // ignore
  }
}

function forceKillByPattern(patterns) {
  for (const pattern of patterns) {
    try {
      execSync(`pkill -f ${JSON.stringify(pattern)}`, { stdio: 'ignore' });
    } catch {
      // pkill exits 1 when nothing matched
    }
  }
}

function stopTarget(target) {
  if (target === 'all' || target === 'client') {
    const pid = readPid('client');
    killTree(pid);
    clearPid('client');
    forceKillByPattern([
      'Ship game/client.*ng serve',
      'Ship game/node_modules/.bin/ng serve',
      'scripts/run-client.mjs',
      `ng serve --host 0.0.0.0 --port ${projectEnv.CLIENT_PORT}`,
    ]);
    console.log('[stop] client');
  }
  if (target === 'all' || target === 'server') {
    const pid = readPid('server');
    killTree(pid);
    clearPid('server');
    forceKillByPattern([
      'Ship game/server.*tsx watch',
      'Ship game/node_modules/.bin/tsx watch src/index.ts',
      '@ship-game/server',
    ]);
    console.log('[stop] server');
  }
  if (target === 'all') {
    const pid = readPid('dev');
    killTree(pid);
    clearPid('dev');
    forceKillByPattern(['Ship game.*concurrently.*client,server']);
  }
}

function startOne(name, command, args) {
  const existing = readPid(name);
  if (isAlive(existing)) {
    console.log(`[start] ${name} already running (pid ${existing})`);
    return existing;
  }

  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...projectEnv,
      PORT: projectEnv.SERVER_PORT,
      SERVER_PORT: projectEnv.SERVER_PORT,
      CLIENT_PORT: projectEnv.CLIENT_PORT,
      CORS_ORIGIN: projectEnv.CORS_ORIGIN,
    },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  writePid(name, child.pid);
  console.log(`[start] ${name} pid ${child.pid}`);
  return child.pid;
}

function startTarget(target) {
  const clientUrl = `http://localhost:${projectEnv.CLIENT_PORT}`;
  const serverUrl = `http://localhost:${projectEnv.SERVER_PORT}/health`;

  if (target === 'all') {
    startOne('server', 'npm', ['run', 'start', '-w', '@ship-game/server']);
    startOne('client', 'npm', ['run', 'start', '-w', 'client']);
    console.log(`[start] client ${clientUrl}`);
    console.log(`[start] server ${serverUrl}`);
    return;
  }
  if (target === 'client') {
    startOne('client', 'npm', ['run', 'start', '-w', 'client']);
    console.log(`[start] client ${clientUrl}`);
    return;
  }
  if (target === 'server') {
    startOne('server', 'npm', ['run', 'start', '-w', '@ship-game/server']);
    console.log(`[start] server ${serverUrl}`);
  }
}

function restartTarget(target) {
  stopTarget(target);
  sleep(400);
  startTarget(target);
}

const [, , action, targetRaw = 'all'] = process.argv;
const target = targetRaw.toLowerCase();

if (!['start', 'stop', 'restart'].includes(action) || !TARGETS.includes(target)) {
  usage(1);
}

ensurePidDir();

if (action === 'start') startTarget(target);
else if (action === 'stop') stopTarget(target);
else restartTarget(target);
