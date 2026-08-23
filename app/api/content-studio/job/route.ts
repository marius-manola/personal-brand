import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { getStudioMetrics } from '@/lib/content-studio/metrics';
import { getBlogCodexStatus, getBlogCodexUsage, studioCodexEnv } from '@/lib/content-studio/codex-account';
import {
  canStartMore, clampStockTarget, deleteQueueDraft, killJobWorker, liveImageWorkerCount, liveWriteWorkerCount, liveWorkerCount,
  MAX_PARALLEL_GENERATE, MAX_PUBLISH_PER_DAY, MAX_STOCK_TARGET, readQueue, stockSnapshot,
  upsertQueueJob, writeSlotsRemaining, writeStockTarget,
} from '@/lib/content-studio/queue.mjs';
import { chatgptIsConnected, geminiIsConnected, getGeminiAccounts, isStopRequested, normalizeImageProvider, readChatGPTHeartbeat, readSettings, readState, runtimePath, workerIsAlive, writeState } from '@/lib/content-studio/state';
import { claimTopics, readTopics, readyTopics, releaseTopicsForJob, topicPlan } from '@/lib/content-studio/topics.mjs';
import { telegramConfig } from '@/lib/content-studio/telegram.mjs';
import { collisionIssues, slugify } from '@/lib/content-studio/inventory.mjs';
import { draftWordCount, jobHasDraft } from '@/lib/content-studio/preview';
import { claimWordBand, wordBandMix } from '@/lib/content-studio/word-bands.mjs';

export const dynamic = 'force-dynamic';

async function recoverDeadPublishJobs(queue: { jobs: Array<{ id: string; status: string; slug?: string; stage?: string }> }) {
  for (const job of queue.jobs || []) {
    if (job.status !== 'publishing' && job.status !== 'imaging') continue;
    const lock = runtimePath('jobs', job.id, 'worker.lock');
    let alive = false;
    try {
      const pid = Number(readFileSync(lock, 'utf8'));
      if (pid) {
        process.kill(pid, 0);
        alive = true;
      }
    } catch { alive = false; }
    if (alive) continue;
    if (!existsSync(runtimePath('jobs', job.id, 'post.mdx'))) continue;
    await upsertQueueJob({
      id: job.id,
      status: 'ready',
      message: 'Image worker stopped. Draft is still ready to publish.',
      error: undefined,
    });
    job.status = 'ready';
  }
  return queue.jobs;
}

async function responseState() {
  const [state, settings, geminiAccounts, chatgptConnected, heartbeat, topics, queue] = await Promise.all([
    readState(), readSettings(), getGeminiAccounts(), chatgptIsConnected(), readChatGPTHeartbeat(), readTopics(), readQueue(),
  ]);
  const jobs = await recoverDeadPublishJobs(queue);
  const imageProvider = normalizeImageProvider(settings.imageProvider);
  const geminiConnected = geminiAccounts.some((account) => account.connected && !account.limited);
  const gemini = {
    engine: 'extension-pool',
    installed: true,
    browserOpen: geminiAccounts.some((account) => account.connected),
    signedIn: geminiConnected,
    lastError: undefined,
  };
  return {
    ...state,
    chatgptConnected,
    geminiConnected,
    gemini,
    imageProvider,
    geminiAccounts,
    workerAlive: workerIsAlive(),
    stopRequested: isStopRequested(state),
    chatgptPlan: heartbeat.plan,
    chatgptUrl: heartbeat.url,
    chatgptEvent: heartbeat.event,
    blogCodex: { ...getBlogCodexStatus(), usage: await getBlogCodexUsage() },
    telegramConfigured: Boolean(telegramConfig().token),
    queue: jobs.map((item) => ({
      ...item,
      ...(item.id === state.id ? {
        stage: state.stage,
        message: state.message,
        error: state.error,
      } : {}),
      hasDraft: jobHasDraft(item.id),
      wordCount: draftWordCount(item.id),
      liveUrl: item.slug ? `https://mariusmanolachi.com/blog/${item.slug}` : undefined,
    })),
    generatingCount: liveWriteWorkerCount(),
    imagingCount: liveImageWorkerCount(),
    workerCount: liveWorkerCount(),
    maxParallel: MAX_PARALLEL_GENERATE,
    maxStock: MAX_STOCK_TARGET,
    maxPerDay: MAX_PUBLISH_PER_DAY,
    stock: stockSnapshot({ jobs }),
    wordBands: wordBandMix(),
    topics,
    plan: topicPlan(topics),
    autopilot: (() => {
      try { return JSON.parse(readFileSync(runtimePath('autopilot.json'), 'utf8')); }
      catch { return null; }
    })(),
    metrics: await getStudioMetrics(state, settings),
  };
}

export async function GET() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  let current = await readState();
  const currentQueueJob = current.id
    ? (await readQueue()).jobs.find((item: { id: string; status: string; message?: string }) => item.id === current.id)
    : undefined;
  if (currentQueueJob?.status === 'published' && current.status !== 'done') {
    current = {
      ...current,
      status: 'done',
      stage: 'done',
      message: currentQueueJob.message || 'Published. Autopilot is continuing with the queue.',
      error: undefined,
    };
    await writeState(current);
  } else if ((current.status === 'running' || current.status === 'waiting') && !workerIsAlive()) {
    await writeState({
      ...current,
      status: 'failed',
      stage: 'failed',
      message: 'The writer process died. The article was not discarded — click Try again.',
      error: 'Worker process is not running.',
      chatgptTurnId: undefined,
      chatgptPrompt: undefined,
      chatgptClaimedAt: undefined,
      log: [...(current.log || []), 'Worker lock missing; marked failed so ChatGPT stops claiming.'].slice(-80),
    });
  }
  return NextResponse.json(await responseState());
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  const current = await readState();
  const body = await request.json().catch(() => ({})) as {
    topic?: string;
    topics?: string[];
    later?: boolean;
    count?: number;
    publishQueuedId?: string;
    deleteQueuedId?: string;
  };
  const topic = String(body.topic || '').trim().slice(0, 500);
  if (body.deleteQueuedId) {
    const removed = await deleteQueueDraft(String(body.deleteQueuedId));
    if (!removed) return NextResponse.json({ error: 'That queued post was not found.' }, { status: 404 });
    await releaseTopicsForJob(removed.id, removed.topic || removed.slug || removed.title, { force: true });
    if (current.id === removed.id) {
      await writeState({
        ...current,
        status: 'idle',
        stage: 'idle',
        message: 'Queued draft deleted.',
        error: undefined,
        stopped: undefined,
      });
    }
    return NextResponse.json(await responseState());
  }
  const skipSingleLock = Boolean(body.later || body.publishQueuedId);
  if (!skipSingleLock && (current.status === 'running' || current.status === 'waiting')) {
    return NextResponse.json({ error: 'A post is already being created.' }, { status: 409 });
  }
  if (!skipSingleLock) {
    try { unlinkSync(runtimePath('stop')); } catch { /* allow a new run */ }
    try {
      const lockPid = Number(readFileSync(runtimePath('worker.lock'), 'utf8'));
      if (lockPid) {
        try {
          process.kill(lockPid, 0);
          return NextResponse.json({ error: 'A writing worker is already running.' }, { status: 409 });
        } catch { /* stale lock */ }
      }
    } catch { /* no lock */ }
  }

  if (body.publishQueuedId) {
    const metrics = await getStudioMetrics(current, await readSettings());
    if (metrics.publishedToday >= MAX_PUBLISH_PER_DAY) {
      return NextResponse.json({ error: `Daily cap is ${MAX_PUBLISH_PER_DAY} published posts.` }, { status: 409 });
    }
    if (metrics.remainingToday <= 0) {
      return NextResponse.json({ error: 'Today’s publishing target is already filled.' }, { status: 409 });
    }
    const publishSettings = await readSettings();
    if (normalizeImageProvider(publishSettings.imageProvider) !== 'codex' && !(await geminiIsConnected()) && !getBlogCodexStatus().loggedIn) {
      return NextResponse.json({ error: 'Connect Gemini, or sign in blog Codex as the image fallback.' }, { status: 412 });
    }
    const queued = (await readQueue()).jobs.find((job: { id: string; status: string }) => job.id === body.publishQueuedId && (job.status === 'ready' || job.status === 'failed' || job.status === 'publishing' || job.status === 'published'));
    if (!queued) return NextResponse.json({ error: 'That queued post is not ready.' }, { status: 404 });
    if (!existsSync(runtimePath('jobs', queued.id, 'post.mdx'))) {
      return NextResponse.json({ error: 'Queued files are missing.' }, { status: 404 });
    }
    try { unlinkSync(runtimePath('stop')); } catch { /* allow */ }
    await upsertQueueJob({ id: queued.id, status: 'publishing', message: 'Publishing queued post…' });
    const child = spawn(process.execPath, [runtimePath('worker.mjs'), queued.id, '--publish-queued'], {
      cwd: process.cwd(), detached: true, stdio: 'ignore', env: studioCodexEnv(),
    });
    child.unref();
    return NextResponse.json(await responseState(), { status: 202 });
  }

  if (body.later) {
    const requested = Array.isArray(body.topics)
      ? body.topics.map((item) => String(item || '').trim().slice(0, 500)).filter(Boolean)
      : [];
    const requestedCount = clampStockTarget(body.count || requested.length || 1) || 1;
    const queue = await readQueue();
    const snapshot = stockSnapshot(queue, requestedCount);
    await writeStockTarget(requestedCount);
    if (snapshot.needed < 1) {
      return NextResponse.json({
        ...(await responseState()),
        started: [],
        message: `Already have ${snapshot.onHand} drafts in the later queue. Nothing to generate.`,
      });
    }
    const available = writeSlotsRemaining();
    const blogCodex = getBlogCodexStatus();
    if (!blogCodex.loggedIn) {
      return NextResponse.json({ error: 'Sign the blog Codex account in first.' }, { status: 412 });
    }
    if (available < 1) {
      return NextResponse.json({
        ...(await responseState()),
        started: [],
        message: `Want ${requestedCount} in the bank. ${snapshot.onHand} already queued. All ${MAX_PARALLEL_GENERATE} writer slots are full, so the scheduler will start the rest as slots free.`,
      }, { status: 202 });
    }
    const count = Math.min(snapshot.needed, available, requested.length || snapshot.needed);
    if (!canStartMore(count)) {
      return NextResponse.json({ error: `Already writing ${liveWriteWorkerCount()} posts. Max parallel writers is ${MAX_PARALLEL_GENERATE}.` }, { status: 409 });
    }
    const ids = Array.from({ length: count }, () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    if (requested.length) {
      const extras = [];
      for (const item of requested.slice(0, count)) {
        const issues = collisionIssues(undefined, { slug: slugify(item), query: item, aliases: [] }, { extra: extras, mode: 'hard' });
        if (issues.length) {
          return NextResponse.json({ error: issues[0] }, { status: 409 });
        }
        extras.push({ query: item, slug: slugify(item) });
      }
    } else if (!readyTopics(await readTopics()).length) {
      return NextResponse.json({
        error: 'No researched topics ready. Research topics first, or type directions.',
      }, { status: 412 });
    }
    const claimed = requested.length ? [] : await claimTopics(count, ids);
    const writeCount = requested.length ? Math.min(count, requested.length) : claimed.length;
    if (!requested.length && writeCount < 1) {
      return NextResponse.json({
        error: 'Every ready topic overlaps a live or in-flight post. Research new queries first.',
      }, { status: 412 });
    }
    try { unlinkSync(runtimePath('stop')); } catch { /* allow */ }
    const worker = runtimePath('worker.mjs');
    const started = [];
    for (let index = 0; index < writeCount; index += 1) {
      const id = ids[index];
      const assignment = claimed[index] || { query: requested[index] || topic };
      const jobTopic = assignment.query;
      await upsertQueueJob({
        ...assignment, id, topic: jobTopic || undefined, mode: 'later', status: 'generating',
        stage: 'write', message: jobTopic ? `Codex is writing “${jobTopic}”…` : 'Codex is writing this one for later…',
      });
      await claimWordBand(id, assignment);
      spawn(process.execPath, [worker, id, jobTopic, '--queue'], {
        cwd: process.cwd(), detached: true, stdio: 'ignore', env: studioCodexEnv(),
      }).unref();
      started.push(id);
    }
    return NextResponse.json({ ...(await responseState()), started }, { status: 202 });
  }
  let resumeSlug = current.slug;
  if (!resumeSlug && current.id && existsSync(runtimePath('jobs', current.id, 'manifest.json'))) {
    try {
      resumeSlug = (JSON.parse(readFileSync(runtimePath('jobs', current.id, 'manifest.json'), 'utf8')) as { slug?: string }).slug;
    } catch { /* keep empty */ }
  }
  const canResumePublication = Boolean(
    current.status === 'failed' && current.id && resumeSlug && (current.images?.length || 0) >= (current.imageTarget || 3) &&
    existsSync(runtimePath('jobs', current.id!, 'post.mdx')) &&
    existsSync(runtimePath('jobs', current.id!, 'manifest.json')),
  );
  if (canResumePublication) {
    const state = {
      ...current,
      status: 'running' as const,
      stage: 'publish' as const,
      stopped: undefined,
      message: 'Retrying the production build and website sync…',
      error: undefined,
      log: [...(current.log || []), 'Publication retry started.'],
    };
    await writeState(state);
    const child = spawn(process.execPath, [runtimePath('worker.mjs'), current.id!, '--resume-publish'], {
      cwd: process.cwd(), detached: true, stdio: 'ignore', env: studioCodexEnv(),
    });
    child.unref();
    return NextResponse.json(await responseState(), { status: 202 });
  }

  const canResumeContent = Boolean(
    current.status === 'failed' && current.id &&
    existsSync(runtimePath('jobs', current.id!, 'post.mdx')) &&
    existsSync(runtimePath('jobs', current.id!, 'manifest.json')),
  );
  if (canResumeContent) {
    const state = {
      ...current,
      status: 'running' as const,
      stage: 'review' as const,
      stopped: undefined,
      message: 'Codex is repairing the saved article…',
      error: undefined,
      log: [...(current.log || []), 'Content upgrade retry started.'],
    };
    await writeState(state);
    const child = spawn(process.execPath, [runtimePath('worker.mjs'), current.id!, '--resume-content'], {
      cwd: process.cwd(), detached: true, stdio: 'ignore', env: studioCodexEnv(),
    });
    child.unref();
    return NextResponse.json(await responseState(), { status: 202 });
  }

  const startSettings = await readSettings();
  const metrics = await getStudioMetrics(current, startSettings);
  if (metrics.publishedToday >= MAX_PUBLISH_PER_DAY || metrics.remainingToday <= 0) {
    return NextResponse.json({ error: `Daily cap is ${MAX_PUBLISH_PER_DAY}. Publish from the later queue tomorrow.` }, { status: 409 });
  }
  const blogCodex = getBlogCodexStatus();
  if (!existsSync(process.env.CONTENT_STUDIO_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex')) {
    return NextResponse.json({ error: 'Codex is missing. Install the ChatGPT desktop app so the studio can use GPT-5.6 Luna.' }, { status: 412 });
  }
  if (!blogCodex.loggedIn) {
    return NextResponse.json({ error: 'Sign the blog Codex account in on the dashboard first. That login is separate from your coding Codex.' }, { status: 412 });
  }
  if (normalizeImageProvider(startSettings.imageProvider) !== 'codex' && !(await geminiIsConnected()) && !blogCodex.loggedIn) {
    return NextResponse.json({ error: 'Connect Gemini, or sign in blog Codex as the image fallback.' }, { status: 412 });
  }

  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  let assignedTopic = topic;
  let assignment: Record<string, unknown> = { query: topic };
  if (assignedTopic) {
    const issues = collisionIssues(undefined, { slug: slugify(assignedTopic), query: assignedTopic, aliases: [] }, { mode: 'hard' });
    if (issues.length) return NextResponse.json({ error: issues[0] }, { status: 409 });
  } else {
    const availableTopics = readyTopics(await readTopics());
    if (!availableTopics.length) {
      return NextResponse.json({ error: 'Research topics first, or type a direction. Writers will not invent the same post again.' }, { status: 412 });
    }
    const claimed = await claimTopics(1, [id]);
    assignment = claimed[0] || assignment;
    assignedTopic = String(claimed[0]?.query || '');
    if (!assignedTopic) {
      return NextResponse.json({ error: 'Every ready topic overlaps a live or in-flight post. Research new queries first.' }, { status: 412 });
    }
  }
  const state = {
    id,
    status: 'running' as const,
    stage: 'idea' as const,
    message: assignedTopic ? `Codex is writing “${assignedTopic}” with GPT-5.6 Luna on high…` : 'Codex is writing with GPT-5.6 Luna on high…',
    startedAt: new Date().toISOString(),
    log: ['Job created from the local dashboard.'],
  };
  await writeState(state);
  await upsertQueueJob({ ...assignment, id, topic: assignedTopic, mode: 'now', status: 'generating', stage: 'write' });
  await claimWordBand(id, assignment);

  const worker = runtimePath('worker.mjs');
  if (!existsSync(worker)) {
    await writeState({ ...state, status: 'failed', stage: 'failed', message: 'The local worker is missing.' });
    return NextResponse.json({ error: 'The local content worker is missing.' }, { status: 500 });
  }

  const child = spawn(process.execPath, [worker, id, assignedTopic], {
    cwd: process.cwd(), detached: true, stdio: 'ignore', env: studioCodexEnv(),
  });
  child.unref();
  return NextResponse.json(await responseState(), { status: 202 });
}

function stopWorkers() {
  try {
    const pid = Number(readFileSync(runtimePath('worker.lock'), 'utf8'));
    if (pid) process.kill(pid, 'SIGTERM');
  } catch { /* no lock pid */ }
  try {
    execFileSync('pkill', ['-f', '[.]content-studio/worker[.]mjs'], { stdio: 'ignore' });
  } catch { /* none running */ }
  try { unlinkSync(runtimePath('worker.lock')); } catch { /* already gone */ }
}

export async function DELETE() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  writeFileSync(runtimePath('stop'), String(Date.now()), 'utf8');
  const current = await readState();
  const active = current.status === 'running' || current.status === 'waiting';
  if (active) {
    await writeState({
      ...current,
      status: 'failed',
      stage: 'failed',
      stopped: true,
      message: 'Stopped. Draft files were kept. Automatic publishing is paused until you start again.',
      error: 'Stopped by you.',
      chatgptTurnId: undefined,
      chatgptPrompt: undefined,
      chatgptClaimedAt: undefined,
      chatgptError: undefined,
      geminiAccountId: undefined,
      geminiImageId: undefined,
      log: [...(current.log || []), 'Stopped by you.'].slice(-80),
    });
  } else {
    await writeState({
      ...current,
      stopped: true,
      log: [...(current.log || []), 'Stop requested. Automatic starts paused until you create a post.'].slice(-80),
    });
  }
  await writeStockTarget(0);
  const queue = await readQueue();
  for (const job of queue.jobs) {
    if (job.status !== 'generating' && job.status !== 'publishing') continue;
    killJobWorker(job.id);
    const hasPost = existsSync(runtimePath('jobs', job.id, 'post.mdx'));
    await upsertQueueJob({
      id: job.id,
      status: hasPost ? 'ready' : 'failed',
      error: hasPost ? undefined : 'Stopped by you.',
      message: hasPost ? 'Stopped. Draft kept and is ready to publish.' : 'Stopped. Draft files were kept.',
    });
  }
  stopWorkers();
  return NextResponse.json(await responseState());
}
