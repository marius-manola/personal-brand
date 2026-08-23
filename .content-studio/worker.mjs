import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, unlinkSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { writeExtractedFiles } from './lib/extract-files.mjs';
import { appendPipelineLog } from './lib/pipeline-log.mjs';
import { liveWriteWorkerCount, MAX_PARALLEL_GENERATE, MAX_PARALLEL_IMAGES, upsertQueueJob } from '../lib/content-studio/queue.mjs';
import { claimWordBand, jobWordBand, profileForTopic } from '../lib/content-studio/word-bands.mjs';
import { CLUSTER_PARENTS, CONTENT_TYPES, canonicalCluster } from '../lib/content-studio/editorial-policy.mjs';
import { collisionIssues, formatTakenWork, collectTakenWork } from '../lib/content-studio/inventory.mjs';
import { writeOptimizedBlogImage } from '../scripts/optimize-blog-images.mjs';
import { markTopicUsed, releaseTopicsForJob } from '../lib/content-studio/topics.mjs';
import { queueDistributionHooks, strengthenInternalLinks } from '../lib/content-studio/control-plane.mjs';
import {
  applyConversationReply,
  applySection,
  assemblePost,
  isHollowReply,
  parseBrief,
  parseJsonBlock,
  parseSection,
  splitPost,
  wordCount as countWords,
} from './lib/conversation.mjs';

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');
const STATE_FILE = join(RUNTIME, 'state.json');
const SITE_URL = 'https://www.mariusmanolachi.com';
const jobId = process.argv[2];
const rawArgs = process.argv.slice(3);
const queueOnly = rawArgs.includes('--queue');
const publishQueued = rawArgs.includes('--publish-queued');
const resumePublish = rawArgs.includes('--resume-publish');
const resumeContent = rawArgs.includes('--resume-content');
const topic = rawArgs.filter((arg) => !arg.startsWith('--')).join(' ').trim();
const jobDir = join(RUNTIME, 'jobs', jobId || 'unknown');
const logFile = join(jobDir, 'worker.log');
const STOP_FILE = process.env.CONTENT_STUDIO_STOP || join(RUNTIME, 'stop');
let editorialAssignment = { query: topic };
let wordBand = profileForTopic(editorialAssignment);
let TARGET_IMAGES = wordBand.images;
const ENTITY_FACT_MARKERS = [
  /\bUdemy\b/i,
  /\bOrange\b/,
  /\bNotClass\b/,
  /\bTryUncle\b/,
  /\bOECD\b/,
  /product managers? who (went from|learned)/i,
  /Claude Code (learning )?group/i,
  /Entrepreneur First/i,
];
const BANNED_ENTITY_CLAIMS = [
  /Fortune 500 companies/i,
  /Education 2040/i,
  /Udemy Business partner/i,
  /\b(my|our) (last )?(client|engagement) (at|with)\b/i,
];

function canonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    if (!rel.split(/\s+/).some((value) => value.toLowerCase() === 'canonical')) continue;
    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
  }
  return '';
}
const GEO_SKILL = '/Users/mariusmanola/Code/getfaster/.claude/skills/seo-geo-playbook';
const BLOG_POST_SKILL = '/Users/mariusmanola/Code/davinciresolve21/davinciresolve21-blogpost/.claude/skills';
const DRY_RUN = process.env.CONTENT_STUDIO_DRY_RUN === '1';
const SKIP_IMAGES = process.env.CONTENT_STUDIO_SKIP_IMAGES === '1';
const USE_CODEX = process.env.CONTENT_STUDIO_DRY_RUN !== '1' && process.env.CONTENT_STUDIO_SKIP_CODEX !== '1';
const CODEX_BIN = process.env.CONTENT_STUDIO_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex';
const CODEX_MODEL = process.env.CONTENT_STUDIO_CODEX_MODEL || 'gpt-5.6-luna';
const CODEX_HOME = process.env.CODEX_HOME || process.env.CONTENT_STUDIO_CODEX_HOME || join(RUNTIME, 'codex-home');
const SKILLS_ROOT = process.env.CONTENT_STUDIO_SKILLS || '/Users/mariusmanola/Code/getfaster/ai-consulting-content-studio';
const MAX_REPAIRS = Math.max(1, Number(process.env.CONTENT_STUDIO_MAX_REPAIRS || 50));
const GEMINI_POOL_IDLE_MS = Math.max(60_000, Number(process.env.CONTENT_STUDIO_GEMINI_IDLE_MS || 12 * 60_000));
const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

await mkdir(jobDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class StoppedError extends Error {
  constructor(message = 'Stopped by you.') {
    super(message);
    this.name = 'StoppedError';
  }
}

function isStopped(state) {
  try {
    if (existsSync(STOP_FILE)) return true;
  } catch { /* ignore missing file */ }
  return Boolean(state?.stopped) || state?.error === 'Stopped by you.';
}

async function readState() {
  return JSON.parse(await readFile(STATE_FILE, 'utf8'));
}

async function writeState(patch) {
  const current = await readState().catch(() => ({}));
  if (!queueOnly && !publishQueued && current.id && current.id !== jobId) throw new Error('This job is no longer current.');
  if (isStopped(current) && !patch.allowAfterStop) throw new StoppedError();
  const base = (!queueOnly && !publishQueued) || current.id === jobId ? current : { id: jobId, status: 'running', stage: 'write', log: [] };
  const next = { ...base, ...patch, id: jobId, updatedAt: new Date().toISOString() };
  delete next.allowAfterStop;
  if (patch.logLine) {
    next.log = [...(base.log || []), patch.logLine].slice(-80);
    delete next.logLine;
  }
  const jobState = join(jobDir, 'state.json');
  await writeFile(`${jobState}.tmp`, JSON.stringify(next, null, 2), 'utf8');
  await rename(`${jobState}.tmp`, jobState);
  if (queueOnly || publishQueued) {
    await upsertQueueJob({
      id: jobId,
      topic: topic || undefined,
      mode: queueOnly ? 'later' : 'now',
      status: next.status === 'failed' ? 'failed' : next.queued ? 'ready' : next.status === 'done' ? 'published' : publishQueued ? 'publishing' : next.stage === 'image' ? 'imaging' : 'generating',
      stage: next.stage,
      title: next.title,
      slug: next.slug,
      message: next.message,
      error: next.error,
      pid: process.pid,
      wordBand: wordBand.id,
      wordMin: wordBand.min,
      wordMax: wordBand.max,
      contentType: wordBand.contentType,
      kind: wordBand.kind,
      cluster: editorialAssignment.cluster,
      parentSlug: editorialAssignment.parentSlug,
      evidenceType: editorialAssignment.evidenceType,
      imageTarget: TARGET_IMAGES,
    });
    if (current.id && current.id !== jobId && (current.status === 'running' || current.status === 'waiting')) {
      return next;
    }
  }
  const temporary = `${STATE_FILE}.${jobId}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
  await rename(temporary, STATE_FILE);
  return next;
}

function log(label) {
  const output = createWriteStream(logFile, { flags: 'a' });
  output.write(`[${new Date().toISOString()}] ${label}\n`);
  output.end();
}

async function step(name, detail = '') {
  const line = detail ? `${name} ${detail}` : name;
  await appendPipelineLog(logFile, line);
  await writeState({ logLine: line });
}

function runCodex(prompt, label, options = {}) {
  return new Promise((resolve, reject) => {
    if (isStopped()) {
      reject(new StoppedError());
      return;
    }
    if (!existsSync(CODEX_BIN)) {
      reject(new Error(`Codex binary is missing at ${CODEX_BIN}.`));
      return;
    }
    const effort = options.effort === 'medium' || options.effort === 'low' ? options.effort : 'high';
    const output = createWriteStream(logFile, { flags: 'a' });
    output.write(`\n[${new Date().toISOString()}] ${label}\n`);
    output.write(`CODEX_HOME=${CODEX_HOME} model=${CODEX_MODEL} effort=${effort}\n`);
    const lastMessage = options.lastMessage || join(jobDir, 'codex-last-message.txt');
    const args = [
      'exec',
      '-m', CODEX_MODEL,
      '-c', `model_reasoning_effort="${effort}"`,
      '-c', 'approval_policy="never"',
      '-s', 'workspace-write',
      '--add-dir', SKILLS_ROOT,
      '--add-dir', GEO_SKILL,
      '--add-dir', BLOG_POST_SKILL,
      '-o', lastMessage,
      '-',
    ];
    const child = spawn(CODEX_BIN, args, {
      cwd: ROOT,
      env: { ...process.env, CODEX_HOME },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.write(prompt);
    child.stdin.end();
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    const timer = setInterval(() => {
      if (isStopped()) child.kill('SIGTERM');
    }, 1000);
    child.on('error', (error) => { clearInterval(timer); output.end(); reject(error); });
    child.on('close', (code) => {
      clearInterval(timer);
      output.end();
      if (isStopped()) reject(new StoppedError());
      else if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}.`));
    });
  });
}

function run(command, args, label, environment = {}) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(logFile, { flags: 'a' });
    output.write(`\n[${new Date().toISOString()}] ${label}\n`);
    const childEnvironment = { ...process.env, ...environment };
    for (const [key, value] of Object.entries(childEnvironment)) {
      if (value == null) delete childEnvironment[key];
    }
    const child = spawn(command, args, { cwd: ROOT, env: childEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    child.on('error', (error) => { output.end(); reject(error); });
    child.on('close', (code) => { output.end(); code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}.`)); });
  });
}

function gitTracked(file) {
  return new Promise((resolve) => {
    const child = spawn('git', ['ls-files', '--error-unmatch', '--', file], {
      cwd: ROOT, env: process.env, stdio: 'ignore',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

function hasStagedChanges() {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['diff', '--cached', '--quiet'], { cwd: ROOT, env: process.env, stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(false);
      else if (code === 1) resolve(true);
      else reject(new Error(`Check staged publication exited with code ${code}.`));
    });
  });
}

function wordCount(value) { return countWords(value); }

async function acquireWorkerLock() {
  const lockFile = (queueOnly || publishQueued)
    ? join(jobDir, 'worker.lock')
    : (process.env.CONTENT_STUDIO_LOCK || join(RUNTIME, 'worker.lock'));
  if (queueOnly && liveWriteWorkerCount() >= MAX_PARALLEL_GENERATE) {
    throw new Error(`Already writing ${MAX_PARALLEL_GENERATE} posts. Image jobs do not use writer slots.`);
  }
  if (!queueOnly && !publishQueued) {
    try {
      const pid = Number(await readFile(lockFile, 'utf8'));
      if (pid && pid !== process.pid) {
        try {
          process.kill(pid, 0);
          throw new Error('Another content-studio worker is already running.');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && !String(error.message || '').includes('already running')) throw error;
      if (String(error.message || '').includes('already running')) throw error;
    }
  }
  await mkdir(jobDir, { recursive: true });
  await writeFile(lockFile, String(process.pid), 'utf8');
  const release = () => { try { unlinkSync(lockFile); } catch { /* ignore */ } };
  process.on('exit', release);
  return release;
}

function imageRequestsFor(manifest) {
  const requests = Array.isArray(manifest.images) ? manifest.images : Array.isArray(manifest.imageRequests) ? manifest.imageRequests : [];
  return requests.map((image, index) => ({
    id: String(image.id || ''),
    placeholder: String(image.placeholder || ''),
    role: image.role === 'hero' || index === 0 ? 'hero' : 'inline',
    prompt: String(image.prompt || ''),
    alt: String(image.alt || ''),
  }));
}

async function readStudioSettings() {
  try {
    return JSON.parse(await readFile(join(RUNTIME, 'settings.json'), 'utf8'));
  } catch {
    return {};
  }
}

function imageProviderFrom(settings) {
  return settings?.imageProvider === 'codex' ? 'codex' : 'gemini';
}

function publishDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function stampPublishDates(source, day) {
  const replaceField = (text, field) => {
    const pattern = new RegExp(`^(${field}:\\s*)(['"]?)([^'"\\n]+)(\\2)\\s*$`, 'm');
    if (pattern.test(text)) return text.replace(pattern, `$1$2${day}$4`);
    return text.replace(/^---\n/, `---\n${field}: '${day}'\n`);
  };
  return replaceField(replaceField(source, 'date'), 'updated');
}

function safeImageId(imageId) {
  return String(imageId || 'image').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

async function existingPublicImage(slug, imageId) {
  const safeId = safeImageId(imageId);
  for (const ext of ['png', 'webp', 'jpg', 'jpeg']) {
    const relative = `/blog/${slug}-${safeId}.${ext}`;
    try {
      const bytes = await readFile(join(ROOT, 'public', relative.replace(/^\//, '')));
      if (bytes.length >= 4_000) return relative;
    } catch { /* missing or too small */ }
  }
  return null;
}

async function collectGeneratedImages(imageRequests, existingImages, slug) {
  const byId = new Map();
  for (const image of existingImages || []) {
    if (image?.id && image?.path) byId.set(image.id, image);
  }
  const sidecars = ['codex-images.json'];
  try {
    const files = await readdir(jobDir);
    for (const file of files) {
      if (/^codex-image-.+\.json$/.test(file)) sidecars.push(file);
    }
  } catch { /* job dir listing is optional */ }
  for (const file of sidecars) {
    try {
      const listed = JSON.parse(await readFile(join(jobDir, file), 'utf8'));
      const items = Array.isArray(listed) ? listed : listed?.id ? [listed] : [];
      for (const item of items) {
        if (!item?.id || !item?.path) continue;
        const bytes = await readFile(join(ROOT, 'public', String(item.path).replace(/^\//, ''))).catch(() => null);
        if (!bytes || bytes.length < 4_000) continue;
        const request = imageRequests.find((image) => image.id === item.id);
        byId.set(item.id, {
          id: item.id,
          path: item.path,
          alt: request?.alt || '',
          accountId: 'codex',
          createdAt: byId.get(item.id)?.createdAt || new Date().toISOString(),
        });
      }
    } catch { /* optional sidecar */ }
  }
  for (const request of imageRequests) {
    const current = byId.get(request.id);
    if (current?.path) {
      const bytes = await readFile(join(ROOT, 'public', current.path.replace(/^\//, ''))).catch(() => null);
      if (bytes && bytes.length >= 4_000) continue;
      byId.delete(request.id);
    }
    const found = await existingPublicImage(slug, request.id);
    if (found) {
      byId.set(request.id, {
        id: request.id,
        path: found,
        alt: request.alt,
        accountId: 'codex',
        createdAt: new Date().toISOString(),
      });
    }
  }
  return imageRequests.map((request) => byId.get(request.id)).filter(Boolean);
}

function singleCodexImagePrompt(manifest, image) {
  const filename = `${manifest.slug}-${safeImageId(image.id)}.png`;
  const dest = `public/blog/${filename}`;
  const publicPath = `/blog/${filename}`;
  return `Use the built-in image_gen tool immediately. Do not plan. Do not use the CLI fallback. Do not ask questions. Do not edit any article file.

Generate exactly one editorial raster:
${image.prompt}

Hard constraints: no text, no logos, no watermark, no fake UI, no fake dashboard, no fake chart, no photorealistic people.
After image_gen finishes, copy the selected file from $CODEX_HOME/generated_images to ${dest}. Overwrite ${dest} if it already exists.
The dest file must be a real PNG or WebP, at least 20KB.
Write ${join(jobDir, `codex-image-${safeImageId(image.id)}.json`)} as {"id":${JSON.stringify(image.id)},"path":${JSON.stringify(publicPath)}}
Then exit.`;
}

async function runPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function generateImagesWithCodex(imageRequests, existingImages, manifest) {
  let images = await collectGeneratedImages(imageRequests, existingImages, manifest.slug);
  const maxRounds = 2;
  for (let round = 0; round < maxRounds && images.length < imageRequests.length; round += 1) {
    if (isStopped(await readState().catch(() => ({})))) throw new StoppedError();
    const remaining = imageRequests.filter((request) => !images.some((image) => image.id === request.id));
    await writeState({
      status: 'running',
      stage: 'image',
      imageRequests,
      imageTarget: imageRequests.length,
      images,
      geminiAccountId: undefined,
      geminiImageId: undefined,
      error: undefined,
      message: `Codex is generating ${remaining.length} images in parallel…`,
      logLine: `Codex image round ${round + 1}: ${remaining.length} remaining, ${Math.min(MAX_PARALLEL_IMAGES, remaining.length)} at a time.`,
    });
    const failures = [];
    const generation = runPool(remaining, MAX_PARALLEL_IMAGES, async (image) => {
      if (isStopped()) throw new StoppedError();
      try {
        await runCodex(singleCodexImagePrompt(manifest, image), `Codex image ${image.id}`, {
          effort: 'low',
          lastMessage: join(jobDir, `codex-last-message-${safeImageId(image.id)}.txt`),
        });
      } catch (error) {
        if (error instanceof StoppedError) throw error;
        failures.push(`${image.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    let finished = false;
    generation.then(() => { finished = true; }).catch(() => { finished = true; });
    while (!finished) {
      await Promise.race([generation.catch(() => {}), sleep(3000)]);
      images = await collectGeneratedImages(imageRequests, images, manifest.slug);
      await writeState({
        status: 'running',
        stage: 'image',
        images,
        imageTarget: imageRequests.length,
        message: `Codex has saved ${images.length} of ${imageRequests.length} images…`,
      });
      if (images.length >= imageRequests.length) break;
      if (isStopped(await readState().catch(() => ({})))) throw new StoppedError();
    }
    try {
      await generation;
    } catch (error) {
      if (error instanceof StoppedError) throw error;
      images = await collectGeneratedImages(imageRequests, images, manifest.slug);
      if (images.length < imageRequests.length && round === maxRounds - 1) throw error;
    }
    images = await collectGeneratedImages(imageRequests, images, manifest.slug);
    await writeFile(join(jobDir, 'codex-images.json'), JSON.stringify(images.map((image) => ({
      id: image.id,
      path: image.path,
    })), null, 2), 'utf8');
    if (failures.length) {
      await writeState({
        logLine: `Codex image round ${round + 1} had ${failures.length} failed calls: ${failures.join('; ')}`,
      });
    }
    await writeState({
      status: 'running',
      stage: 'image',
      images,
      imageTarget: imageRequests.length,
      message: images.length >= imageRequests.length
        ? `${images.length} Codex images saved. Publishing next…`
        : `Codex saved ${images.length} of ${imageRequests.length} images. Retrying the rest…`,
      logLine: `Codex image round ${round + 1} finished with ${images.length}/${imageRequests.length} files.`,
    });
  }
  if (images.length < imageRequests.length) {
    throw new Error(`Codex generated only ${images.length} of ${imageRequests.length} images. Keep the blog Codex signed in and try again.`);
  }
  return optimizeSavedImages(images);
}

async function optimizeSavedImages(images) {
  const next = [];
  for (const image of images || []) {
    if (!image?.path) continue;
    try {
      const path = await writeOptimizedBlogImage(
        ROOT,
        image.path,
        await readFile(join(ROOT, 'public', String(image.path).replace(/^\//, ''))),
      );
      next.push({ ...image, path });
    } catch {
      next.push(image);
    }
  }
  return next;
}

async function generateImagesWithGemini(imageRequests, existingImages, manifest) {
  let images = await collectGeneratedImages(imageRequests, existingImages, manifest.slug);
  let lastProgressAt = Date.now();
  let lastCount = images.length;
  await writeState({
    status: 'waiting',
    stage: 'image',
    imageRequests,
    imageTarget: imageRequests.length,
    images,
    geminiAccountId: undefined,
    geminiImageId: undefined,
    error: undefined,
    message: `Waiting for the Gemini account pool (${images.length}/${imageRequests.length} images)…`,
    logLine: `Gemini account pool opened with ${images.length}/${imageRequests.length} images ready.`,
  });
  while (images.length < imageRequests.length) {
    await sleep(2000);
    if (imageProviderFrom(await readStudioSettings()) === 'codex') {
      await writeState({ status: 'running', logLine: 'Images switched to Codex. Leaving the Gemini account pool.' });
      return generateImagesWithCodex(imageRequests, images, manifest);
    }
    const global = await readState().catch(() => ({}));
    let local = {};
    try { local = JSON.parse(await readFile(join(jobDir, 'state.json'), 'utf8')); } catch { /* use global */ }
    if (isStopped(local) || isStopped(global)) throw new StoppedError();
    if (!publishQueued && !queueOnly && global.id && global.id !== jobId) throw new Error('This job was replaced.');
    const fromGlobal = global.id === jobId && Array.isArray(global.images) ? global.images : [];
    const fromLocal = Array.isArray(local.images) ? local.images : [];
    images = await collectGeneratedImages(imageRequests, [...fromLocal, ...fromGlobal, ...images], manifest.slug);
    if (images.length !== lastCount) {
      lastCount = images.length;
      lastProgressAt = Date.now();
      await writeState({
        status: images.length >= imageRequests.length ? 'running' : 'waiting',
        stage: 'image',
        images,
        imageTarget: imageRequests.length,
        message: images.length >= imageRequests.length
          ? `${images.length} Gemini images saved. Publishing next…`
          : `Gemini saved ${images.length} of ${imageRequests.length} images…`,
        logLine: `Gemini account pool progress: ${images.length}/${imageRequests.length}.`,
      });
    }
    if (Date.now() - lastProgressAt >= GEMINI_POOL_IDLE_MS) {
      await writeState({
        status: 'running',
        stage: 'image',
        images,
        geminiAccountId: undefined,
        geminiImageId: undefined,
        message: `Gemini made no progress for ${Math.round(GEMINI_POOL_IDLE_MS / 60_000)} minutes. Codex is finishing the images…`,
        logLine: `Gemini account pool timed out at ${images.length}/${imageRequests.length}; falling back to Codex.`,
      });
      return generateImagesWithCodex(imageRequests, images, manifest);
    }
  }
  return optimizeSavedImages(images);
}

async function siteInventory() {
  return formatTakenWork(collectTakenWork(jobId));
}

let startedThread = false;

function sameChatRules() {
  return `Do not use Codex. Do not write files to disk. Short replies only. Never return an entire article.`;
}

async function askChatGPT(stage, prompt, message) {
  const turnId = crypto.randomUUID();
  const responseFile = join(jobDir, `chatgpt-${turnId}.txt`);
  await writeState({
    status: 'waiting',
    stage,
    chatgptTurnId: turnId,
    chatgptPrompt: prompt,
    chatgptStage: stage,
    chatgptClaimedAt: undefined,
    chatgptSentAt: undefined,
    chatgptCompletedTurnId: undefined,
    chatgptError: undefined,
    continueChat: startedThread,
    newChat: !startedThread,
    error: undefined,
    message,
  });
  await step('queue', `${stage} turn ${turnId}`);

  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(400);
    const state = await readState();
    if (state.id !== jobId) throw new Error('This job was replaced.');
    if (isStopped(state)) throw new StoppedError();
    if (state.chatgptClaimedAt && !state._loggedClaim) {
      await step('claim', `turn ${turnId}`);
      await writeState({ _loggedClaim: true });
    }
    if (state.chatgptError) {
      await step('submit-error', state.chatgptError);
      await writeState({
        chatgptError: undefined,
        chatgptClaimedAt: undefined,
        _loggedClaim: undefined,
        error: undefined,
        message: 'Submit failed. Retrying the same ChatGPT turn…',
      });
      continue;
    }
    try {
      const text = await readFile(responseFile, 'utf8');
      if (text.trim().length > 20) {
        await writeState({
          status: 'running',
          chatgptTurnId: undefined,
          chatgptPrompt: undefined,
          chatgptCompletedTurnId: turnId,
          chatgptError: undefined,
          _loggedClaim: undefined,
          error: undefined,
          message: 'Reading ChatGPT’s answer…',
        });
        await step('receive', `turn ${turnId} ${text.length} characters`);
        startedThread = true;
        return text;
      }
    } catch { /* Answer has not landed yet. */ }
  }
  throw new Error('ChatGPT did not answer in 8 minutes. Keep the ChatGPT window open on chatgpt.com and try again.');
}

async function readArtifacts() {
  const artifacts = {};
  for (const name of ['idea.md', 'research.md', 'post.mdx', 'review.md', 'manifest.json']) {
    try { artifacts[name] = await readFile(join(jobDir, name), 'utf8'); } catch { /* missing */ }
  }
  return artifacts;
}

async function saveArtifacts(artifacts) {
  return writeExtractedFiles(jobDir, artifacts);
}

async function mergeReply(text, options = {}) {
  const before = await readArtifacts();
  const result = applyConversationReply(before, text, options);
  if (!result.applied) {
    await step('extract', `kept previous artifacts (${result.reason || 'hollow'})`);
    return result;
  }
  const written = await saveArtifacts(result.artifacts);
  await step('extract', `merged ${written.join(', ') || 'no files'}`);
  return result;
}

async function verifySourceUrls(urls) {
  const cacheFile = join(jobDir, 'source-checks.json');
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheFile, 'utf8')); } catch { /* first check */ }
  const now = Date.now();
  const results = await Promise.all(urls.map(async (raw) => {
    const url = String(raw);
    const previous = cache[url];
    if (previous?.checkedAt && now - Date.parse(previous.checkedAt) < 24 * 60 * 60 * 1000) return previous;
    try {
      let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(7_000) });
      if (response.status === 405 || response.status === 403) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(7_000) });
      return { url, status: response.status, ok: response.ok, checkedAt: new Date().toISOString() };
    } catch (error) {
      return { url, status: 0, ok: null, error: error instanceof Error ? error.message : String(error), checkedAt: new Date().toISOString() };
    }
  }));
  await writeFile(cacheFile, JSON.stringify(Object.fromEntries(results.map((result) => [result.url, result])), null, 2), 'utf8');
  return results;
}

async function validate() {
  const issues = [];
  const postPath = join(jobDir, 'post.mdx');
  const manifestPath = join(jobDir, 'manifest.json');
  let source = '';
  let manifest = {};
  try { source = await readFile(postPath, 'utf8'); } catch { issues.push('post.mdx is missing'); }
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { issues.push('manifest.json is missing or invalid JSON'); }
  if (!source) return { issues, source, manifest };

  const parsed = matter(source);
  const data = parsed.data;
  const body = parsed.content;
  if (!data.title || String(data.title).length > 72) issues.push('title is missing or longer than 72 characters');
  if (!data.excerpt || String(data.excerpt).length < 100 || String(data.excerpt).length > 170) issues.push('excerpt must be 100-170 characters');
  const answerWords = data.answer ? wordCount(String(data.answer)) : 0;
  if (!data.answer || answerWords < 25 || answerWords > 80) issues.push('Quick Answer must fully answer the query in 25-80 words');
  if (data.author !== 'Marius Manolachi') issues.push('author must be exactly Marius Manolachi');
  if (!data.targetQuery) issues.push('targetQuery is missing');
  if (data.draft !== false) issues.push('draft must be false after review');
  if (data.cover !== '__HERO_IMAGE__') issues.push('cover must be the __HERO_IMAGE__ placeholder');
  if (!data.coverAlt) issues.push('coverAlt is missing');
  if (!Array.isArray(data.sources) || data.sources.length < 3 || data.sources.some((url) => !/^https:\/\//.test(String(url)))) issues.push('at least three valid HTTPS sources are required');
  if (Array.isArray(data.sources)) {
    const checks = await verifySourceUrls(data.sources.filter((url) => /^https:\/\//.test(String(url))).slice(0, 8));
    const dead = checks.filter((check) => check.status === 404 || check.status === 410);
    if (dead.length) issues.push(`dead source URLs: ${dead.map((check) => check.url).join(', ')}`);
  }
  if (!Array.isArray(data.tags) || data.tags.length === 0) issues.push('tags are missing');
  if (!/^##\s+/m.test(body)) issues.push('article has no H2 sections');
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => String(match[1] || '').trim());
  const minimumH2s = wordBand.contentType === 'original-research' ? 6 : 4;
  if (h2s.length < minimumH2s) issues.push(`article has ${h2s.length} H2s; ${wordBand.contentType} needs at least ${minimumH2s} distinct subproblems`);
  const articleWords = wordCount(body);
  if (articleWords > wordBand.max) {
    issues.push(`article has ${articleWords} words; ${wordBand.contentType} should stay ${wordBand.label}. Cut repetition, never evidence`);
  }
  await writeState({ currentWordCount: articleWords, wordBand: wordBand.id, logLine: `word-count ${articleWords} (band ${wordBand.id} ${wordBand.min}-${wordBand.max})` });
  if (/<!--/.test(source)) issues.push('HTML comments are invalid in MDX; use markdown images, not <!-- visual-slot --> comments');
  if (/\b(TODO|TBD|FIXME|lorem ipsum|insert source|placeholder)\b/i.test(source)) issues.push('visible placeholder text remains');
  if (/[—–]/.test(body)) issues.push('em dashes or en dashes remain; rewrite with hyphens or new sentences');
  if (/\b(game-changing|revolutionary|unlock the power|in today'?s rapidly|it is worth noting|moreover|furthermore|delve|cutting-edge|paradigm shift|leverage|robust|streamline)\b/i.test(body)) issues.push('generic or inflated AI prose remains');
  if (BANNED_ENTITY_CLAIMS.some((pattern) => pattern.test(source))) issues.push('banned entity claim: use only locked facts from entity-facts.md');
  const hasTable = /^\|.+\|/m.test(body);
  const hasCode = /```/.test(body);
  const numberedSteps = (body.match(/^\d+\. /gm) || []).length;
  let ideaText = '';
  let researchText = '';
  try { ideaText = await readFile(join(jobDir, 'idea.md'), 'utf8'); } catch { /* optional until written */ }
  try { researchText = await readFile(join(jobDir, 'research.md'), 'utf8'); } catch { /* optional until written */ }
  const contentType = String(data.contentType || '');
  if (!CONTENT_TYPES.includes(contentType)) issues.push(`contentType must be one of ${CONTENT_TYPES.join(', ')}`);
  if (contentType && contentType !== wordBand.contentType) issues.push(`contentType must match the assigned type ${wordBand.contentType}`);
  const cluster = canonicalCluster(data.cluster);
  if (String(data.cluster || '') !== cluster) issues.push(`cluster must be canonical: ${cluster}`);
  const parentSlug = String(editorialAssignment.parentSlug || CLUSTER_PARENTS[cluster] || '');
  const parentPath = parentSlug ? `/blog/${parentSlug}` : '';
  if (!data.parent || String(data.parent) !== parentPath) issues.push(`parent must be the canonical cluster path ${parentPath}`);
  if (!data.evidenceType) issues.push('evidenceType is missing');
  if (!data.evidenceBasis || String(data.evidenceBasis).trim().length < 50) issues.push('evidenceBasis must state what was actually run, built, counted, reproduced, or derived');
  if (!data.sourceableAtom || String(data.sourceableAtom).trim().length < 40) issues.push('sourceableAtom must state the evidence-backed result this URL uniquely supports');
  if (/\b(will|plan to|would|should be|to be measured|to be tested)\b/i.test(String(data.evidenceBasis || ''))) issues.push('evidenceBasis describes future work; the evidence must exist before publication');
  if (/firsthand/i.test(String(data.evidenceType)) && !ENTITY_FACT_MARKERS.some((pattern) => pattern.test(body))) issues.push('firsthand evidenceType requires a matching locked observation from entity-facts.md');
  if (contentType === 'original-research' && (!hasTable || !/method|how we (tested|measured)|limitations?|what we still do not know/i.test(body) || !/observed results?|measurements?|sample size|\bn\s*=\s*\d+/i.test(`${researchText}\n${body}`))) issues.push('original-research needs actual observed results, a result table, method/sample, and limitations');
  if ((contentType === 'decision-tool' || contentType === 'commercial-decision') && !hasTable && numberedSteps < 4) issues.push(`${contentType} needs a worked decision table, scorecard, calculator, or numbered decision procedure`);
  if (contentType === 'failure-clinic' && (!/reproduc|trace|diagnos|root cause/i.test(body) || !/verif|retest|confirm/i.test(body) || (!hasTable && !hasCode && numberedSteps < 4))) issues.push('failure-clinic needs reproduction/trace, diagnosis, repair, and verification evidence');
  if (contentType === 'implementation-lab' && (!hasCode || !/test|output|result|verified|measurement/i.test(body))) issues.push('implementation-lab needs code or configuration plus a test method and observed output');
  if (contentType === 'capability-guide' && (!/exercise|practice/i.test(body) || !/artifact|deliverable|output/i.test(body) || !/transfer|new scenario|without help/i.test(body))) issues.push('capability-guide needs an exercise, a produced artifact, and a transfer check');
  if (!/claim ledger/i.test(researchText) || !/access(?:ed)? date/i.test(researchText) || !/primary|secondary/i.test(researchText) || !/supports?|claim/i.test(researchText)) issues.push('research.md needs a claim ledger mapping each primary/secondary source to supported claims and access dates');
  const atomCorpus = `${ideaText}\n${researchText}\n${String(data.sourceableAtom || '')}\n${body}`;
  if (!/sourceable atom|sourceableAtom/i.test(atomCorpus)) {
    issues.push('name the sourceable atom in idea.md or research.md: the evidence-backed result only this page supports');
  }
  if (wordBand.kind === 'flagship' && String(data.kind || '').toLowerCase() !== 'flagship') issues.push('original-research must use kind: flagship');
  if (wordBand.kind !== 'flagship' && String(data.kind || '').toLowerCase() !== 'satellite') issues.push(`${wordBand.contentType} must use kind: satellite`);
  if (String(data.kind || '').toLowerCase() === 'flagship' && !/method|how we know|limitation|what we still do not know/i.test(body)) {
    issues.push('a flagship needs method, limits, or what you still do not know');
  }
  const faq = Array.isArray(data.faq) ? data.faq : [];
  if (faq.length > 8) issues.push('faq must contain at most 8 question/answer pairs');
  if (faq.some((item) => !item?.q || !item?.a || wordCount(String(item.a)) < 12)) issues.push('each faq item needs a real question and a complete answer');
  const internalLinks = body.match(/\(\/blog\/[a-z0-9-]+\)/g) || [];
  if (new Set(internalLinks).size < 2) issues.push('at least two distinct internal links to existing /blog/ posts are required');
  if (parentPath && !body.includes(`](${parentPath})`)) issues.push(`body must link to its canonical parent ${parentPath}`);
  if (!manifest.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(manifest.slug))) issues.push('manifest slug is missing or invalid');
  if (!manifest.title) issues.push('manifest title is missing');
  const imageRequests = imageRequestsFor(manifest);
  if (imageRequests.length !== TARGET_IMAGES) issues.push(`manifest must contain exactly ${TARGET_IMAGES} useful image requests for ${wordBand.contentType}`);
  const distribution = Array.isArray(manifest.distribution) ? manifest.distribution : [];
  if (distribution.length < 3 || distribution.some((hook) => !hook?.channel || !hook?.audience || !hook?.angle)) issues.push('manifest needs at least three distribution hooks with channel, audience, and angle');
  const ids = new Set();
  const placeholders = new Set();
  imageRequests.forEach((image, index) => {
    if (!image.id || ids.has(image.id)) issues.push(`image request ${index + 1} has a missing or duplicate id`);
    if (!image.prompt || image.prompt.length < 80) issues.push(`image request ${index + 1} needs a specific prompt of at least 80 characters`);
    if (!image.alt) issues.push(`image request ${index + 1} is missing alt text`);
    if (!/^__[A-Z0-9_]+__$/.test(image.placeholder) || placeholders.has(image.placeholder)) issues.push(`image request ${index + 1} needs a unique placeholder token`);
    if (index === 0 && image.placeholder !== '__HERO_IMAGE__') issues.push('the first image request must use placeholder __HERO_IMAGE__');
    if (index === 0 && image.role !== 'hero') issues.push('the first image request must be the hero');
    if (index > 0 && image.role !== 'inline') issues.push(`image request ${index + 1} must be inline`);
    if (image.placeholder && !source.includes(image.placeholder)) issues.push(`post.mdx is missing image placeholder ${image.placeholder}`);
    ids.add(image.id);
    placeholders.add(image.placeholder);
  });
  issues.push(...collisionIssues(jobId, {
    slug: manifest.slug,
    query: data.targetQuery,
    aliases: data.queryAliases,
  }, {
    mode: 'hard',
    ignore: (publishQueued || resumeContent || resumePublish) ? ['same job'] : [],
  }));
  return { issues, source, manifest };
}

async function placeholderImages(imageRequests) {
  const images = [];
  for (const request of imageRequests) {
    const relativePath = `/blog/${request.id || 'image'}-dry-run.png`;
    await mkdir(join(ROOT, 'public', 'blog'), { recursive: true });
    await writeFile(join(ROOT, 'public', relativePath.replace(/^\//, '')), PIXEL_PNG);
    images.push({
      id: request.id,
      path: relativePath,
      alt: request.alt,
      accountId: 'dry-run',
      createdAt: new Date().toISOString(),
    });
  }
  return images;
}

async function publish(result, images) {
  images = await optimizeSavedImages(images);
  const manifest = result.manifest;
  await writeState({ status: 'running', stage: 'publish', error: undefined, message: DRY_RUN ? 'Dry-run: assembling the finished article…' : 'Running the production build…', logLine: DRY_RUN ? 'Dry-run publication started.' : 'Starting publication.' });
  const imageRequests = imageRequestsFor(manifest);
  const completed = new Map(images.map((image) => [image.id, image]));
  let finalPost = result.source;
  for (const request of imageRequests) {
    const image = completed.get(request.id);
    if (!image?.path) throw new Error(`Generated image ${request.id} is missing.`);
    finalPost = finalPost.split(request.placeholder).join(image.path);
  }
  if (/__(?:HERO|INLINE)_IMAGE/.test(finalPost)) throw new Error('An unresolved image placeholder remains in the article.');
  finalPost = stampPublishDates(finalPost, publishDay());
  finalPost = finalPost
    .replace(/<!--\s*visual-slot:\s*(\S+?)(?:\s*\|\s*purpose:\s*([^]*?))?\s*-->/gi, (_match, imagePath, purpose) => `\n![${String(purpose || 'Article illustration').trim()}](${imagePath})\n`)
    .replace(/<!--[\s\S]*?-->/g, '');

  if (DRY_RUN) {
    await writeFile(join(jobDir, 'published.mdx'), finalPost, 'utf8');
    await writeState({
      status: 'done', stage: 'done', error: undefined,
      title: manifest.title, slug: manifest.slug,
      liveUrl: `${SITE_URL}/blog/${manifest.slug}`,
      message: 'Dry-run finished. Article assembled locally and not published.',
      logLine: 'Dry-run wrote published.mdx and skipped git, build, and live verify.',
    });
    return;
  }

  const destination = join(ROOT, 'content', 'blog', `${manifest.slug}.mdx`);
  const relativePost = `content/blog/${manifest.slug}.mdx`;
  if (await gitTracked(relativePost)) {
    const existing = await readFile(destination, 'utf8');
    const existingTitle = existing.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1];
    if (existingTitle && existingTitle !== manifest.title) {
      throw new Error(`A different post already exists at ${relativePost}.`);
    }
  }
  try {
    await writeFile(destination, finalPost, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await readFile(destination, 'utf8');
    const existingTitle = existing.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1];
    if (existingTitle && existingTitle !== manifest.title) {
      throw new Error(`A different post already exists at ${relativePost}.`);
    }
  await writeFile(destination, finalPost, 'utf8');
  }

  const linkStrengthening = await strengthenInternalLinks(manifest.slug);
  await queueDistributionHooks(manifest);
  await writeState({ logLine: `link-graph ${linkStrengthening.changed.length} older posts now link to ${manifest.slug}` });

  await run('npm', ['run', 'build'], 'Production build', {
    NODE_ENV: 'production',
    TURBOPACK: null,
    NEXT_RSPACK: null,
    NEXT_DIST_DIR: '.next-content-studio-build',
  });
  await writeState({ message: 'Build passed. Committing the post and syncing the website…', logLine: 'Production build passed.' });
  const staged = [
    `content/blog/${manifest.slug}.mdx`,
    `public/blog/${manifest.slug}-*`,
    'app/blog', 'app/globals.css', 'app/robots.ts', 'app/sitemap.xml', 'public/sitemap.xsl',
    'lib/server/blog.server.ts', 'public/llms.txt', ...linkStrengthening.changed,
  ];
  await run('git', ['add', '--', ...staged], 'Stage publication');
  if (await hasStagedChanges()) {
    await run('git', ['commit', '-m', `Publish ${manifest.slug}`], 'Commit publication');
  }
  await run('git', ['push', 'origin', 'main'], 'Push publication');

  const liveUrl = `${SITE_URL}/blog/${manifest.slug}`;
  await writeState({ message: 'Changes pushed. Waiting for the live deployment…', logLine: 'Push succeeded; live verification started.' });
  let verified = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(10_000);
    try {
      const response = await fetch(liveUrl, { cache: 'no-store', redirect: 'manual' });
      const html = await response.text();
      const sitemapResponse = await fetch(`${SITE_URL}/sitemap.xml`, { cache: 'no-store', redirect: 'manual' });
      const sitemap = sitemapResponse.ok ? await sitemapResponse.text() : '';
      if (
        response.status === 200
        && canonicalHref(html) === liveUrl
        && html.includes(manifest.title)
        && sitemap.includes(`<loc>${liveUrl}</loc>`)
      ) {
        verified = true;
        break;
      }
    } catch { /* Deployment may not be live yet. */ }
  }
  if (!verified) throw new Error(`The commit was pushed, but ${liveUrl} did not return 200 with a matching self-canonical and sitemap entry within 10 minutes.`);

  try {
    const indexNowArgs = [join(ROOT, 'scripts', 'indexnow.mjs'), '--url', liveUrl, '--url', `${SITE_URL}/blog`];
    for (const changedUrl of linkStrengthening.urls) indexNowArgs.push('--url', changedUrl);
    await run(process.execPath, indexNowArgs, 'IndexNow');
  } catch (error) {
    await writeState({ logLine: `IndexNow skipped: ${error instanceof Error ? error.message : String(error)}` });
  }

  await writeState({
    status: 'done', stage: 'done', error: undefined, message: 'Published and synced with the website.',
    liveUrl, logLine: 'Commit pushed and the live URL returned the expected article.',
  });
}

async function researchPrompt() {
  const inventory = await siteInventory();
  const direction = topic && !topic.startsWith('--') ? topic : '(none — choose the strongest opportunity yourself)';
  return `${sameChatRules()}

Research one high-value query for Marius Manolachi's site. Direction: ${direction}

${inventory}

Ask the candidate query in ChatGPT Search, Perplexity, Google AI Mode / AI Overview, and Gemini. Keep it only if this page can be materially better than the current winners. Do not copy a winner's paragraph shape. Never invent a supporting stat.

Use web search. Return ONLY a JSON object:
{"query":"...","audience":"...","claims":[{"claim":"...","source":"https://...","accessed":"YYYY-MM-DD"}],"engineGap":"...","contribution":"...","risks":["..."]}

No article. No outline. End with ===== TURN_DONE =====`;
}

function briefPrompt(research) {
  return `${sameChatRules()}

Using the research already in this chat, return ONLY a JSON brief:
{"title":"...","slug":"kebab-case","targetQuery":"...","excerpt":"100-170 chars","answer":"complete lift: choice, conditions, exception (25-80 words, site field not a GEO trick)","cta":"...","sources":["https://...","https://..."],"sections":[{"heading":"...","purpose":"..."},{"heading":"...","purpose":"..."},{"heading":"...","purpose":"..."}]}

${wordBand.contentType === 'original-research' ? '6-9' : '4-8'} H2s. There is no word-count minimum. Cover the reader job and evidence completely, stay under ${wordBand.max} body words, and never pad. No article body in this turn. End with ===== TURN_DONE =====

Research snapshot:
${String(research).slice(0, 4000)}`;
}

function sectionPrompt(section, index, total) {
  return `${sameChatRules()}

Write the next H2 only (${index + 1} of ${total}): ${section.heading}
Purpose: ${section.notes || 'Develop this section.'}

Shape: ## heading, then an immediate answer as long as the claim needs (18 words or 120), then evidence and details, then exceptions. Write this section fully. There is no word-count minimum; the whole article must stay under ${wordBand.max} body words. Do not invent a statistic or force a brand citation.
Start with ## ${section.heading}. No YAML header. No other H2s. No whole-article dump. Do not continue a previous section.
${index > 0 && index < TARGET_IMAGES
    ? `Include one image line: ![descriptive alt](__INLINE_IMAGE_${index}__)`
    : 'Do not add an image placeholder in this section.'}
End with ===== SECTION_DONE =====`;
}

function frontmatterPrompt(brief) {
  const today = new Date().toISOString().slice(0, 10);
  return `${sameChatRules()}

The body already exists in the studio. Return schema only, not the article.

===== FRONTMATTER =====
title, date: ${today}, updated: ${today}, excerpt (100-170 chars), answer (25-80 words, complete), targetQuery, queryAliases, intent, funnel, cluster, parent, contentType, kind, sourceableAtom, evidenceType, evidenceBasis, tags, author: "Marius Manolachi", nextReviewAt, sources (at least five https URLs), optional faq, cover: "__HERO_IMAGE__", coverAlt, draft: false

===== FILE: manifest.json =====
{"slug":"${brief.slug || 'article'}","title":"${brief.title || ''}","summary":"...","distribution":[at least 3 {"channel":"...","audience":"...","angle":"..."}],"images":[exactly ${TARGET_IMAGES} objects; first role hero placeholder __HERO_IMAGE__; remaining inline placeholders numbered consecutively; each needs id, role, placeholder, prompt (>=80 chars), alt]}

===== FILE: review.md =====
short gate notes

End with ===== TURN_DONE =====`;
}

function patchPrompt(issues) {
  return `${sameChatRules()}

Validator says:
- ${issues.join('\n- ')}

Change only those. Return a patch, not the file.
Use ===== FRONTMATTER ===== for metadata, ===== SECTION: Exact H2 ===== for one section, and ===== FILE: manifest.json ===== only if the image plan is wrong.
Do not return the entire article. Stay in this chat. End with ===== TURN_DONE =====`;
}

async function waitForImages(imageRequests, existingImages, manifest) {
  if (SKIP_IMAGES) {
    const images = await placeholderImages(imageRequests);
    await writeState({
      status: 'running', stage: 'image', imageRequests, imageTarget: imageRequests.length, images,
      message: 'Dry-run: skipped Gemini and used placeholder images.',
      logLine: `SKIP_IMAGES filled ${images.length} placeholder images.`,
    });
    return images;
  }
  if (imageProviderFrom(await readStudioSettings()) === 'codex') {
    return generateImagesWithCodex(imageRequests, existingImages, manifest);
  }

  return generateImagesWithGemini(imageRequests, existingImages, manifest);
}

async function writeSection(heading, markdown) {
  const artifacts = await readArtifacts();
  const post = splitPost(artifacts['post.mdx'] || '');
  artifacts['post.mdx'] = assemblePost(post.data, applySection(post.body, heading, markdown));
  await saveArtifacts(artifacts);
}

async function loadSavedBrief() {
  try {
    const source = await readFile(join(jobDir, 'idea.md'), 'utf8');
    const asJson = JSON.parse(source);
    if (Array.isArray(asJson.sections) && asJson.sections.length) return asJson;
  } catch { /* try chat-shaped brief next */ }
  try {
    return parseBrief(await readFile(join(jobDir, 'idea.md'), 'utf8'));
  } catch {
    return null;
  }
}

async function runSectionPipeline() {
  const savedBrief = await loadSavedBrief();
  if (savedBrief?.sections?.length) {
    await step('extract', `resuming from saved brief with ${savedBrief.sections.length} sections`);
    await writeState({ status: 'running', stage: 'write', title: savedBrief.title, slug: savedBrief.slug, message: 'Resuming section writing in the same chat…' });
    await writeFile(join(jobDir, 'post.mdx'), assemblePost({
      title: savedBrief.title || 'Draft',
      date: new Date().toISOString().slice(0, 10),
      author: 'Marius Manolachi',
      draft: false,
      cover: '__HERO_IMAGE__',
      sources: savedBrief.sources || [],
      tags: ['AI agents'],
      targetQuery: savedBrief.targetQuery,
      excerpt: savedBrief.excerpt,
      answer: savedBrief.answer,
    }, ''), 'utf8');
    for (const [index, section] of savedBrief.sections.slice(0, 5).entries()) {
      let sectionText = await askChatGPT('write', sectionPrompt(section, index, savedBrief.sections.length), `Writing H2 ${index + 1}/${savedBrief.sections.length}: ${section.heading}`);
      let parsed = parseSection(sectionText);
      if (!parsed) {
        await step('extract', `hollow section “${section.heading}”; retrying`);
        sectionText = await askChatGPT('write', sectionPrompt(section, index, savedBrief.sections.length), `Retrying H2: ${section.heading}`);
        parsed = parseSection(sectionText);
      }
      if (!parsed) {
        await step('extract', `kept previous body; hollow section “${section.heading}” ignored`);
        continue;
      }
      await writeSection(section.heading, parsed);
      await step('extract', `section ${index + 1}/${savedBrief.sections.length} ${section.heading}`);
    }
    const frontmatterText = await askChatGPT('write', frontmatterPrompt(savedBrief), 'Asking ChatGPT for frontmatter and image plan only…');
    const merged = await mergeReply(frontmatterText);
    if (!merged.applied) await step('extract', 'frontmatter reply was hollow; kept stub metadata');
    return;
  }

  await writeState({ status: 'running', stage: 'research', message: 'Researching in the open ChatGPT chat…' });
  let researchText = await askChatGPT('research', await researchPrompt(), 'ChatGPT is building a short claim ledger…');
  if (isHollowReply(researchText)) {
    await step('extract', 'hollow research reply ignored');
    researchText = await askChatGPT('research', await researchPrompt(), 'Retrying research; previous reply was empty…');
  }
  const research = parseJsonBlock(researchText) || { raw: researchText };
  await writeFile(join(jobDir, 'research.md'), typeof research.raw === 'string' ? researchText : `${JSON.stringify(research, null, 2)}\n`, 'utf8');
  await step('extract', 'research ledger saved');

  await writeState({ status: 'running', stage: 'idea', message: 'Asking ChatGPT for a short brief…' });
  let briefText = await askChatGPT('idea', briefPrompt(researchText), 'ChatGPT is outlining H2s…');
  let brief = parseBrief(briefText);
  if (!brief?.sections?.length) {
    await step('extract', 'brief missing sections; retrying');
    briefText = await askChatGPT('idea', briefPrompt(researchText), 'Retrying the brief…');
    brief = parseBrief(briefText);
  }
  if (!brief?.sections?.length) throw new Error('ChatGPT did not return a usable brief with H2s.');
  brief.sections = brief.sections.slice(0, 5);
  await writeFile(join(jobDir, 'idea.md'), `${JSON.stringify(brief, null, 2)}\n`, 'utf8');
  await step('extract', `brief with ${brief.sections.length} sections`);

  await writeState({ status: 'running', stage: 'write', title: brief.title, slug: brief.slug, message: 'Writing one H2 at a time…' });
  await writeFile(join(jobDir, 'post.mdx'), assemblePost({
    title: brief.title || 'Draft',
    date: new Date().toISOString().slice(0, 10),
    author: 'Marius Manolachi',
    draft: false,
    cover: '__HERO_IMAGE__',
    sources: brief.sources || [],
    tags: ['AI agents'],
    targetQuery: brief.targetQuery,
    excerpt: brief.excerpt,
    answer: brief.answer,
  }, ''), 'utf8');

  for (const [index, section] of brief.sections.entries()) {
    let sectionText = await askChatGPT('write', sectionPrompt(section, index, brief.sections.length), `Writing H2 ${index + 1}/${brief.sections.length}: ${section.heading}`);
    let parsed = parseSection(sectionText);
    if (!parsed) {
      await step('extract', `hollow section “${section.heading}”; retrying`);
      sectionText = await askChatGPT('write', sectionPrompt(section, index, brief.sections.length), `Retrying H2: ${section.heading}`);
      parsed = parseSection(sectionText);
    }
    if (!parsed) {
      await step('extract', `kept previous body; hollow section “${section.heading}” ignored`);
      continue;
    }
    await writeSection(section.heading, parsed);
    await step('extract', `section ${index + 1}/${brief.sections.length} ${section.heading}`);
  }

  const frontmatterText = await askChatGPT('write', frontmatterPrompt(brief), 'Asking ChatGPT for frontmatter and image plan only…');
  const merged = await mergeReply(frontmatterText);
  if (!merged.applied) await step('extract', 'frontmatter reply was hollow; kept stub metadata');
}

async function repairWithPatches() {
  await writeState({ stage: 'review', message: 'Running the deterministic gate…' });
  let result = await validate();
  await step('validate', result.issues.length ? `${result.issues.length} issues: ${result.issues.join('; ')}` : '0 issues');
  let attempt = 0;
  while (result.issues.length && attempt < MAX_REPAIRS) {
    attempt += 1;
    await step('repair', `${attempt}: ${result.issues.join('; ')}`);
    await writeState({ message: `Patching ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'} in the same chat…` });
    const patchText = await askChatGPT('review', patchPrompt(result.issues), 'ChatGPT is returning a patch, not a rewrite…');
    const merged = await mergeReply(patchText);
    if (!merged.applied) await step('extract', 'hollow repair ignored; accumulated article kept');
    result = await validate();
    await step('validate', result.issues.length ? `${result.issues.length} issues: ${result.issues.join('; ')}` : '0 issues');
  }
  if (result.issues.length) {
    await step('validate', `still broken after ${attempt} repairs: ${result.issues.join('; ')}`);
    throw new Error(`The article still has publishing blockers after ${attempt} repairs: ${result.issues.join('; ')}`);
  }
  return result;
}

function codexCreatePrompt(direction, inventory) {
  const assigned = direction && !direction.startsWith('--');
  const chosen = assigned ? direction : '(no assigned topic — this should not happen; pick an unused query from the inventory below)';
  return `Create exactly one publishable, evidence-backed blog post for Marius Manolachi's personal site.

LOCAL RUNTIME POLICY BELOW OVERRIDES OLDER LENGTH, IMAGE, CONTENT-MIX, OR UNIVERSAL-FIRSTHAND RULES IN THE MOUNTED REFERENCES.

Assigned query — write THIS query, not a neighbor and not a stronger-looking taken query:
${chosen}

Assigned editorial contract:
- contentType: ${wordBand.contentType}
- kind: ${wordBand.kind}
- cluster: ${editorialAssignment.cluster || 'derive one canonical cluster from the assigned query'}
- parent: /blog/${editorialAssignment.parentSlug || CLUSTER_PARENTS[canonicalCluster(editorialAssignment.cluster)]}
- evidenceType: ${editorialAssignment.evidenceType || 'choose the most honest type allowed by this contract'}
- evidencePlan: ${editorialAssignment.evidencePlan || 'produce and document the type-specific evidence before drafting'}
- evidenceReadyCondition: ${editorialAssignment.evidenceReadyCondition || 'a reproducible artifact or observed result exists in research.md'}
- planned distribution hooks: ${JSON.stringify(editorialAssignment.distributionHooks || [])}
- body length: no fixed minimum; complete the evidence and reader job; maximum ${wordBand.max} words
- useful images: exactly ${TARGET_IMAGES}

${inventory}

Read completely before writing:
- ${join(SKILLS_ROOT, 'CONTENT_STUDIO.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/SKILL.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/information-gain.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/entity-facts.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/geo-seo.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/research-and-evidence.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/review-gate.md')}
- ${join(SKILLS_ROOT, 'skills/gary-provost/SKILL.md')}
- ${join(SKILLS_ROOT, 'skills/gary-provost/references/anti-ai-patterns.md')}
- ${join(GEO_SKILL, 'SKILL.md')}
- ${join(BLOG_POST_SKILL, 'blog-post/SKILL.md')} for GEO structure only (ignore DaVinci-specific product rules)

This page must be ingested by answer engines AND rank for one query. Write one artifact that satisfies both. It must be attributable to Marius Manolachi using only locked entity facts.

AI makes writing free. Evidence is scarce. Create evidence for the web. Package it into highly extractable answers. This URL must create at least one sourceable atom: an observed result or usable artifact another author could only support by citing this page. A declared sentence, coined framework, or unsupported synthesis is not evidence. Do not cargo-cult Reddit, FAQ schema, question H2s, fixed-length leads, supporting stats, or named brands as GEO. Own the finding here.

Hard rules:
- Quick Answer fully answers the query in 25-80 words: choice, conditions, principal exception. That band is a site field, not a citation tactic
- Each H2 owns one subproblem. Question form only when people actually ask that subquestion. Shape: heading → immediate answer → evidence/details → exceptions. Answer length follows the claim (18 words or 120). No section word quota
- Score each important H2: answerable, extractable, evidenced, better than what ranks, source-worthy. Fail extractable-but-generic
- Default 5 primary HTTPS sources, minimum 3, cited inline. Use the best evidence for the claim. Never invent a supporting stat. Never force "According to OpenAI" or another brand as implied authority. Prefer a locked Marius observation or experiment when that is the novel evidence
- Quote a public source only when exact wording matters
- Evidence containers (decision rule, definition, procedure, measured result), not a quota of bold lines
- FAQ only for genuine follow-ups; omit rather than recap H2s
- At least two internal links to existing /blog/ slugs. One must be the assigned canonical parent
- THIS ${wordBand.contentType} post has no word-count minimum and a ${wordBand.max}-word ceiling. Add only evidence, worked decisions, failure modes, prerequisites, exceptions, or what-if branches that help the reader. Never repeat or pad
- Name the sourceable atom and evidence basis in idea.md, research.md, and frontmatter. Put the observed result or artifact near the top. Never use future work or a named mnemonic to pass the gate
- original-research: result table, method, limitations, and only measurements actually performed
- decision-tool: worked scorecard, calculator, rubric, decision tree, or comparison with thresholds
- failure-clinic: reproduction/trace, diagnosis, repair, and verification
- implementation-lab: code/configuration, test method, and observed output
- capability-guide: exercise, produced artifact, and transfer check on a new scenario
- commercial-decision: worked economics, scope, risk, or make/buy decision artifact
- Use a locked firsthand observation only when evidenceType is firsthand. Never invent clients, Fortune 500 rosters, OECD membership, quotes, statistics, tests, or credentials
- No em dashes, no emojis, no AI cliches
- Keyword-forward slug that mirrors the query
- Stage-appropriate CTA; the article is complete without it
- Name Marius Manolachi and other entities consistently

Browse current primary sources. Build a claim ledger before writing.

Work only inside ${jobDir}. Do not edit the site, run git, publish, or create an image.

Produce these exact files:
1. idea.md — query, audience, pre-state, post-state, contentType, kind, cluster, parentSlug, sourceableAtom, evidenceType, evidencePlan, evidenceReadyCondition, collision reasoning, engine gap, and opportunity score.
2. research.md — engine inspection; primary-source claim ledger with access date; evidence method, actual artifact/results, limitations, sourceableAtom, locked entity facts if used, and freshness risks. If the ready condition is not met, reject the topic instead of drafting.
3. post.mdx — complete blog post. Required frontmatter: title (<=72 chars, query words first), date, updated, excerpt (100-170 chars), answer (25-80 words, complete), targetQuery, queryAliases, intent, funnel, cluster, parent, contentType, kind, sourceableAtom, evidenceType, evidenceBasis, tags, author "Marius Manolachi", nextReviewAt, sources (at least three https URLs, prefer five), optional faq, cover: "__HERO_IMAGE__", coverAlt, draft: false. Cite material claims inline. Use no H1. There is no word-count minimum; stay under ${wordBand.max} words and stop when the evidence and reader job are complete.
4. review.md — deterministic blockers/warnings, 10-dimension score, claims checked, evidence ready-condition verification, verdict. Fix until zero blockers, every dimension >=3, total >=40/50, verdict approve.
5. manifest.json — valid JSON: {"slug":"...","title":"...","summary":"...","distribution":[at least 3 objects with channel, audience, angle],"images":[exactly ${TARGET_IMAGES} useful objects; first role hero placeholder __HERO_IMAGE__; remaining inline placeholders consecutively numbered; each needs id, role, placeholder, prompt (>=80 chars), alt starting with Illustration of]}

Do not stop at an outline. Finish and self-repair all five artifacts.`;
}

function codexRepairPrompt(issues) {
  return `Repair the existing article in ${jobDir} until it passes the local publishing gate.

Read and follow:
- ${join(SKILLS_ROOT, 'CONTENT_STUDIO.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/SKILL.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/information-gain.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/entity-facts.md')}
- the sibling Gary Provost skill

The local validator still reports:
- ${issues.join('\n- ')}

Edit only the files in ${jobDir}. Do not edit the live site, run git, or generate images.
Keep post.mdx in this ${wordBand.contentType} contract: no word-count minimum and a ${wordBand.max}-word ceiling. Add only missing evidence or reader decisions. If it is long, cut repetition, not evidence. Do not pad.
Keep exactly ${TARGET_IMAGES} image requests in manifest.json.
Preserve: complete Quick Answer (25-80 words, site field not a GEO trick), completed evidence basis, named sourceable atom, type-specific artifact, primary sources, canonical parent plus another internal link, three distribution hooks, no em dashes, no banned entity claims. Require a locked firsthand observation only when evidenceType is firsthand.
Do not manufacture a supporting statistic or force a brand citation to look citable. Keep H2s as heading → immediate answer → evidence → exceptions. Fail extractable-but-generic sections.
Do not stop until the blockers above are gone.`;
}

async function runCodexPipeline() {
  await writeState({
    status: 'running',
    stage: 'write',
    error: undefined,
    message: `Codex is writing with ${CODEX_MODEL} on high thinking…`,
    logLine: `Codex ${CODEX_MODEL} high thinking started.`,
  });
  await runCodex(codexCreatePrompt(topic, await siteInventory()), 'Codex content creation');
  await step('extract', 'Codex finished the job directory');
}

async function repairWithCodex() {
  await writeState({ stage: 'review', message: 'Running the deterministic gate…' });
  let result = await validate();
  await step('validate', result.issues.length ? `${result.issues.length} issues: ${result.issues.join('; ')}` : '0 issues');
  let attempt = 0;
  while (result.issues.length && attempt < MAX_REPAIRS) {
    attempt += 1;
    await step('repair', `${attempt}: ${result.issues.join('; ')}`);
    await writeState({ message: `Codex is repairing ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}…` });
    await runCodex(codexRepairPrompt(result.issues), `Codex repair ${attempt}`);
    result = await validate();
    await step('validate', result.issues.length ? `${result.issues.length} issues: ${result.issues.join('; ')}` : '0 issues');
  }
  if (result.issues.length) {
    await step('validate', `still broken after ${attempt} repairs: ${result.issues.join('; ')}`);
    throw new Error(`The article still has publishing blockers after ${attempt} repairs: ${result.issues.join('; ')}`);
  }
  return result;
}

async function ensureWordBand() {
  try {
    const queue = JSON.parse(await readFile(join(RUNTIME, 'queue.json'), 'utf8'));
    const job = (queue.jobs || []).find((item) => item.id === jobId);
    const existing = jobWordBand(job);
    if (existing) {
      editorialAssignment = { ...editorialAssignment, ...job };
      wordBand = existing;
      TARGET_IMAGES = existing.images;
      return existing;
    }
  } catch { /* claim below */ }
  wordBand = await claimWordBand(jobId, editorialAssignment);
  TARGET_IMAGES = wordBand.images;
  return wordBand;
}

async function main() {
  if (isStopped(await readState().catch(() => ({})))) throw new StoppedError();
  await acquireWorkerLock();
  await ensureWordBand();
  if (resumePublish) {
    const state = await readState();
    let result = await validate();
    if (result.issues.length) result = USE_CODEX ? await repairWithCodex() : await repairWithPatches();
    const images = Array.isArray(state.images) ? state.images : [];
    if (images.length < TARGET_IMAGES) throw new Error(`Only ${images.length} of ${TARGET_IMAGES} images are available.`);
    await publish(result, images);
    return;
  }

  let result;
  if (publishQueued) {
    await writeState({ status: 'running', stage: 'review', error: undefined, message: 'Publishing a queued post…' });
    result = await validate();
    if (result.issues.length) result = USE_CODEX ? await repairWithCodex() : await repairWithPatches();
  } else if (resumeContent) {
    await writeState({ status: 'running', stage: 'review', error: undefined, message: USE_CODEX ? 'Codex is repairing the saved article…' : 'Patching the saved article…' });
    result = USE_CODEX ? await repairWithCodex() : await repairWithPatches();
  } else {
    if (USE_CODEX) await runCodexPipeline();
    else await runSectionPipeline();
    result = USE_CODEX ? await repairWithCodex() : await repairWithPatches();
  }
  const manifest = result.manifest;
  const imageRequests = imageRequestsFor(manifest);
  let previousState = await readState().catch(() => ({}));
  if (publishQueued || queueOnly) {
    try { previousState = JSON.parse(await readFile(join(jobDir, 'state.json'), 'utf8')); } catch { /* use global */ }
  }
  const allowedIds = new Set(imageRequests.map((image) => image.id));
  const existingImages = Array.isArray(previousState.images)
    ? previousState.images.filter((image) => allowedIds.has(image.id))
    : [];
  await markTopicUsed(topic || manifest.slug, jobId);
  const imageProvider = SKIP_IMAGES ? 'skip' : imageProviderFrom(await readStudioSettings());
  const remainingCount = Math.max(0, imageRequests.length - existingImages.length);
  await writeState({
    status: imageProvider === 'gemini' ? 'waiting' : 'running',
    stage: 'image',
    queued: false,
    title: manifest.title,
    slug: manifest.slug,
    imagePrompt: imageRequests[0].prompt,
    imageAlt: imageRequests[0].alt,
    imageRequests,
    imageTarget: imageRequests.length,
    images: existingImages,
    geminiAccountId: undefined,
    geminiImageId: undefined,
    error: undefined,
    message: imageProvider === 'skip'
      ? 'Article approved. Using placeholder images for the dry-run…'
      : imageProvider === 'codex'
        ? `Article approved. Codex is generating ${remainingCount} remaining images…`
        : `Article approved. Waiting for ${remainingCount} images from the signed-in Gemini account pool.`,
    logLine: `Article approved at ${wordCount(matter(result.source).content).toLocaleString()} words. ${imageRequests.length} image jobs via ${imageProvider === 'codex' ? 'Codex' : 'Gemini-first'}.`,
  });

  const images = await waitForImages(imageRequests, existingImages, manifest);
  if (queueOnly) {
    await writeState({
      status: 'done',
      stage: 'done',
      queued: true,
      title: manifest.title,
      slug: manifest.slug,
      images,
      imageTarget: imageRequests.length,
      error: undefined,
      message: `Ready for later: ${manifest.title}. Images are done. Not public yet.`,
      logLine: `Queued ${manifest.slug} with ${images.length} images. Public date is stamped on publish day.`,
    });
    return;
  }
  await publish(result, images);
}

main().catch(async (error) => {
  const stopped = error instanceof StoppedError || error?.name === 'StoppedError' || isStopped();
  if (stopped) {
    await writeState({
      allowAfterStop: true,
      status: 'failed',
      stage: 'failed',
      stopped: true,
      message: 'Stopped. Draft files were kept.',
      error: 'Stopped by you.',
      chatgptTurnId: undefined,
      chatgptPrompt: undefined,
      chatgptClaimedAt: undefined,
      logLine: 'Stopped by you.',
    }).catch(() => {});
    await releaseTopicsForJob(jobId, topic).catch(() => {});
    process.exitCode = 0;
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  await writeState({ status: 'failed', stage: 'failed', message: 'The run stopped before publishing.', error: message, logLine: message }).catch(() => {});
  await releaseTopicsForJob(jobId, topic).catch(() => {});
  process.exitCode = 1;
});
