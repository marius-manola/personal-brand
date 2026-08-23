import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { claimTopics, missingSlateTypes, readTopics, readyTopics, topicWorkerAlive } from '../lib/content-studio/topics.mjs';
import {
  isFatalPublishError, liveWriteWorkerCount, quarantineQueueJob, readQueue, readStockTarget,
  killJobWorker, stockSnapshot, upsertQueueJob, writeStockTarget,
} from '../lib/content-studio/queue.mjs';
import { markTopicUsed } from '../lib/content-studio/topics.mjs';
import { claimWordBand } from '../lib/content-studio/word-bands.mjs';
import { loadLocalEnv, sendTelegram, telegramConfig } from '../lib/content-studio/telegram.mjs';
import { maybeRunGrowthCycle } from '../lib/content-studio/control-plane.mjs';

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');
const SETTINGS_FILE = join(RUNTIME, 'settings.json');
const STATE_FILE = join(RUNTIME, 'state.json');
const PID_FILE = join(RUNTIME, 'scheduler.pid');
const AUTOPILOT_FILE = join(RUNTIME, 'autopilot.json');
const WORKER = join(RUNTIME, 'worker.mjs');
const TOPIC_WORKER = join(RUNTIME, 'topic-worker.mjs');
const BLOG_DIR = join(ROOT, 'content/blog');
const MAX_RETRIES = 3;
const ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const FAIL_COOLDOWN_MS = 5 * 60 * 1000;
const TICK_MS = 60_000;
const IMAGE_STALL_MS = Math.max(5 * 60_000, Number(process.env.CONTENT_STUDIO_IMAGE_STALL_MS || 18 * 60_000));

loadLocalEnv();
await mkdir(RUNTIME, { recursive: true });

try {
  const existing = Number(readFileSync(PID_FILE, 'utf8'));
  if (existing && existing !== process.pid) {
    try { process.kill(existing, 'SIGTERM'); } catch { /* already gone */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
} catch { /* stale or missing */ }
await writeFile(PID_FILE, String(process.pid), 'utf8');
console.log(`[${new Date().toISOString()}] scheduler up pid=${process.pid}`);

async function json(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await rename(temporary, file);
}

function berlinDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function blogHome() {
  if (process.env.CONTENT_STUDIO_CODEX_HOME) return process.env.CONTENT_STUDIO_CODEX_HOME;
  try {
    const registry = JSON.parse(readFileSync(join(RUNTIME, 'codex-accounts.json'), 'utf8'));
    const activeId = String(registry?.activeAccountId || 'primary');
    return activeId === 'primary'
      ? join(RUNTIME, 'codex-home')
      : join(RUNTIME, 'codex-accounts', activeId);
  } catch {
    return join(RUNTIME, 'codex-home');
  }
}

function workerEnv() {
  return { ...process.env, CODEX_HOME: blogHome() };
}

function publishedTodayCount() {
  const today = berlinDate();
  let count = 0;
  try {
    for (const file of readdirSync(BLOG_DIR)) {
      if (!file.endsWith('.mdx') || file.startsWith('_')) continue;
      const source = readFileSync(join(BLOG_DIR, file), 'utf8');
      const date = source.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m)?.[1];
      const draft = /^\s*draft:\s*true\s*$/m.test(source);
      if (!draft && date === today) count += 1;
    }
  } catch { /* no blog dir */ }
  return count;
}

function jobHasPost(id) {
  return existsSync(join(RUNTIME, 'jobs', id, 'post.mdx'));
}

function jobImageCount(id) {
  try {
    const state = JSON.parse(readFileSync(join(RUNTIME, 'jobs', id, 'state.json'), 'utf8'));
    return Array.isArray(state.images) ? state.images.length : 0;
  } catch {
    return 0;
  }
}

function geminiPoolConnected() {
  const now = Date.now();
  for (const id of ['1', '2', '3']) {
    try {
      const account = JSON.parse(readFileSync(join(RUNTIME, 'gemini-accounts', `${id}.json`), 'utf8'));
      const seenAt = Date.parse(account.at || '');
      const limitedUntil = Date.parse(account.limitedUntil || '');
      if (Number.isFinite(seenAt) && now - seenAt < 120_000 && (!Number.isFinite(limitedUntil) || limitedUntil <= now)) return true;
    } catch { /* account has not connected */ }
  }
  return false;
}

function publishedJobToday(job) {
  if (!job.slug) return false;
  try {
    const source = readFileSync(join(BLOG_DIR, `${job.slug}.mdx`), 'utf8');
    const date = source.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m)?.[1];
    return date === berlinDate() && !/^\s*draft:\s*true\s*$/m.test(source);
  } catch {
    return false;
  }
}

async function recoverStalledImageJob(jobs) {
  for (const job of jobs) {
    if ((job.status !== 'publishing' && job.status !== 'imaging') || job.stage !== 'image') continue;
    let state = {};
    try { state = JSON.parse(readFileSync(join(RUNTIME, 'jobs', job.id, 'state.json'), 'utf8')); } catch { /* queue timestamp below */ }
    const touchedAt = Date.parse(state.updatedAt || job.updatedAt || '');
    if (!Number.isFinite(touchedAt) || Date.now() - touchedAt < IMAGE_STALL_MS) continue;
    killJobWorker(job.id);
    if (publishedJobToday(job)) {
      await upsertQueueJob({
        id: job.id,
        status: 'published',
        stage: 'done',
        message: 'Already live. Released a stale image worker so autopilot can continue.',
        error: undefined,
      });
      const global = await json(STATE_FILE, {});
      if (global.id === job.id) {
        await writeJson(STATE_FILE, {
          ...global,
          status: 'done',
          stage: 'done',
          message: 'Already live. Released a stale image worker so autopilot can continue.',
          error: undefined,
        });
      }
      console.log(`[${new Date().toISOString()}] recovered stale image worker ${job.id}; post is already live`);
    } else {
      await upsertQueueJob({
        id: job.id,
        status: 'ready',
        stage: 'review',
        message: 'Recovered after the image pool stopped making progress. Draft is ready to retry.',
        error: undefined,
      });
      console.log(`[${new Date().toISOString()}] recovered stale image worker ${job.id}; returned draft to ready`);
    }
    return true;
  }
  return false;
}

function blogCodexLoggedIn() {
  try {
    const auth = JSON.parse(readFileSync(join(blogHome(), 'auth.json'), 'utf8'));
    return Boolean(auth?.tokens?.id_token || auth?.tokens?.access_token);
  } catch {
    return false;
  }
}

function emptyAutopilot() {
  return {
    retries: {},
    alerts: {},
    lastAction: 'idle',
    lastTickAt: null,
    lastError: null,
  };
}

async function readAutopilot() {
  const value = await json(AUTOPILOT_FILE, emptyAutopilot());
  return { ...emptyAutopilot(), ...value, retries: value.retries || {}, alerts: value.alerts || {} };
}

async function note(autopilot, action, extra = {}) {
  const next = { ...autopilot, lastAction: action, lastTickAt: new Date().toISOString(), ...extra };
  await writeJson(AUTOPILOT_FILE, next);
  console.log(`[${next.lastTickAt}] ${action}`);
  return next;
}

async function alertOnce(autopilot, key, text) {
  const last = autopilot.alerts?.[key] ? new Date(autopilot.alerts[key]).getTime() : 0;
  if (Date.now() - last < ALERT_COOLDOWN_MS) return autopilot;
  const sent = await sendTelegram(text);
  autopilot.alerts = { ...autopilot.alerts, [key]: new Date().toISOString() };
  autopilot.lastError = sent.ok ? undefined : sent.error;
  await writeJson(AUTOPILOT_FILE, autopilot);
  return autopilot;
}

function spawnWorker(args) {
  spawn(process.execPath, [WORKER, ...args], {
    cwd: ROOT, detached: true, stdio: 'ignore', env: workerEnv(),
  }).unref();
}

function canRetry(autopilot, id) {
  const record = autopilot.retries[id];
  if (!record) return true;
  if (record.count >= MAX_RETRIES) return false;
  const last = record.lastAt ? new Date(record.lastAt).getTime() : 0;
  return Date.now() - last >= FAIL_COOLDOWN_MS;
}

function bumpRetry(autopilot, id, error) {
  const previous = autopilot.retries[id] || { count: 0 };
  autopilot.retries[id] = {
    count: previous.count + 1,
    lastAt: new Date().toISOString(),
    lastError: error || previous.lastError,
  };
  return autopilot.retries[id];
}

async function tick() {
  if (existsSync(join(RUNTIME, 'stop'))) return;
  let autopilot = await readAutopilot();
  await maybeRunGrowthCycle().catch((error) => console.error(`[growth] ${error instanceof Error ? error.message : String(error)}`));
  const settings = await json(SETTINGS_FILE, { enabled: true, postsPerDay: 8, scheduleMode: 'autopilot' });
  const target = Math.min(10, Math.max(0, Number(settings.postsPerDay) || 0));
  const mode = settings.scheduleMode === 'spread' || settings.scheduleMode === 'daily-batch'
    ? settings.scheduleMode
    : 'autopilot';
  const stockTarget = readStockTarget();
  if (stockTarget < 1 && (!settings.enabled || target === 0)) {
    await note(autopilot, 'paused');
    return;
  }

  const publishedToday = publishedTodayCount();
  const remaining = (!settings.enabled || mode !== 'autopilot') ? 0 : Math.max(0, target - publishedToday);
  let queue = await readQueue();
  if (await recoverStalledImageJob(queue.jobs || [])) queue = await readQueue();
  const jobs = queue.jobs || [];
  const ready = jobs.filter((job) => job.status === 'ready' && jobHasPost(job.id));
  const imaging = jobs.filter((job) => job.status === 'imaging' || (job.status === 'publishing' && job.stage === 'image')).length;
  const publishing = jobs.some((job) => job.status === 'publishing');
  const writing = liveWriteWorkerCount();
  const failed = jobs.filter((job) => job.status === 'failed' && jobHasPost(job.id));
  const stock = stockSnapshot({ jobs }, stockTarget);
  if (stockTarget > 0 && stock.needed < 1) {
    await writeStockTarget(0);
  }
  const neededDrafts = Math.max(
    remaining > 0 ? remaining - ready.length - writing - imaging : 0,
    stock.needed,
  );

  if (remaining <= 0 && neededDrafts <= 0) {
    await note(autopilot, remaining <= 0 && target > 0 && mode !== 'spread'
      ? `target reached (${publishedToday}/${target})`
      : 'watching');
    return;
  }

  if (!blogCodexLoggedIn()) {
    await alertOnce(autopilot, 'codex-login',
      `Content studio needs you.\nBlog Codex is not signed in.\n${publishedToday}/${target} posts today. Remaining ${remaining}.\nOpen the local studio and sign in the blog Codex account.`);
    await note(autopilot, 'waiting for Codex login');
    return;
  }

  if (settings.imageProvider !== 'codex') {
    const geminiOk = geminiPoolConnected();
    if (!geminiOk) {
      await alertOnce(autopilot, 'gemini-login',
        `Content studio: Gemini is not signed in.\nOpen the desk and click Connect Gemini so images stay off the paid Codex account.\nUntil then, new jobs fall back to Codex images.`);
    }
  }

  if (!telegramConfig().token) {
    autopilot.lastError = 'TELEGRAM_BOT_TOKEN missing from .env.local';
  }

  if (remaining > 0 && !publishing) {
    const dropNow = failed.find((job) => isFatalPublishError(job.error) || (autopilot.retries[job.id]?.count || 0) >= MAX_RETRIES);
    if (dropNow) {
      const reason = dropNow.error || autopilot.retries[dropNow.id]?.lastError || 'repeated publish failure';
      await markTopicUsed(dropNow.topic || dropNow.slug || dropNow.title, dropNow.id);
      await quarantineQueueJob(dropNow.id, reason);
      delete autopilot.retries[dropNow.id];
      await note(autopilot, `quarantined ${dropNow.slug || dropNow.id}`);
      await sendTelegram(
        `Quarantined a failed post and moving on.\n"${dropNow.title || dropNow.slug || dropNow.id}"\n${reason}\nStarting a different post. ${publishedToday}/${target} today.`,
      );
      // Fall through so a ready draft or a new writer can start this tick.
    } else {
      const retryable = failed.find((job) => canRetry(autopilot, job.id) && !isFatalPublishError(job.error));
      if (retryable) {
        const images = jobImageCount(retryable.id);
        const args = images >= (retryable.imageTarget || 3) ? [retryable.id, '--resume-publish'] : [retryable.id, '--publish-queued'];
        const record = bumpRetry(autopilot, retryable.id, retryable.error);
        if (record.count >= MAX_RETRIES) {
          await markTopicUsed(retryable.topic || retryable.slug || retryable.title, retryable.id);
          await quarantineQueueJob(retryable.id, retryable.error || record.lastError);
          delete autopilot.retries[retryable.id];
          await note(autopilot, `quarantined ${retryable.slug || retryable.id} after ${MAX_RETRIES} tries`);
          await sendTelegram(
            `Quarantined a failed post after ${MAX_RETRIES} tries and moving on.\n"${retryable.title || retryable.slug || retryable.id}"\n${retryable.error || 'unknown'}\nStarting a different post. ${publishedToday}/${target} today.`,
          );
        } else {
          await upsertQueueJob({ id: retryable.id, status: 'publishing', message: `Autopilot retry ${record.count}/${MAX_RETRIES}…` });
          spawnWorker(args);
          await note(autopilot, `retry ${retryable.slug || retryable.id} (${record.count}/${MAX_RETRIES})`);
          return;
        }
      }
    }

    const nextReady = ready[0];
    if (nextReady) {
      await upsertQueueJob({ id: nextReady.id, status: 'publishing', message: 'Autopilot is publishing a queued post…' });
      spawnWorker([nextReady.id, '--publish-queued']);
      await note(autopilot, `publishing ${nextReady.slug || nextReady.id} (${publishedToday + 1}/${target})`);
      return;
    }
  }

  const topics = await readTopics();
  const availableTopics = readyTopics(topics);
  const missingTypes = missingSlateTypes(topics);
  if (neededDrafts > 0 && (availableTopics.length < 3 || missingTypes.length > 0) && !topicWorkerAlive() && topics.status !== 'researching') {
    spawn(process.execPath, [TOPIC_WORKER, '12'], {
      cwd: ROOT, detached: true, stdio: 'ignore', env: workerEnv(),
    }).unref();
    await note(autopilot, missingTypes.length ? `researching missing slate types: ${missingTypes.join(', ')}` : 'researching topics');
    return;
  }
  if (neededDrafts > 0 && availableTopics.length === 0 && !topicWorkerAlive()) {
    await alertOnce(autopilot, 'no-topics',
      `Content studio needs you.\nNo researched topics left and writers cannot start.\n${publishedToday}/${target} today. Open the studio and click Research topics.`);
    await note(autopilot, 'waiting for topics');
    return;
  }

  if (neededDrafts > 0 && writing < 5 && availableTopics.length > 0) {
    const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const claimed = await claimTopics(1, [id]);
    const assignment = claimed[0];
    const topic = assignment?.query;
    if (topic) {
      await upsertQueueJob({
        ...assignment, id, topic, mode: 'later', status: 'generating',
        stage: 'write', message: `Autopilot is writing “${topic}”…`,
      });
      await claimWordBand(id, assignment);
      spawnWorker([id, topic, '--queue']);
      await note(autopilot, `writing ${topic}`);
      return;
    }
  }

  await note(autopilot, publishing || writing || imaging || neededDrafts > 0
    ? `working · ${publishedToday}/${target} · ${ready.length} ready · ${writing} writing · ${imaging} imaging${stockTarget ? ` · stock ${stock.onHand}/${stockTarget}` : ''}`
    : `watching · ${publishedToday}/${target} remaining ${remaining}`);
}

await tick().catch(async (error) => {
  const autopilot = await readAutopilot();
  await note(autopilot, 'tick failed', { lastError: error instanceof Error ? error.message : String(error) });
});
setInterval(() => tick().catch(() => {}), TICK_MS);

const cleanup = () => writeFile(PID_FILE, '', 'utf8').finally(() => process.exit(0));
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
