import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { getBlogCodexStatus, studioCodexEnv } from '@/lib/content-studio/codex-account';
import { readTopics, topicWorkerAlive, writeTopics } from '@/lib/content-studio/topics.mjs';
import { runtimePath } from '@/lib/content-studio/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  return NextResponse.json(await readTopics());
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  if (topicWorkerAlive()) {
    return NextResponse.json({ error: 'Topic research is already running.' }, { status: 409 });
  }
  const blogCodex = getBlogCodexStatus();
  if (!blogCodex.loggedIn) {
    return NextResponse.json({ error: 'Sign the blog Codex account in first.' }, { status: 412 });
  }
  const worker = runtimePath('topic-worker.mjs');
  if (!existsSync(worker)) {
    return NextResponse.json({ error: 'Topic research worker is missing.' }, { status: 500 });
  }
  const body = await request.json().catch(() => ({})) as { count?: number };
  const count = Math.min(20, Math.max(8, Math.round(Number(body.count || 12))));
  const current = await readTopics();
  await writeTopics({
    ...current,
    status: 'researching',
    message: `Codex is searching for ${count} GEO/SEO topics…`,
    error: undefined,
  });
  spawn(process.execPath, [worker, String(count)], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: studioCodexEnv(),
  }).unref();
  return NextResponse.json(await readTopics(), { status: 202 });
}

export async function DELETE() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    const pid = Number(readFileSync(runtimePath('topic-worker.lock'), 'utf8'));
    if (pid) process.kill(pid, 'SIGTERM');
  } catch { /* none */ }
  try { unlinkSync(runtimePath('topic-worker.lock')); } catch { /* none */ }
  const current = await readTopics();
  await writeTopics({
    ...current,
    status: current.topics?.length ? 'ready' : 'idle',
    message: current.topics?.length ? 'Topic research stopped. Existing topics were kept.' : 'Topic research stopped.',
    error: undefined,
  });
  return NextResponse.json(await readTopics());
}
