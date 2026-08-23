import { existsSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const MAX_PUBLISH_PER_DAY = 10;
export const MAX_PARALLEL_GENERATE = 5;
export const MAX_PARALLEL_IMAGES = 4;
export const MAX_STOCK_TARGET = 20;
const BANK_STATUSES = new Set(['ready', 'generating', 'imaging']);
const WRITE_STAGES = new Set(['idea', 'research', 'write', 'review']);

const RUNTIME = join(process.cwd(), '.content-studio');
const QUEUE_FILE = join(RUNTIME, 'queue.json');
const STOCK_FILE = join(RUNTIME, 'stock.json');

export function clampDailyTarget(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_PUBLISH_PER_DAY, n);
}

export async function readQueue() {
  try {
    const value = JSON.parse(await readFile(QUEUE_FILE, 'utf8'));
    return { jobs: Array.isArray(value.jobs) ? value.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

async function writeQueue(queue) {
  await mkdir(RUNTIME, { recursive: true });
  const next = { jobs: queue.jobs.slice(-80), updatedAt: new Date().toISOString() };
  const temporary = `${QUEUE_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
  await rename(temporary, QUEUE_FILE);
  return next;
}

export async function upsertQueueJob(patch) {
  const queue = await readQueue();
  const now = new Date().toISOString();
  const index = queue.jobs.findIndex((job) => job.id === patch.id);
  const previous = index >= 0 ? queue.jobs[index] : { id: patch.id, createdAt: now, status: 'generating', mode: 'later' };
  const next = { ...previous, ...patch, updatedAt: now };
  if (index >= 0) queue.jobs[index] = next;
  else queue.jobs.unshift(next);
  await writeQueue(queue);
  return next;
}

export async function removeQueueJob(id) {
  const queue = await readQueue();
  queue.jobs = queue.jobs.filter((job) => job.id !== id);
  await writeQueue(queue);
}

export function generatingJobs(queue) {
  return (queue.jobs || []).filter((job) => job.status === 'generating');
}

export function readyJobs(queue) {
  return (queue.jobs || []).filter((job) => job.status === 'ready');
}

export function liveWorkerCount() {
  return countJobLocks();
}

function lockIsAlive(lockFile) {
  try {
    const pid = Number(readFileSync(lockFile, 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readQueueSync() {
  try {
    const value = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    return { jobs: Array.isArray(value.jobs) ? value.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

export function liveWriteWorkerCount() {
  let count = 0;
  for (const job of readQueueSync().jobs) {
    if (job.status !== 'generating') continue;
    if (lockIsAlive(join(RUNTIME, 'jobs', job.id, 'worker.lock'))) count += 1;
  }
  try {
    const state = JSON.parse(readFileSync(join(RUNTIME, 'state.json'), 'utf8'));
    if ((state.status === 'running' || state.status === 'waiting') && WRITE_STAGES.has(state.stage) && lockIsAlive(join(RUNTIME, 'worker.lock'))) {
      count += 1;
    }
  } catch { /* no global writer */ }
  return count;
}

export function liveImageWorkerCount() {
  let count = 0;
  for (const job of readQueueSync().jobs) {
    if (job.status !== 'imaging' && !(job.status === 'publishing' && job.stage === 'image')) continue;
    if (lockIsAlive(join(RUNTIME, 'jobs', job.id, 'worker.lock'))) count += 1;
  }
  try {
    const state = JSON.parse(readFileSync(join(RUNTIME, 'state.json'), 'utf8'));
    if ((state.status === 'running' || state.status === 'waiting') && (state.stage === 'image' || state.stage === 'publish') && lockIsAlive(join(RUNTIME, 'worker.lock'))) {
      count += 1;
    }
  } catch { /* no global image job */ }
  return count;
}

export function countJobLocks() {
  let count = 0;
  try {
    const pid = Number(readFileSync(join(RUNTIME, 'worker.lock'), 'utf8'));
    if (pid) {
      try { process.kill(pid, 0); count += 1; } catch { /* stale */ }
    }
  } catch { /* none */ }
  try {
    const jobs = readdirSync(join(RUNTIME, 'jobs'));
    for (const id of jobs) {
      try {
        const pid = Number(readFileSync(join(RUNTIME, 'jobs', id, 'worker.lock'), 'utf8'));
        if (pid) {
          try { process.kill(pid, 0); count += 1; } catch { /* stale */ }
        }
      } catch { /* no lock */ }
    }
  } catch { /* no jobs */ }
  return count;
}

export function canStartMore(count = 1) {
  return liveWriteWorkerCount() + count <= MAX_PARALLEL_GENERATE;
}

export function writeSlotsRemaining() {
  return Math.max(0, MAX_PARALLEL_GENERATE - liveWriteWorkerCount());
}

export function clampStockTarget(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_STOCK_TARGET, n);
}

export function inventoryOnHand(queue) {
  return (queue?.jobs || []).filter((job) => BANK_STATUSES.has(job.status)).length;
}

export function readStockTarget() {
  try {
    return clampStockTarget(JSON.parse(readFileSync(STOCK_FILE, 'utf8')).target);
  } catch {
    return 0;
  }
}

export function stockSnapshot(queue, target = readStockTarget()) {
  const wanted = clampStockTarget(target);
  const onHand = inventoryOnHand(queue);
  return {
    target: wanted,
    onHand,
    needed: wanted > 0 ? Math.max(0, wanted - onHand) : 0,
  };
}

export async function writeStockTarget(target) {
  const next = clampStockTarget(target);
  if (next <= 0) {
    try { unlinkSync(STOCK_FILE); } catch { /* none */ }
    return 0;
  }
  await mkdir(RUNTIME, { recursive: true });
  const temporary = `${STOCK_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ target: next, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  await rename(temporary, STOCK_FILE);
  return next;
}

export function killJobWorker(id) {
  try {
    const pid = Number(readFileSync(join(RUNTIME, 'jobs', id, 'worker.lock'), 'utf8'));
    if (pid) process.kill(pid, 'SIGTERM');
  } catch { /* none */ }
  try { unlinkSync(join(RUNTIME, 'jobs', id, 'worker.lock')); } catch { /* none */ }
}

export function isFatalPublishError(error) {
  return /already exists at content\/blog|already owned|pick a different (query|reader job|slug)/i.test(String(error || ''));
}

export async function quarantineQueueJob(id, reason) {
  const queue = await readQueue();
  const job = (queue.jobs || []).find((item) => item.id === id);
  if (!job) return null;
  killJobWorker(id);
  const from = join(RUNTIME, 'jobs', id);
  const dest = join(RUNTIME, 'quarantine', id);
  try {
    await mkdir(join(RUNTIME, 'quarantine'), { recursive: true });
    if (existsSync(from)) {
      try { rmSync(dest, { recursive: true, force: true }); } catch { /* none */ }
      await rename(from, dest);
    }
    await writeFile(join(dest, 'quarantine.json'), JSON.stringify({
      id,
      slug: job.slug,
      title: job.title,
      topic: job.topic,
      reason: reason || job.error,
      quarantinedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch { /* keep queue status even if move fails */ }
  return upsertQueueJob({
    id,
    status: 'quarantined',
    message: 'Quarantined after repeated publish failure. Autopilot will write a different post.',
    error: reason || job.error,
  });
}

export async function deleteQueueDraft(id) {
  const queue = await readQueue();
  const job = (queue.jobs || []).find((item) => item.id === id);
  if (!job) return null;
  killJobWorker(id);
  try { rmSync(join(RUNTIME, 'jobs', id), { recursive: true, force: true }); } catch { /* already gone */ }
  try { rmSync(join(RUNTIME, 'quarantine', id), { recursive: true, force: true }); } catch { /* already gone */ }
  await removeQueueJob(id);
  return job;
}
