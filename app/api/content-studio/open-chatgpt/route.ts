import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);
const CHATGPT_URL = 'https://chatgpt.com/';

async function ensureChatGPTBridge() {
  const runtimeRoot = join(process.cwd(), '.content-studio');
  const pidPath = join(runtimeRoot, 'chatgpt-bridge.pid');
  try {
    const pid = Number(await readFile(pidPath, 'utf8'));
    if (pid > 0) {
      process.kill(pid, 0);
      return;
    }
  } catch { /* Start or replace a missing/stale bridge. */ }
  const child = spawn(process.execPath, [join(runtimeRoot, 'chatgpt-bridge.mjs')], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  await writeFile(pidPath, String(child.pid), 'utf8');
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) {
    return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  }

  try {
    const runtimeRoot = join(process.cwd(), '.content-studio');
    const extension = join(runtimeRoot, 'chatgpt-extension');
    const profile = join(runtimeRoot, 'chatgpt-profile');
    const body = await request.json().catch(() => ({})) as { setup?: boolean };
    if (body.setup) {
      await Promise.all([
        execFileAsync('open', [extension]),
        execFileAsync('open', ['-a', 'Google Chrome', 'chrome://extensions/']),
      ]);
      return NextResponse.json({ opened: true, setup: true });
    }

    await mkdir(profile, { recursive: true });
    await execFileAsync('open', [
      '-na', 'Google Chrome', '--args',
      `--user-data-dir=${profile}`,
      `--load-extension=${extension}`,
      '--remote-debugging-port=9230',
      '--remote-allow-origins=http://127.0.0.1',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--new-window',
      '--no-first-run',
      '--no-default-browser-check',
      CHATGPT_URL,
    ]);
    await ensureChatGPTBridge();
    return NextResponse.json({ opened: true });
  } catch {
    return NextResponse.json({ error: 'Could not open Google Chrome.' }, { status: 500 });
  }
}
