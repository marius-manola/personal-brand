import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, unlinkSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formatTakenWork, collectTakenWork } from '../lib/content-studio/inventory.mjs';
import { mergeResearchedTopics, readTopics, topicLockPath, writeTopics } from '../lib/content-studio/topics.mjs';
import { growthPromptContext } from '../lib/content-studio/control-plane.mjs';

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');
const SKILLS_ROOT = process.env.CONTENT_STUDIO_SKILLS || '/Users/mariusmanola/Code/getfaster/ai-consulting-content-studio';
const CODEX_BIN = process.env.CONTENT_STUDIO_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex';
const CODEX_MODEL = process.env.CONTENT_STUDIO_CODEX_MODEL || 'gpt-5.6-luna';
const CODEX_HOME = process.env.CODEX_HOME || join(RUNTIME, 'codex-home');
const COUNT = Math.min(20, Math.max(8, Math.round(Number(process.argv[2] || 12))));
const jobDir = join(RUNTIME, 'jobs', 'topic-research');
const logFile = join(jobDir, 'worker.log');
const draftFile = join(jobDir, 'topics.json');
const lockFile = topicLockPath();

await mkdir(jobDir, { recursive: true });
await writeFile(lockFile, String(process.pid), 'utf8');
const release = () => { try { unlinkSync(lockFile); } catch { /* ignore */ } };
process.on('exit', release);

function runCodex(prompt) {
  return new Promise((resolve, reject) => {
    if (!existsSync(CODEX_BIN)) {
      reject(new Error(`Codex binary is missing at ${CODEX_BIN}.`));
      return;
    }
    const output = createWriteStream(logFile, { flags: 'a' });
    output.write(`\n[${new Date().toISOString()}] Topic research\n`);
    const lastMessage = join(jobDir, 'codex-last-message.txt');
    const child = spawn(CODEX_BIN, [
      'exec',
      '-m', CODEX_MODEL,
      '-c', 'model_reasoning_effort="high"',
      '-c', 'approval_policy="never"',
      '-s', 'workspace-write',
      '--add-dir', SKILLS_ROOT,
      '--add-dir', '/Users/mariusmanola/Code/getfaster/.claude/skills/seo-geo-playbook',
      '-o', lastMessage,
      '-',
    ], {
      cwd: ROOT,
      env: { ...process.env, CODEX_HOME },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.write(prompt);
    child.stdin.end();
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    child.on('error', (error) => { output.end(); reject(error); });
    child.on('close', (code) => {
      output.end();
      if (code === 0) resolve();
      else reject(new Error(`Topic research exited with code ${code}.`));
    });
  });
}

async function researchPrompt() {
  const taken = formatTakenWork(collectTakenWork());
  const performance = await growthPromptContext();
  return `Research ${COUNT} distinct blog topics for Marius Manolachi's personal site.

This is topic discovery only. Do not write an article. Do not edit the live site. Do not generate images.

Read:
- ${join(SKILLS_ROOT, 'CONTENT_STUDIO.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/information-gain.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/brand-and-query-strategy.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/entity-facts.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/geo-seo.md')}
- ${join(SKILLS_ROOT, 'skills/ai-consulting-blog-pipeline/references/research-and-evidence.md')}
- /Users/mariusmanola/Code/getfaster/.claude/skills/seo-geo-playbook/SKILL.md

LOCAL RUNTIME POLICY OVERRIDES OLDER LENGTH OR CONTENT-MIX RULES IN THE MOUNTED REFERENCES.

Thesis: do not scale a library about AI agents. Scale a curriculum for people and small teams becoming capable of deciding, architecting, building, evaluating, and buying AI products.
AI makes writing free. Scale information gain, not article count. Create evidence for the web, then package it into extractable answers. A sourceable atom must be an observed result, original dataset, reproducible test, worked decision artifact, or documented build outcome. A declared sentence, coined framework, or unsupported opinion is not evidence.

Build two balanced six-post slates. Every complete slate contains exactly one of each contentType:
1. original-research — an experiment, benchmark, dataset, measured build, or analyzed firsthand corpus
2. decision-tool — a calculator, rubric, scorecard, decision tree, or worked comparison
3. failure-clinic — a reproduced failure with diagnosis, trace, repair, and verification
4. implementation-lab — a build with code/configuration, test method, and observed output
5. capability-guide — a learning sequence with an exercise, artifact, and transfer check
6. commercial-decision — consultant/agency/internal/platform choice, economics, scope, or buying risk

Do not approve a topic until its evidence can actually be produced before publication. Do not cargo-cult Reddit. Own the evidence on this domain.

Ask each candidate query in ChatGPT Search, Perplexity, Google AI Mode / AI Overview, and Gemini. Record the implicit subquestions, winning sources, the claims they supported, whether the citation was original or a summary, and what all of them miss. Keep a topic only if this URL can produce something materially better than the current winner. Do not copy a winner's paragraph shape.
Also compare the candidate's top ten organic results with the closest owned query. Four or more shared results plus the same reader intent means the queries belong to one canonical URL; choose a genuinely different job instead of creating a competing page.

ICP — only serve these readers:
1. Founders and operators deciding where AI creates real value in a small company
2. Product and engineering teams building or repairing AI products
3. Operations leaders automating work without a large AI team
4. Professionals who want a private AI tutor to become capable
5. Buyers comparing a consultant, an agency, a platform, or an internal build

Services he actually offers: AI consulting and AI tutoring. He makes existing people capable. He does not build it as an agency. Use only locked entity facts. Do not invent clients, case studies, or credentials.

Search the live web. Use current SERPs, People Also Ask, Reddit, Hacker News, docs, and answer-engine style questions. Prefer phrasing real people type.

Length follows the reader job, never a quota. There is no global word-count minimum. Use these ceilings: original-research 6,000 words; decision-tool, failure-clinic, and capability-guide 3,500; implementation-lab and commercial-decision 3,000. Reject commodity topics and stop writing when the evidence and reader job are complete.

Veto first: collision, no evidence, commodity synthesis only, wrong ICP.
Then score P = 0.30 observed demand + 0.20 ranking opportunity + 0.15 cluster momentum + 0.15 unique evidence advantage + 0.10 AI-engine source gap + 0.10 business fit.
Observed demand comes from Search Console context below when available. Never invent search volume.

${performance}

Winnability is a situated decision, not "avoid anything IBM ranks for." "RAG vs agent for a 20-person team with Postgres" is allowed. "What is an embedding" is not.

Use only these canonical clusters: opportunity, architecture, implementation, evaluation, capability, commercial. Cover the curriculum broadly. Agent diagnostics are valid only if unowned and not the bulk of the bank.

Reject:
- queries we already own (see below)
- near-duplicates of owned queries, queued drafts, or each other
- same reader job with a different audience wrapper (founder vs team vs business)
- same object with a synonym verb (learn/teach, monitor/observability)
- generic AI news
- tool-affiliate roundups
- "what is AI" / "what is RAG" style commodity definitions
- topics whose only atom would be a new mnemonic
- topics whose only plan is a 50-word extractable answer plus a manufactured stat or "According to OpenAI"
- anything that needs fake experience, fake n=, or unlocked credentials

Each topic must own one distinct reader job and a pre-state → post-state change. If two candidates would compete for the same citation, keep the stronger one only.

${taken}

Write ONLY this file: ${draftFile}

Valid JSON:
{
  "topics": [
    {
      "query": "exact target query",
      "slug": "kebab-case",
      "cluster": "opportunity|architecture|implementation|evaluation|capability|commercial",
      "parentSlug": "the existing or planned canonical pillar slug for this cluster",
      "intent": "informational|diagnostic|implementation|commercial",
      "icp": "which ICP segment, pre-state, and post-state",
      "contentType": "original-research|decision-tool|failure-clinic|implementation-lab|capability-guide|commercial-decision",
      "kind": "flagship|satellite",
      "sourceableAtom": "the one evidence-backed result only this page can be cited for",
      "evidenceType": "benchmark|dataset|experiment|firsthand-corpus|build-measurement|decision-artifact|failure-reproduction|learning-exercise|commercial-model",
      "evidencePlan": "what will be run, built, counted, compared, or derived before writing",
      "evidenceReadyCondition": "the observable artifact or result that must exist before this post may publish",
      "engineGap": "what ChatGPT Search, Perplexity, Google AI Mode, and Gemini currently miss or cite from a summarizer, and why this URL can be materially better",
      "geoWhy": "why an answer engine would cite this (the atom, not formatting)",
      "seoWhy": "why this situated job can rank",
      "competition": "low|medium|high",
      "score": 0-100,
      "sources": ["https://...", "https://..."],
      "distributionHooks": [
        {"channel":"LinkedIn|Reddit|Hacker News|newsletter|community", "audience":"specific audience", "angle":"native discussion angle, not a link-drop"},
        {"channel":"...", "audience":"...", "angle":"..."},
        {"channel":"...", "audience":"...", "angle":"..."}
      ]
    }
  ]
}

Return exactly ${COUNT} ready topics, unique queries and slugs. Order them as balanced slates so sequential claiming preserves the six-type mix. For every complete group of six, include exactly one of each contentType and exactly one kind=flagship (the original-research post). Every topic needs a non-empty evidence plan, ready condition, sourceable atom, engine gap from live engine inspection, canonical parent slug, and at least three distribution hooks. High thinking. Finish the file.`;
}

const current = await readTopics();
await writeTopics({
  ...current,
  status: 'researching',
  message: `Codex is searching for ${COUNT} GEO/SEO topics…`,
  error: undefined,
});

try {
  await runCodex(await researchPrompt());
  let incoming = [];
  try {
    const draft = JSON.parse(await readFile(draftFile, 'utf8'));
    incoming = Array.isArray(draft.topics) ? draft.topics : Array.isArray(draft) ? draft : [];
  } catch {
    throw new Error('Topic research did not write valid JSON.');
  }
  const merged = mergeResearchedTopics(current, incoming);
  const ready = merged.filter((topic) => topic.status === 'ready');
  const rejected = merged.filter((topic) => topic.status === 'rejected');
  if (ready.length < 5) throw new Error(`Only ${ready.length} usable new topics after overlap checks.`);
  await writeTopics({
    status: 'ready',
    message: `${ready.length} distinct topics ready${rejected.length ? `, ${rejected.length} rejected as overlap` : ''}. Writers pull unique queries from this bank.`,
    researchedAt: new Date().toISOString(),
    error: undefined,
    topics: merged,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeTopics({
    ...current,
    status: 'failed',
    message: 'Topic research failed.',
    error: message,
  });
  process.exitCode = 1;
}
