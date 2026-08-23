import { spawn, execFileSync } from 'node:child_process';
import { closeSync, createWriteStream, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';

const ROOT = '/Users/mariusmanola/Code/personal-brand-main';
const RUNTIME = join(ROOT, '.content-studio');
const DESK = 'http://127.0.0.1:3002/content-studio';
const PORT = 3002;
const LOG = join(RUNTIME, 'next-dev.log');
const SERVER_LOG = join(RUNTIME, 'next-dev.server.log');
const NEXT_PID_FILE = join(RUNTIME, 'next-dev.pid');
const FACTORY_LABEL = 'com.mariusmanolachi.content-studio';
const CHECK_MS = 20_000;
const START_COOLDOWN_MS = 45_000;
const UNHEALTHY_RESTART_MS = 2 * 60_000;
const PATH =
  '/Users/mariusmanola/.nvm/versions/node/v24.11.1/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/Users/mariusmanola/.local/bin';

let lastStartAt = 0;
let unhealthySince = 0;

function log(line) {
  const stream = createWriteStream(LOG, { flags: 'a' });
  stream.end(`[${new Date().toISOString()}] ${line}\n`);
  console.log(line);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (value) => {
      socket.removeAllListeners();
      try { socket.destroy(); } catch { /* already closed */ }
      resolve(value);
    };
    socket.setTimeout(800, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function deskUp() {
  try {
    const response = await fetch(DESK, { redirect: 'follow', signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}

function factoryAlive() {
  try {
    const pid = Number(readFileSync(join(RUNTIME, 'scheduler.pid'), 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ensureFactory() {
  if (factoryAlive()) return;
  log('Daily post factory is down. Starting the scheduler.');
  try {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
    execFileSync('launchctl', ['kickstart', `gui/${uid}/${FACTORY_LABEL}`], { stdio: 'ignore' });
  } catch (error) {
    log(`could not start factory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function startNext() {
  const now = Date.now();
  if (now - lastStartAt < START_COOLDOWN_MS) return;
  lastStartAt = now;
  const nextBin = join(ROOT, 'node_modules', '.bin', 'next');
  const command = existsSync(nextBin) ? process.execPath : 'npm';
  const args = existsSync(nextBin)
    ? [nextBin, 'dev', '--turbopack', '--port', String(PORT)]
    : ['run', 'dev', '--', '--port', String(PORT)];
  log(`Starting Next so /content-studio stays up on :${PORT}.`);
  const serverLog = openSync(SERVER_LOG, 'a');
  const child = spawn(command, args, {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', serverLog, serverLog],
    env: {
      ...process.env,
      PATH,
      PORT: String(PORT),
    },
  });
  closeSync(serverLog);
  writeFileSync(NEXT_PID_FILE, String(child.pid), 'utf8');
  child.unref();
}

function restartManagedNext() {
  try {
    const pid = Number(readFileSync(NEXT_PID_FILE, 'utf8'));
    if (!pid) return false;
    process.kill(pid, 'SIGTERM');
    unlinkSync(NEXT_PID_FILE);
    log(`Restarting unhealthy managed Next process ${pid}. See ${SERVER_LOG}.`);
    return true;
  } catch {
    return false;
  }
}

async function healDesk() {
  if (await deskUp()) {
    unhealthySince = 0;
    return;
  }
  if (await portOpen(PORT)) {
    if (!unhealthySince) unhealthySince = Date.now();
    if (Date.now() - unhealthySince >= UNHEALTHY_RESTART_MS && restartManagedNext()) {
      unhealthySince = 0;
      return;
    }
    log(`:${PORT} is bound but the desk is still compiling. Waiting.`);
    return;
  }
  unhealthySince = 0;
  log('Desk was down. Bringing Next back.');
  startNext();
}

ensureFactory();
if (await deskUp()) {
  log('Desk already answering on :3002.');
} else {
  await healDesk();
}

setInterval(async () => {
  ensureFactory();
  await healDesk();
}, CHECK_MS);
