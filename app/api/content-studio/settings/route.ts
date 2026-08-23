import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { normalizeImageProvider, readSettings, runtimePath, writeSettings } from '@/lib/content-studio/state';
import { sendTelegram, telegramConfig } from '@/lib/content-studio/telegram.mjs';

export const dynamic = 'force-dynamic';

function schedulerIsRunning(): boolean {
  try {
    const pid = Number(readFileSync(runtimePath('scheduler.pid'), 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

function ensureScheduler() {
  if (schedulerIsRunning()) return;
  try {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
    spawn('launchctl', ['kickstart', `gui/${uid}/com.mariusmanolachi.content-studio`], {
      detached: true, stdio: 'ignore',
    }).unref();
    return;
  } catch { /* fall through to a direct spawn */ }
  const scheduler = runtimePath('scheduler.mjs');
  if (!existsSync(scheduler)) return;
  const child = spawn(process.execPath, [scheduler], {
    cwd: process.cwd(), detached: true, stdio: 'ignore', env: process.env,
  });
  child.unref();
}

function telegramStatus() {
  const telegram = telegramConfig();
  return {
    telegramConfigured: Boolean(telegram.token),
    telegramChatReady: Boolean(telegram.chatId),
  };
}

export async function GET() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  ensureScheduler();
  return NextResponse.json({
    ...(await readSettings()),
    schedulerRunning: schedulerIsRunning(),
    ...telegramStatus(),
  });
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as {
    postsPerDay?: number;
    enabled?: boolean;
    thinkEnabled?: boolean;
    imageProvider?: 'gemini' | 'codex';
    scheduleMode?: 'spread' | 'daily-batch' | 'autopilot';
    pingTelegram?: boolean;
  };
  if (body.pingTelegram) {
    const result = await sendTelegram('Content Studio is connected. I will text you when a run needs you.');
    return NextResponse.json({
      ...(await readSettings()),
      schedulerRunning: schedulerIsRunning(),
      ...telegramStatus(),
      ping: result,
    }, { status: result.ok ? 200 : 400 });
  }
  const current = await readSettings();
  const postsPerDay = Math.min(10, Math.max(0, Math.round(Number(body.postsPerDay ?? current.postsPerDay))));
  const settings = {
    ...current,
    postsPerDay,
    enabled: body.enabled ?? postsPerDay > 0,
    thinkEnabled: body.thinkEnabled ?? current.thinkEnabled === true,
    scheduleMode: (body.scheduleMode === 'spread' || body.scheduleMode === 'daily-batch'
      ? body.scheduleMode
      : 'autopilot') as 'spread' | 'daily-batch' | 'autopilot',
    imageProvider: body.imageProvider === 'codex' || body.imageProvider === 'gemini'
      ? body.imageProvider
      : normalizeImageProvider(current.imageProvider),
  };
  await writeSettings(settings);
  ensureScheduler();
  return NextResponse.json({
    ...settings,
    schedulerRunning: schedulerIsRunning(),
    ...telegramStatus(),
  });
}
