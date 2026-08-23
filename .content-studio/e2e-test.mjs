import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractFiles, writeExtractedFiles } from './lib/extract-files.mjs';
import { receiveChatGPTAnswer } from './lib/receive-answer.mjs';
import { applyConversationReply, assemblePost, isHollowReply } from './lib/conversation.mjs';

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');
const STATE_FILE = join(RUNTIME, 'state.json');
const WORKER = join(RUNTIME, 'worker.mjs');
const failures = [];
let passed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function record(name, error) {
  if (error) {
    failures.push({ name, error: error instanceof Error ? error.message : String(error) });
    console.log(`FAIL  ${name}\n      ${error instanceof Error ? error.message : error}`);
  } else {
    passed += 1;
    console.log(`PASS  ${name}`);
  }
}

function sentence() {
  return 'A contained worker still needs a named owner, a written stop rule, and a way to revoke tool access without a full redeploy. ';
}

function pad(minWords) {
  const chunk = sentence();
  let text = '';
  while (text.trim().split(/\s+/).filter(Boolean).length < minWords) text += chunk;
  return `${text.trim()} Extra containment detail.`;
}

function validManifest(slug, title) {
  const images = [{
    id: 'hero',
    role: 'hero',
    placeholder: '__HERO_IMAGE__',
    alt: 'A control boundary sitting between an agent proposal and an external action',
    prompt: 'Create a useful 16:9 landscape editorial illustration of a geometric agent process reaching a strong central control boundary, then splitting into a narrow automatic path and a paused human-controlled gate. Precise geometric editorial style, restrained navy, warm amber, off-white, generous negative space. No text, logos, watermark, interface, chart, or photorealistic people.',
  }];
  for (let index = 1; index <= 7; index += 1) {
    images.push({
      id: `inline-${index}`,
      role: 'inline',
      placeholder: `__INLINE_IMAGE_${index}__`,
      alt: `Editorial diagram ${index} explaining one decision in the article`,
      prompt: `Create a useful 16:9 landscape editorial illustration number ${index} that explains a distinct decision step with geometric shapes, restrained navy and amber, generous negative space, and no text, logos, watermark, fake UI, fake chart, customer evidence, or photorealistic people in the composition.`,
    });
  }
  return JSON.stringify({ slug, title, summary: 'A dry-run article used only to exercise the local content studio writing loop.', images }, null, 2);
}

function validPost({ slug, title, words = 2800, draft = false }) {
  const excerpt = 'Use a written stop rule, a named owner, and a narrow tool list before an agent is allowed to act outside a review boundary.';
  const body = [
    'Start with the smallest system that can do the job safely. An agent is not a default architecture. When I taught product managers who went from writing specs to shipping, the failure was almost never the model. It was that nobody owned the stop rule.',
    '',
    'See also the [AI agent decision framework](/blog/when-to-use-an-ai-agent).',
    '',
    '1. Name the owner.',
    '2. Write the stop rule.',
    '3. Narrow the tools.',
    '4. Test the failure path.',
    '',
    '## Why the boundary comes first',
    '',
    '![A control boundary before any external action](__INLINE_IMAGE_1__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Name the owner before the tools',
    '',
    '![A named owner standing outside the agent loop](__INLINE_IMAGE_2__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Write the stop rule',
    '',
    '![A stop rule attached to the agent loop](__INLINE_IMAGE_3__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Narrow the tool list',
    '',
    '![A short tool list beside a blocked extra tool](__INLINE_IMAGE_4__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Keep the review packet small',
    '',
    '![A compact review packet instead of a transcript dump](__INLINE_IMAGE_5__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Test the failure paths',
    '',
    '![Adversarial tests around one protected executor](__INLINE_IMAGE_6__)',
    '',
    pad(Math.ceil(words / 7)),
    '',
    '## Change policy from evidence',
    '',
    '![An operations loop feeding a narrow policy change](__INLINE_IMAGE_7__)',
    '',
    pad(Math.ceil(words / 7)),
  ].join('\n');

  return `---
title: '${title}'
date: '2026-08-16'
updated: '2026-08-16'
excerpt: '${excerpt}'
answer: 'Give an agent a named owner, a written stop rule, a narrow tool list, and a review boundary before it can cause an external effect. Expand permissions only after the failure paths have been tested.'
targetQuery: 'how to contain an AI agent'
queryAliases:
  - 'AI agent containment'
intent: 'commercial investigation'
funnel: 'consideration'
cluster: 'AI agent architecture'
kind: 'satellite'
sourceableAtom: 'An agent should not get write access until a named owner, a stop rule, and a tested failure path exist.'
tags:
  - 'AI agents'
  - 'Operations'
author: 'Marius Manolachi'
nextReviewAt: '2027-02-16'
sources:
  - 'https://www.anthropic.com/engineering/building-effective-agents'
  - 'https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/'
  - 'https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html'
cover: '__HERO_IMAGE__'
coverAlt: 'A control boundary sitting between an agent proposal and an external action'
draft: ${draft}
---

${body}
`;
}

function researchJson() {
  return `{"query":"how to contain an AI agent","audience":"operators","claims":[{"claim":"Start simple","source":"https://www.anthropic.com/engineering/building-effective-agents","accessed":"2026-08-16"}],"contribution":"A stop-rule framework","risks":["tooling changes"]}
===== TURN_DONE =====`;
}

function briefJson() {
  return `{"title":"Contain an AI Agent Before It Acts","slug":"contain-an-ai-agent-before-it-acts","targetQuery":"how to contain an AI agent","excerpt":"Use a written stop rule, a named owner, and a narrow tool list before an agent is allowed to act outside a review boundary.","answer":"Give an agent a named owner, a written stop rule, a narrow tool list, and a review boundary before it can cause an external effect.","cta":"/learn-ai","sources":["https://www.anthropic.com/engineering/building-effective-agents","https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/"],"sections":[{"heading":"Why the boundary comes first","purpose":"Set the stakes"},{"heading":"Name the owner before the tools","purpose":"Accountability"},{"heading":"Write the stop rule","purpose":"Containment"}]}
===== TURN_DONE =====`;
}

function sectionBody(heading, extras = '') {
  return `## ${heading}

![A useful editorial diagram](__INLINE_IMAGE_1__)

${pad(800)}
${extras}
===== SECTION_DONE =====`;
}

function frontmatterPackage({ draft = false } = {}) {
  return `===== FRONTMATTER =====
title: "Contain an AI Agent Before It Acts"
date: "2026-08-16"
updated: "2026-08-16"
excerpt: "Use a written stop rule, a named owner, and a narrow tool list before an agent is allowed to act outside a review boundary."
answer: "Give an agent a named owner, a written stop rule, a narrow tool list, and a review boundary before it can cause an external effect."
targetQuery: "how to contain an AI agent"
queryAliases:
  - "AI agent containment"
intent: "commercial investigation"
funnel: "consideration"
cluster: "AI agent architecture"
tags:
  - "AI agents"
  - "Operations"
author: "Marius Manolachi"
nextReviewAt: "2027-02-16"
sources:
  - "https://www.anthropic.com/engineering/building-effective-agents"
  - "https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/"
cover: "__HERO_IMAGE__"
coverAlt: "A control boundary sitting between an agent proposal and an external action"
draft: ${draft}
===== FILE: manifest.json =====
${validManifest('contain-an-ai-agent-before-it-acts', 'Contain an AI Agent Before It Acts')}
===== FILE: review.md =====
Approve. Focused reference.
===== TURN_DONE =====`;
}

function sectionResponder({ breakFrontmatter = false } = {}) {
  let frontmatterTries = 0;
  return async (state) => {
    const prompt = state.chatgptPrompt || '';
    if (state.chatgptStage === 'research') return researchJson();
    if (state.chatgptStage === 'idea') return briefJson();
    if (state.chatgptStage === 'write' && /===== FRONTMATTER =====|Return schema only/.test(prompt)) {
      frontmatterTries += 1;
      return frontmatterPackage({ draft: breakFrontmatter && frontmatterTries === 1 });
    }
    if (state.chatgptStage === 'write') {
      const heading = (prompt.match(/Write the next H2 only[^\n]*:\s*(.+)/) || [,'Section'])[1].trim();
      const index = Number((prompt.match(/H2 only \((\d+)/) || [])[1] || 1);
      const extras = index === 3
        ? [2, 3, 4, 5, 6, 7].map((n) => `![diagram ${n}](__INLINE_IMAGE_${n}__)`).join('\n\n')
        : (index > 1 ? `![diagram ${index}](__INLINE_IMAGE_${index}__)` : '');
      return sectionBody(heading, extras);
    }
    if (state.chatgptStage === 'review') return frontmatterPackage({ draft: false });
    return '===== TURN_DONE =====\n';
  };
}

function packageFor(options) {
  const slug = options.slug || 'e2e-content-studio-dry-run';
  const title = options.title || 'Contain an AI Agent Before It Acts';
  return [
    '===== FILE: idea.md =====',
    'Query: how to contain an AI agent. Audience: operators. No collision with existing posts.',
    '===== FILE: research.md =====',
    'Claim ledger uses Anthropic and OpenAI primary sources. Access date 2026-08-16.',
    '===== FILE: post.mdx =====',
    validPost({ slug, title, words: options.words ?? 7200, draft: options.draft === true }),
    '===== FILE: review.md =====',
    'Blockers: none. Score 46/50. Verdict: approve.',
    '===== FILE: manifest.json =====',
    validManifest(slug, title),
  ].join('\n');
}

async function writeJson(file, value) {
  const temporary = `${file}.e2e.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await rename(temporary, file);
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function runWorker(jobId, extraEnv = {}) {
  const child = spawn(process.execPath, [WORKER, jobId, 'e2e dry-run topic'], {
    cwd: ROOT,
    env: {
      ...process.env,
      CONTENT_STUDIO_DRY_RUN: '1',
      CONTENT_STUDIO_SKIP_IMAGES: '1',
      CONTENT_STUDIO_LOCK: join(RUNTIME, 'jobs', jobId, 'worker.lock'),
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  return { child, output: () => `${stdout}\n${stderr}` };
}

async function answerTurns(jobId, responder, timeoutMs = 45_000) {
  const seen = new Set();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await readJson(STATE_FILE, {});
    if (state.id === jobId && (state.status === 'done' || state.status === 'failed')) return state;
    if (state.id === jobId && state.chatgptTurnId && !seen.has(state.chatgptTurnId)) {
      const text = await responder(state);
      await mkdir(join(RUNTIME, 'jobs', jobId), { recursive: true });
      await writeFile(join(RUNTIME, 'jobs', jobId, `chatgpt-${state.chatgptTurnId}.txt`), text, 'utf8');
      seen.add(state.chatgptTurnId);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return readJson(STATE_FILE, {});
}

async function withRestoredState(fn) {
  const previous = await readFile(STATE_FILE, 'utf8').catch(() => null);
  try {
    return await fn();
  } finally {
    if (previous) await writeFile(STATE_FILE, previous, 'utf8');
    else await writeJson(STATE_FILE, { status: 'idle', stage: 'idle', message: 'Ready when you are.' });
  }
}

async function testSearchStatusIsNotAnOutline() {
  const { isSearchOrThinkingStatus, parseBrief, isHollowReply } = await import('./lib/conversation.mjs');
  assert(isSearchOrThinkingStatus('Searching 7 websites'), 'search status should be ignored');
  assert(isSearchOrThinkingStatus('Thought for 32s'), 'thinking status should be ignored');
  assert(isHollowReply('Searching the web'), 'search status should be hollow');
  assert(!parseBrief('Searching 7 websites'), 'search status must not parse as a brief');
  assert(!isSearchOrThinkingStatus('{"title":"Real brief","sections":[{"heading":"One"}]}'), 'real JSON must not look like search status');
}

async function testParseBriefWithBrokenNewlines() {
  const { parseBrief } = await import('./lib/conversation.mjs');
  const raw = '{"title":"T","slug":"t","sections":[{"heading":"What\\n to Monitor","purpose":"x"},{"heading":"Two","purpose":"y"}]}';
  const broken = raw.replace('\\n', '\n');
  const brief = parseBrief(broken);
  assert(brief && brief.sections.length === 2, `failed to parse broken JSON brief: ${JSON.stringify(brief)}`);
}

async function testExtractFiles() {
  const files = extractFiles(packageFor({ slug: 'parse-me', title: 'Parse Me' }));
  assert(files['idea.md']?.includes('Query:'), 'idea.md missing');
  assert(files['post.mdx']?.includes('__INLINE_IMAGE_7__'), 'post.mdx missing inline images');
  assert(JSON.parse(files['manifest.json']).images.length === 8, 'manifest should have 8 images');
  const jobDir = join(RUNTIME, 'jobs', 'e2e-extract');
  await mkdir(jobDir, { recursive: true });
  const written = await writeExtractedFiles(jobDir, files);
  assert(written.includes('post.mdx'), 'post.mdx was not written');
}

async function testNormalizeStrippedChat() {
  const stripped = `===== FILE: post.mdx =====
title: "How to Monitor AI Agents in Production"
excerpt: "AI agents need more than uptime monitoring. Learn how to trace runs, diagnose failures, control autonomy, and turn production behavior into better evals."
answer: "Monitor the whole agent run, not just the final answer."
author: "Marius Manolachi"
targetQuery: "how to monitor AI agents in production"
tags:

"AI agents"

"observability"
cover: "HERO_IMAGE"
coverAlt: "A control loop"
draft: false

Quick Answer

An agent can return 200 and still fail the job.

![alt](INLINE_IMAGE_1)
===== FILE: manifest.json =====
{"slug":"how-to-monitor-ai-agents-in-production","title":"How to Monitor AI Agents in Production","summary":"Guide","images":[{"id":"image-1","role":"hero","placeholder":"HERO_IMAGE","prompt":"${'x'.repeat(80)}","alt":"hero"},{"id":"image-2","role":"inline","placeholder":"INLINE_IMAGE_1","prompt":"${'y'.repeat(80)}","alt":"inline"}]}
`;
  const files = extractFiles(stripped);
  assert(files['post.mdx'].startsWith('---\n'), 'frontmatter fence was not restored');
  assert(files['post.mdx'].includes('__HERO_IMAGE__'), 'hero placeholder was not restored');
  assert(files['post.mdx'].includes('__INLINE_IMAGE_1__'), 'inline placeholder was not restored');
  assert(files['post.mdx'].includes("tags:\n  - 'AI agents'"), `yaml list not restored: ${files['post.mdx'].slice(0, 400)}`);
  const manifest = JSON.parse(files['manifest.json']);
  assert(manifest.images[0].placeholder === '__HERO_IMAGE__', 'manifest hero placeholder not restored');
  assert(manifest.images[1].placeholder === '__INLINE_IMAGE_1__', 'manifest inline placeholder not restored');
}

async function testFencedFallback() {
  const files = extractFiles('```md idea.md\nHello\n```\n```json manifest.json\n{"ok":true}\n```');
  assert(files['idea.md'] === 'Hello', 'fenced idea.md failed');
  assert(files['manifest.json'] === '{"ok":true}', 'fenced manifest.json failed');
}

async function testHappyPath() {
  await withRestoredState(async () => {
    const jobId = `e2e-happy-${Date.now()}`;
    await writeJson(STATE_FILE, {
      id: jobId, status: 'running', stage: 'idea', message: 'e2e happy', e2e: true,
      startedAt: new Date().toISOString(), log: ['e2e happy path'],
    });
    const { child, output } = await runWorker(jobId);
    const finished = answerTurns(jobId, sectionResponder());
    const [state, exit] = await Promise.all([
      finished,
      new Promise((resolve) => child.on('close', resolve)),
    ]);
    assert(exit === 0, `worker exited ${exit}: ${state.error || output()}`);
    assert(state.status === 'done', `expected done, got ${state.status}: ${state.error || state.message}`);
    const published = await readFile(join(RUNTIME, 'jobs', jobId, 'published.mdx'), 'utf8');
    assert(published.includes('/blog/hero-dry-run.png'), 'hero placeholder was not replaced');
    assert(!published.includes('__INLINE_IMAGE_1__'), 'inline placeholder remains');
    const log = await readFile(join(RUNTIME, 'jobs', jobId, 'worker.log'), 'utf8');
    assert(/queue /.test(log), `missing queue log: ${log}`);
    assert(/extract /.test(log), `missing extract log: ${log}`);
    assert(/validate /.test(log), `missing validate log: ${log}`);
    assert(!/codex/i.test(log), 'worker log mentioned Codex');
    assert(!/ChatGPT\.app\/Contents\/Resources\/codex/.test(output()), 'Codex binary was invoked');
    await rm(join(ROOT, 'public/blog/hero-dry-run.png'), { force: true });
    for (let index = 1; index <= 7; index += 1) {
      await rm(join(ROOT, `public/blog/inline-${index}-dry-run.png`), { force: true });
    }
  });
}

async function testRepairPath() {
  await withRestoredState(async () => {
    const jobId = `e2e-repair-${Date.now()}`;
    await writeJson(STATE_FILE, {
      id: jobId, status: 'running', stage: 'idea', message: 'e2e repair', e2e: true,
      startedAt: new Date().toISOString(), log: ['e2e repair path'],
    });
    const { child } = await runWorker(jobId);
    const finished = answerTurns(jobId, sectionResponder({ breakFrontmatter: true }), 90_000);
    const [state, exit] = await Promise.all([
      finished,
      new Promise((resolve) => child.on('close', resolve)),
    ]);
    assert(exit === 0, `repair worker exited ${exit}: ${state.error || state.message}`);
    assert(state.status === 'done', `expected done after repair, got ${state.status}: ${state.error || state.message}`);
    const log = await readFile(join(RUNTIME, 'jobs', jobId, 'worker.log'), 'utf8');
    assert(/repair 1:/.test(log), `repair pass was not logged: ${log}`);
    await rm(join(ROOT, 'public/blog/hero-dry-run.png'), { force: true });
    for (let index = 1; index <= 7; index += 1) {
      await rm(join(ROOT, `public/blog/inline-${index}-dry-run.png`), { force: true });
    }
  });
}

async function cleanupDryRunImages() {
  await rm(join(ROOT, 'public/blog/hero-dry-run.png'), { force: true });
  for (let index = 1; index <= 7; index += 1) {
    await rm(join(ROOT, `public/blog/inline-${index}-dry-run.png`), { force: true });
  }
}

async function testFailThenPassLoop() {
  await withRestoredState(async () => {
    const jobId = `e2e-loop-${Date.now()}`;
    await writeJson(STATE_FILE, {
      id: jobId, status: 'running', stage: 'idea', message: 'e2e loop', e2e: true,
      startedAt: new Date().toISOString(), log: ['e2e fail-then-pass'],
    });
    const { child } = await runWorker(jobId);
    const finished = answerTurns(jobId, sectionResponder({ breakFrontmatter: true }), 90_000);
    const [state, exit] = await Promise.all([
      finished,
      new Promise((resolve) => child.on('close', resolve)),
    ]);
    assert(exit === 0, `loop worker exited ${exit}: ${state.error || state.message}`);
    assert(state.status === 'done', `expected done, got ${state.status}: ${state.error || state.message}`);
    const turnCount = (await readFile(join(RUNTIME, 'jobs', jobId, 'worker.log'), 'utf8')).match(/queue /g)?.length || 0;
    assert(turnCount >= 2, `expected more than one ChatGPT turn, saw ${turnCount}`);
    assert(state.id === jobId, 'job id changed during the loop');
    const published = await readFile(join(RUNTIME, 'jobs', jobId, 'published.mdx'), 'utf8');
    assert(published.includes('/blog/hero-dry-run.png'), 'published.mdx missing resolved hero');
    assert(!published.includes('__INLINE_IMAGE_1__'), 'published.mdx still has placeholders');
    const log = await readFile(join(RUNTIME, 'jobs', jobId, 'worker.log'), 'utf8');
    for (const name of ['queue', 'receive', 'extract', 'validate', 'repair']) {
      assert(log.includes(name), `worker.log missing ${name}: ${log}`);
    }
    assert(/validate 0 issues/.test(log), `gate never went clean: ${log}`);
    await cleanupDryRunImages();
  });
}

async function testSubmitRetry() {
  const jobId = `e2e-submit-fn-${Date.now()}`;
  const turnId = crypto.randomUUID();
  await mkdir(join(RUNTIME, 'jobs', jobId), { recursive: true });
  await writeFile(join(RUNTIME, 'fail-submit-once'), '1', 'utf8');
  const first = await receiveChatGPTAnswer({
    runtimeRoot: RUNTIME, jobId, turnId,
    text: '===== FILE: idea.md =====\nhello from submit retry test',
  });
  assert(first.ok === false && first.status === 500, `expected 500, got ${JSON.stringify(first)}`);
  assert(/forced submit failure/.test(first.error || ''), `missing error body: ${first.error}`);
  const recorded = JSON.parse(await readFile(join(RUNTIME, 'jobs', jobId, `chatgpt-${turnId}.error.json`), 'utf8'));
  assert(recorded.status === 500 && /forced submit failure/.test(recorded.body), 'error file missing status/body');
  const second = await receiveChatGPTAnswer({
    runtimeRoot: RUNTIME, jobId, turnId,
    text: '===== FILE: idea.md =====\nhello from submit retry test',
  });
  assert(second.ok === true && second.status === 200, `second save failed: ${JSON.stringify(second)}`);
  const receiveLog = await readFile(join(RUNTIME, 'jobs', jobId, 'worker.log'), 'utf8');
  assert(/submit-error 500/.test(receiveLog), `submit-error not logged: ${receiveLog}`);
  assert(/receive turn/.test(receiveLog), `receive not logged: ${receiveLog}`);

  await withRestoredState(async () => {
    const workerJob = `e2e-submit-worker-${Date.now()}`;
    await writeJson(STATE_FILE, {
      id: workerJob, status: 'running', stage: 'idea', message: 'e2e submit worker', e2e: true,
      startedAt: new Date().toISOString(), log: [],
    });
    const { child } = await runWorker(workerJob);
    const exitPromise = new Promise((resolve) => child.on('close', resolve));
    const respond = sectionResponder();
    let first = true;
    const seen = new Set();
    const started = Date.now();
    let state = {};
    while (Date.now() - started < 90_000) {
      state = await readJson(STATE_FILE, {});
      if (state.id === workerJob && (state.status === 'done' || state.status === 'failed')) break;
      if (state.id === workerJob && state.chatgptTurnId && !seen.has(state.chatgptTurnId)) {
        const text = await respond(state);
        if (first) {
          first = false;
          await writeFile(join(RUNTIME, 'fail-submit-once'), '1', 'utf8');
          const failed = await receiveChatGPTAnswer({
            runtimeRoot: RUNTIME, jobId: workerJob, turnId: state.chatgptTurnId, text,
          });
          assert(failed.status === 500, `expected first worker save to be 500, got ${failed.status}`);
          const current = await readJson(STATE_FILE, {});
          await writeJson(STATE_FILE, { ...current, chatgptError: `submit-error 500 ${failed.error}` });
          await new Promise((resolve) => setTimeout(resolve, 400));
          assert((await readJson(STATE_FILE, {})).status !== 'failed', 'job went failed after submit-error');
          continue;
        }
        await writeFile(join(RUNTIME, 'jobs', workerJob, `chatgpt-${state.chatgptTurnId}.txt`), text, 'utf8');
        seen.add(state.chatgptTurnId);
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    const exit = child.exitCode == null ? await exitPromise : child.exitCode;
    assert(exit === 0 && state.status === 'done', `worker did not finish after submit retry: ${state.status} ${state.error || ''}`);
    const workerLog = await readFile(join(RUNTIME, 'jobs', workerJob, 'worker.log'), 'utf8');
    assert(/submit-error 500/.test(workerLog), `worker log missing submit-error: ${workerLog}`);
    await cleanupDryRunImages();
  });
}

async function testHollowReplyKeepsArticle() {
  const body = `## Why the boundary comes first\n\n${pad(400)}`;
  const existing = { 'post.mdx': assemblePost({ title: 'Keep Me', author: 'Marius Manolachi', draft: false }, body) };
  const hollow = applyConversationReply(existing, '```\n```\n===== SECTION_DONE =====\n===== TURN_DONE =====');
  assert(hollow.applied === false, 'hollow reply should not apply');
  assert(hollow.artifacts['post.mdx'] === existing['post.mdx'], 'hollow reply wiped the accumulated article');
  assert(isHollowReply('===== SECTION_DONE ====='), 'done-marker-only should be hollow');
}

async function testNoCompleteFileRewrite() {
  const source = await readFile(WORKER, 'utf8');
  assert(!/entire finished article|return the ENTIRE corrected|keep dumping from the next character/i.test(source), 'worker still asks for a complete-file rewrite');
  assert(/next H2 only|SECTION_DONE|Change only those/.test(source), 'worker is missing section/patch instructions');
  assert(/700-900 words/.test(source), 'section turns must ask for 700-900 words');
  assert(/8 \* 60 \* 1000/.test(source), 'turns must time out at 8 minutes');
  assert(!/\b7_000\b|\bMIN_WORDS = 7/.test(source), 'worker still uses the Claude-era word band');
}

async function testWaiterDoesNotCountAssistantNodes() {
  const source = await readFile(join(RUNTIME, 'chatgpt-extension', 'content.js'), 'utf8');
  assert(!/messages\.length <= previousCount/.test(source), 'waiter still blocks on assistant node count');
  assert(/previousText/.test(source), 'waiter should compare previous assistant text');
  assert(/isSearchOrThinkingStatus/.test(source), 'waiter should ignore search status');
  assert(!/continue generating/.test(source), 'waiter still clicks continue-generating');
  assert(/8 \* 60 \* 1000/.test(source), 'browser waiter must be 8 minutes');
  assert(/ensureFastGpt/.test(source), 'companion must turn Think off before sending');
}

async function testWorkerHasNoCodex() {
  const source = await readFile(WORKER, 'utf8');
  assert(/CONTENT_STUDIO_CODEX_BIN/.test(source), 'production worker must drive Codex');
  assert(/gpt-5.6-luna/.test(source), 'production worker must use GPT-5.6 Luna');
  assert(/model_reasoning_effort="high"/.test(source), 'production worker must use high thinking');
  assert(/CONTENT_STUDIO_DRY_RUN !== '1'/.test(source), 'dry-run e2e must still skip Codex');
  assert(/CODEX_HOME/.test(source), 'blog Codex must use an isolated CODEX_HOME');
}

async function testClaimLeaseBeforeSend() {
  const { claimIsActive, CLAIM_SEND_MS, CLAIM_ANSWER_MS } = await import('../lib/content-studio/claim.mjs');
  const now = Date.parse('2026-08-17T08:00:00.000Z');
  assert(claimIsActive({ chatgptClaimedAt: new Date(now - 10_000).toISOString() }, now), 'fresh claim without send must stay exclusive');
  assert(!claimIsActive({ chatgptClaimedAt: new Date(now - CLAIM_SEND_MS - 1).toISOString() }, now), 'unsent claim must expire so another tab can send');
  assert(claimIsActive({
    chatgptClaimedAt: new Date(now - 60_000).toISOString(),
    chatgptSentAt: new Date(now - 30_000).toISOString(),
  }, now), 'sent claim must stay exclusive while ChatGPT answers');
  assert(!claimIsActive({
    chatgptClaimedAt: new Date(now - CLAIM_ANSWER_MS - 120_000).toISOString(),
    chatgptSentAt: new Date(now - CLAIM_ANSWER_MS - 1).toISOString(),
  }, now), 'sent claim must expire after the answer window');
}

async function testCompanionOpensNewChat() {
  const source = await readFile(join(RUNTIME, 'chatgpt-extension', 'content.js'), 'utf8');
  assert(/data-content-studio-companion/.test(source), 'companion must mark the DOM so CDP and the extension cannot both run');
  assert(/isBlankNewChat/.test(source), 'companion must detect a blank new chat');
  assert(/onLockedThread/.test(source), 'companion must stay on the locked /c/ url');
  assert(/job\.threadUrl/.test(source), 'companion must receive the locked thread url');
  assert(/type:\s*'sent'|type: "sent"/.test(source), 'companion must ack the send so an unsent claim can be retried');
  const worker = await readFile(WORKER, 'utf8');
  assert(/newChat: !startedThread/.test(worker), 'first turn of a job must request a new chat');
  assert(!/This is a brand-new ChatGPT chat/.test(worker), 'worker must not fake a new chat with prompt text');
}

async function testUrlLock() {
  const { canSendOnUrl, conversationIdFromUrl } = await import('../lib/content-studio/chatgpt-url.mjs');
  assert(conversationIdFromUrl('https://chatgpt.com/c/abc-123?foo=1') === 'abc-123', 'extract conversation id');
  assert(canSendOnUrl({ newChat: true }, 'https://chatgpt.com/'), 'first turn may send on blank home');
  assert(!canSendOnUrl({ newChat: true }, 'https://chatgpt.com/c/old-thread'), 'first turn must not send on an existing /c/');
  assert(canSendOnUrl({ chatgptThreadUrl: 'https://chatgpt.com/c/abc-123' }, 'https://chatgpt.com/c/abc-123'), 'later turns stay on the locked thread');
  assert(!canSendOnUrl({ chatgptThreadUrl: 'https://chatgpt.com/c/abc-123' }, 'https://chatgpt.com/c/other'), 'later turns must not jump to another chat');
  assert(!canSendOnUrl({ chatgptThreadUrl: 'https://chatgpt.com/c/abc-123' }, 'https://chatgpt.com/'), 'later turns must not go back to home');
}

async function testWorkerHonorsStop() {
  const source = await readFile(WORKER, 'utf8');
  assert(/function isStopped/.test(source), 'worker missing isStopped');
  assert(/class StoppedError/.test(source), 'worker missing StoppedError');
  assert(/CONTENT_STUDIO_STOP/.test(source), 'worker must honor an isolated stop file');
  const route = await readFile(join(ROOT, 'app/api/content-studio/job/route.ts'), 'utf8');
  assert(/export async function DELETE/.test(route), 'job API missing DELETE stop');
  assert(!/unlinkSync\(runtimePath\('stop'\)\).*responseState/.test(route.replace(/\s+/g, '')), 'DELETE must leave the stop file until the next start');
}

async function testStopExitsWorker() {
  const live = await readJson(STATE_FILE, {});
  if ((live.status === 'running' || live.status === 'waiting') && !String(live.id || '').startsWith('e2e-')) {
    console.log('SKIP  stop exits worker (live job in progress)');
    return;
  }
  await withRestoredState(async () => {
    const jobId = `e2e-stop-${Date.now()}`;
    const jobDir = join(RUNTIME, 'jobs', jobId);
    const stopFile = join(jobDir, 'stop');
    await mkdir(jobDir, { recursive: true });
    await writeJson(STATE_FILE, {
      id: jobId, status: 'running', stage: 'idea', message: 'e2e stop', e2e: true,
      startedAt: new Date().toISOString(), log: ['e2e stop'],
    });
    const { child } = await runWorker(jobId, { CONTENT_STUDIO_STOP: stopFile });
    const exitPromise = new Promise((resolve) => child.on('close', resolve));
    const started = Date.now();
    while (Date.now() - started < 15_000) {
      const state = await readJson(STATE_FILE, {});
      if (state.id === jobId && state.chatgptTurnId) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await writeFile(stopFile, String(Date.now()), 'utf8');
    const exit = await Promise.race([
      exitPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('worker did not exit after stop')), 8_000)),
    ]);
    const state = await readJson(STATE_FILE, {});
    assert(exit === 0, `stop worker exited ${exit}`);
    assert(state.status === 'failed', `expected failed after stop, got ${state.status}`);
    assert(state.error === 'Stopped by you.', `unexpected stop error: ${state.error}`);
    const log = await readFile(join(jobDir, 'worker.log'), 'utf8').catch(() => '');
    assert(/Stopped by you|queue /.test(log), `stop should leave the job log: ${log}`);
  });
}

async function testNoClaimWithoutWorker() {
  let probe;
  try {
    probe = await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', { cache: 'no-store' });
  } catch {
    console.log('SKIP  no-claim-without-worker (dev server not reachable)');
    return;
  }
  try {
    const { readFileSync } = await import('node:fs');
    const pid = Number(readFileSync(join(RUNTIME, 'worker.lock'), 'utf8'));
    if (pid) {
      process.kill(pid, 0);
      console.log('SKIP  no-claim-without-worker (a live Plus worker is running)');
      return;
    }
  } catch { /* no production worker */ }
  if (!probe.ok) throw new Error(`chatgpt GET ${probe.status}`);
  await withRestoredState(async () => {
    await writeJson(STATE_FILE, {
      id: 'live-looking-job', status: 'waiting', stage: 'review', message: 'should not claim',
      chatgptTurnId: crypto.randomUUID(), chatgptPrompt: 'do not send this', chatgptStage: 'review',
    });
    const claimed = await (await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', { cache: 'no-store' })).json();
    assert(!claimed.job, `companion claimed a job with no live worker: ${JSON.stringify(claimed)}`);
  });
}

async function testJobApiIfServerUp() {
  let response;
  try {
    response = await fetch('http://127.0.0.1:3002/api/content-studio/job', { cache: 'no-store' });
  } catch {
    console.log('SKIP  job API (dev server not reachable on :3002)');
    return;
  }
  if (!response.ok) throw new Error(`job GET ${response.status}`);
  const body = await response.json();
  assert('chatgptConnected' in body, 'job API does not expose chatgptConnected');
}

async function testDryRunDoesNotPublish() {
  const blogs = (await readdir(join(ROOT, 'content/blog'))).filter((file) => file.startsWith('e2e-'));
  assert(blogs.length === 0, `dry-run leaked blog files: ${blogs.join(', ')}`);
}

async function testChatGPTClaimAndSubmit() {
  let probe;
  try {
    probe = await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', { cache: 'no-store' });
  } catch {
    console.log('SKIP  ChatGPT API (dev server not reachable on :3002)');
    return;
  }
  if (!probe.ok) throw new Error(`chatgpt GET ${probe.status}`);

  await withRestoredState(async () => {
    const previousHeartbeat = await readFile(join(RUNTIME, 'chatgpt.json'), 'utf8').catch(() => null);
    try {
      const jobId = `claim-test-${Date.now()}`;
      const turnId = crypto.randomUUID();
      await writeJson(STATE_FILE, {
        id: jobId, status: 'waiting', stage: 'write', message: 'e2e claim',
        e2e: false, chatgptTurnId: turnId, chatgptPrompt: 'Return a short idea.md', chatgptStage: 'write',
      });
      await writeFile(join(RUNTIME, 'worker.lock'), String(process.pid), 'utf8');
      await new Promise((resolve) => setTimeout(resolve, 50));
      const claimed = await (await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', { cache: 'no-store' })).json();
      const afterClaim = await readJson(STATE_FILE, {});
      assert(claimed.job?.turnId === turnId || afterClaim.chatgptClaimedAt, `did not claim turn: ${JSON.stringify(claimed)}`);
      const second = await (await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', { cache: 'no-store' })).json();
      assert(!second.job, 'second poll re-claimed an in-flight ChatGPT turn');
      const submit = await fetch('http://127.0.0.1:3002/api/content-studio/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'response', jobId, turnId,
          text: '===== FILE: idea.md =====\nAPI claim test',
        }),
      });
      assert(submit.ok, `submit failed ${submit.status}`);
      const saved = await readFile(join(RUNTIME, 'jobs', jobId, `chatgpt-${turnId}.txt`), 'utf8');
      assert(saved.includes('API claim test'), 'ChatGPT answer was not saved');
    } finally {
      await rm(join(RUNTIME, 'worker.lock'), { force: true });
      if (previousHeartbeat) await writeFile(join(RUNTIME, 'chatgpt.json'), previousHeartbeat, 'utf8');
    }
  });
}

async function testStartRequiresChatGPT() {
  let probe;
  try {
    probe = await fetch('http://127.0.0.1:3002/api/content-studio/job', { cache: 'no-store' });
  } catch {
    console.log('SKIP  start-requires-ChatGPT (dev server not reachable on :3002)');
    return;
  }
  if (!probe.ok) throw new Error(`job GET ${probe.status}`);

  await withRestoredState(async () => {
    const previousHeartbeat = await readFile(join(RUNTIME, 'chatgpt.json'), 'utf8').catch(() => null);
    try {
      await writeJson(STATE_FILE, { status: 'idle', stage: 'idle', message: 'Ready when you are.' });
      await writeJson(join(RUNTIME, 'chatgpt.json'), { at: '2000-01-01T00:00:00.000Z' });
      const live = await (await fetch('http://127.0.0.1:3002/api/content-studio/job', { cache: 'no-store' })).json();
      if (live.geminiConnected) {
        console.log('SKIP  start-requires-Gemini (Gemini is connected; posting would launch Codex)');
        return;
      }
      const response = await fetch('http://127.0.0.1:3002/api/content-studio/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'should not start' }),
      });
      assert(response.status === 412, `expected 412 without Gemini, got ${response.status}`);
      const body = await response.json();
      assert(/Gemini|Codex/i.test(body.error || ''), `expected Gemini or Codex error, got ${body.error}`);
    } finally {
      if (previousHeartbeat) await writeFile(join(RUNTIME, 'chatgpt.json'), previousHeartbeat, 'utf8');
      else await rm(join(RUNTIME, 'chatgpt.json'), { force: true });
    }
  });
}

const tests = [
  ['search status is not an outline', testSearchStatusIsNotAnOutline],
  ['parse brief JSON with raw newlines', testParseBriefWithBrokenNewlines],
  ['extract FILE markers', testExtractFiles],
  ['extract fenced fallback', testFencedFallback],
  ['normalize stripped ChatGPT innerText', testNormalizeStrippedChat],
  ['hollow reply does not wipe the article', testHollowReplyKeepsArticle],
  ['worker has no complete-file rewrite', testNoCompleteFileRewrite],
  ['waiter ignores node count and search status', testWaiterDoesNotCountAssistantNodes],
  ['production worker uses Codex Luna high', testWorkerHasNoCodex],
  ['unsent claim expires so a later tab can send', testClaimLeaseBeforeSend],
  ['companion opens a new chat per article', testCompanionOpensNewChat],
  ['sends are locked to the page url', testUrlLock],
  ['worker honors stop file', testWorkerHonorsStop],
  ['stop exits the waiting worker', testStopExitsWorker],
  ['worker happy path via ChatGPT files', testHappyPath],
  ['worker repair path via ChatGPT files', testRepairPath],
  ['fail-then-pass loop reaches done', testFailThenPassLoop],
  ['submit failure retries on the same job', testSubmitRetry],
  ['companion does not claim without a live worker', testNoClaimWithoutWorker],
  ['job API exposes ChatGPT connection', testJobApiIfServerUp],
  ['dry-run does not write content/blog', testDryRunDoesNotPublish],
  ['ChatGPT API claim and submit', testChatGPTClaimAndSubmit],
  ['start refuses without ChatGPT window', testStartRequiresChatGPT],
];

console.log('Content Studio E2E — ChatGPT chat, no Codex\n');
for (const [name, fn] of tests) {
  try {
    await fn();
    record(name);
  } catch (error) {
    record(name, error);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
