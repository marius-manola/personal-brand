import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { readQueue, upsertQueueJob } from '@/lib/content-studio/queue.mjs';
import { getGeminiAccounts, isStopRequested, markGeminiAccountLimited, readState, recordGeminiHeartbeat, runtimePath, type StudioState, writeState } from '@/lib/content-studio/state';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Max-Age': '600',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

let claimQueue = Promise.resolve();

type QueueJob = { id: string; status: string; createdAt?: string };

async function poolLog(event: string, detail: Record<string, unknown> = {}) {
  await appendFile(runtimePath('image-pool.log'), `${JSON.stringify({ at: new Date().toISOString(), event, ...detail })}\n`, 'utf8').catch(() => {});
}

async function readJobState(jobId: string): Promise<StudioState | null> {
  try { return JSON.parse(await readFile(runtimePath('jobs', jobId, 'state.json'), 'utf8')) as StudioState; }
  catch { return null; }
}

async function saveJobState(state: StudioState, queueJob?: QueueJob) {
  const next = { ...state, updatedAt: new Date().toISOString(), log: (state.log || []).slice(-80) };
  if (next.id) {
    const target = runtimePath('jobs', next.id, 'state.json');
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
    await rename(temporary, target);
    if (queueJob) {
      await upsertQueueJob({
        id: next.id,
        status: queueJob.status,
        stage: next.stage,
        title: next.title,
        slug: next.slug,
        message: next.message,
        error: next.error,
      });
    }
  }
  const global = await readState();
  if (!next.id || global.id === next.id) await writeState(next);
  return next;
}

async function imageCandidates(): Promise<Array<{ state: StudioState; queueJob?: QueueJob }>> {
  const queue = await readQueue();
  const jobs = (queue.jobs || []) as QueueJob[];
  const active = jobs
    .filter((job) => job.status === 'publishing' || job.status === 'imaging')
    .sort((a, b) => Number(b.status === 'publishing') - Number(a.status === 'publishing') || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const candidates: Array<{ state: StudioState; queueJob?: QueueJob }> = [];
  for (const queueJob of active) {
    const state = await readJobState(queueJob.id);
    if (state) candidates.push({ state, queueJob });
  }
  const global = await readState();
  if (global.id && !candidates.some(({ state }) => state.id === global.id)) candidates.push({ state: global });
  return candidates;
}

async function claimImageJob(accountId: string) {
  let release!: () => void;
  const previous = claimQueue;
  claimQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const accounts = await getGeminiAccounts();
    const caller = accounts.find((account) => account.id === accountId);
    if (!caller?.connected || caller.limited) return null;
    for (const candidate of await imageCandidates()) {
      const { state, queueJob } = candidate;
      if (isStopRequested(state) || state.status !== 'waiting' || state.stage !== 'image' || !state.id) continue;
      const requests = state.imageRequests?.length ? state.imageRequests : state.imagePrompt ? [{
        id: 'hero', placeholder: '__HERO_IMAGE__', role: 'hero' as const, prompt: state.imagePrompt, alt: state.imageAlt || '',
      }] : [];
      const completed = new Set((state.images || []).map((image) => image.id));
      const request = requests.find((image) => !completed.has(image.id));
      if (!request) continue;
      const assigned = accounts.find((account) => account.id === state.geminiAccountId);
      const assignmentAge = Date.now() - Date.parse(state.updatedAt || state.startedAt || '');
      const assignmentIsFresh = Number.isFinite(assignmentAge) && assignmentAge < 3 * 60_000;
      if (state.geminiAccountId && state.geminiImageId === request.id && assigned?.connected && !assigned.limited && assignmentIsFresh && state.geminiAccountId !== accountId) continue;
      if (state.geminiAccountId !== accountId || state.geminiImageId !== request.id) {
        await saveJobState({
          ...state,
          geminiAccountId: accountId,
          geminiImageId: request.id,
          message: `Gemini Account ${accountId} is generating image ${completed.size + 1} of ${requests.length}…`,
          error: undefined,
          log: [...(state.log || []), `Image ${completed.size + 1}/${requests.length} assigned to Gemini Account ${accountId}.`],
        }, queueJob);
        await poolLog('assigned', { jobId: state.id, imageId: request.id, accountId, completed: completed.size, target: requests.length });
      }
      return { id: state.id, imageId: request.id, prompt: request.prompt, alt: request.alt, slug: state.slug };
    }
    return null;
  } finally {
    release();
  }
}

export async function GET(request: Request) {
  if (!(await isLocalRequest())) return json({ error: 'Local access only.' }, 403);
  const accountId = new URL(request.url).searchParams.get('accountId') || '1';
  await recordGeminiHeartbeat(accountId);
  return json({ job: await claimImageJob(accountId) });
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return json({ error: 'Local access only.' }, 403);
  const body = await request.json().catch(() => ({})) as {
    type?: string; jobId?: string; imageId?: string; accountId?: string; data?: string; mimeType?: string; error?: string; code?: string;
  };
  const accountId = body.accountId || '1';
  await recordGeminiHeartbeat(accountId);
  if (body.type === 'heartbeat') return json({ ok: true });

  if (!body.jobId) return json({ error: 'A job id is required.' }, 400);
  const queueJob = ((await readQueue()).jobs || []).find((job: QueueJob) => job.id === body.jobId) as QueueJob | undefined;
  const state = await readJobState(body.jobId) || await readState();
  if (isStopRequested(state)) return json({ error: 'Job was stopped.' }, 409);
  if (body.jobId !== state.id) return json({ error: 'Stale image job.' }, 409);
  if (state.geminiAccountId !== accountId) return json({ error: 'This image job belongs to another Gemini account.' }, 409);
  if (!body.imageId || state.geminiImageId !== body.imageId) return json({ error: 'This is not the active image in the queue.' }, 409);
  if (body.type === 'error') {
    if (body.code === 'GEMINI_LIMIT_REACHED') {
      const limitedUntil = await markGeminiAccountLimited(accountId);
      await saveJobState({
        ...state,
        geminiAccountId: undefined,
        geminiImageId: undefined,
        message: `Gemini Account ${accountId} repeated its limit warning. Rotating to the next account…`,
        error: undefined,
        log: [...(state.log || []), `Gemini Account ${accountId} was limited until ${limitedUntil}; released image job for rotation.`],
      }, queueJob);
      await poolLog('account_limited', { jobId: state.id, imageId: body.imageId, accountId, limitedUntil });
      return json({ ok: true, rotated: true });
    }
    await saveJobState({
      ...state,
      geminiAccountId: undefined,
      geminiImageId: undefined,
      message: `Gemini Account ${accountId} needs attention. Rotating so another account can try…`,
      error: body.error || 'Gemini browser automation stopped.',
      log: [...(state.log || []), `Gemini Account ${accountId} error: ${body.error || 'stopped'}. Released the image job.`].slice(-80),
    }, queueJob);
    await poolLog('account_error', { jobId: state.id, imageId: body.imageId, accountId, error: body.error || 'stopped' });
    return json({ ok: true });
  }
  if (body.type !== 'image' || !body.data || !body.mimeType?.startsWith('image/')) {
    return json({ error: 'A valid image payload is required.' }, 400);
  }

  const bytes = Buffer.from(body.data, 'base64');
  if (bytes.length < 10_000 || bytes.length > 12_000_000) return json({ error: 'Image size is outside the allowed range.' }, 400);
  const extension = body.mimeType.includes('webp') ? 'webp' : body.mimeType.includes('jpeg') ? 'jpg' : 'png';
  const slug = state.slug || 'blog-post';
  const safeImageId = body.imageId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const relativePath = `/blog/${slug}-${safeImageId}.${extension}`;
  const destination = join(process.cwd(), 'public', relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  const manifestPath = runtimePath('jobs', state.id, 'manifest.json');
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    const imagePaths = { ...((manifest.imagePaths || {}) as Record<string, string>), [body.imageId]: relativePath };
    await writeFile(manifestPath, JSON.stringify({ ...manifest, imagePaths }, null, 2), 'utf8');
  } catch { /* The worker will surface a missing manifest if needed. */ }

  const imageRequest = state.imageRequests?.find((image) => image.id === body.imageId);
  const images = [...(state.images || []).filter((image) => image.id !== body.imageId), {
    id: body.imageId,
    path: relativePath,
    alt: imageRequest?.alt || state.imageAlt || '',
    accountId,
    createdAt: new Date().toISOString(),
  }];
  const target = state.imageTarget || state.imageRequests?.length || 1;
  const complete = images.length >= target;
  await saveJobState({
    ...state,
    status: complete ? 'running' : 'waiting',
    stage: 'image',
    imagePath: images.find((image) => image.id === 'hero')?.path || state.imagePath,
    images,
    geminiAccountId: undefined,
    geminiImageId: undefined,
    message: complete
      ? `${images.length} images received. Running the final build and publishing…`
      : `Image ${images.length} of ${target} saved. Generating the next image…`,
    error: undefined,
    log: [...(state.log || []), `Gemini image ${images.length}/${target} saved to ${relativePath}.`],
  }, queueJob);
  await poolLog('image_saved', { jobId: state.id, imageId: body.imageId, accountId, path: relativePath, completed: images.length, target });
  return json({ ok: true, path: relativePath });
}
