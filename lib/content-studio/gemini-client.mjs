import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const GEMINI_BRIDGE_URL = process.env.CONTENT_STUDIO_GEMINI_BRIDGE || 'http://127.0.0.1:18765';

function runtimePath(...parts) {
  return join(process.cwd(), '.content-studio', ...parts);
}

async function ping() {
  try {
    const response = await fetch(`${GEMINI_BRIDGE_URL}/status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.engine === 'playwright';
  } catch {
    return false;
  }
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function ensureGeminiBridge() {
  if (await ping()) return;
  const pidPath = runtimePath('gemini-bridge.pid');
  try {
    const pid = Number(readFileSync(pidPath, 'utf8'));
    if (pidAlive(pid) && !(await ping())) {
      try { process.kill(pid, 'SIGTERM'); } catch { /* replace stale CDP bridge */ }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  } catch { /* no pid */ }
  const script = runtimePath('gemini-bridge.mjs');
  if (!existsSync(script)) throw new Error('Gemini bridge script is missing.');
  const child = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  writeFileSync(pidPath, String(child.pid), 'utf8');
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (await ping()) return;
  }
  throw new Error('Gemini bridge did not start.');
}

export async function geminiBridgeRequest(pathname, { method = 'GET', body, timeoutMs = 200_000 } = {}) {
  await ensureGeminiBridge();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${GEMINI_BRIDGE_URL}${pathname}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Gemini bridge ${pathname} failed.`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function playwrightGeminiStatus() {
  try {
    await ensureGeminiBridge();
    return await geminiBridgeRequest('/status', { timeoutMs: 8_000 });
  } catch (error) {
    return {
      engine: 'playwright',
      installed: true,
      browserOpen: false,
      signedIn: false,
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}
