import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { countPostWords } from './conversation.mjs';
import { upsertQueueJob } from './queue.mjs';
import {
  CONTENT_PROFILES, CONTENT_TYPES, inferContentType, normalizeContentType, profileForTopic,
} from './editorial-policy.mjs';

export { CONTENT_PROFILES, CONTENT_TYPES, inferContentType, normalizeContentType, profileForTopic };

// Length is an editorial constraint, not a ranking tactic. Every new post gets a
// profile from the evidence it creates and the reader job it completes.
export const MIN_WORDS = 0;
export const MAX_WORDS = 6_000;

// Kept as a compatibility export for the dashboard and older queued jobs.
export const WORD_BANDS = {
  focused: { id: 'focused', min: 0, max: 3_000, label: 'evidence-complete, up to 3,000' },
  standard: { id: 'standard', min: 0, max: 3_500, label: 'evidence-complete, up to 3,500' },
  flagship: { id: 'flagship', min: 0, max: 6_000, label: 'evidence-complete, up to 6,000' },
};

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');
const QUEUE_FILE = join(RUNTIME, 'queue.json');
const BLOG_DIR = join(ROOT, 'content/blog');
const IN_FLIGHT = new Set(['generating', 'imaging', 'ready', 'publishing']);

export function bandForCount(value) {
  const count = Number(value) || 0;
  if (count <= 3_000) return 'focused';
  if (count <= 4_500) return 'standard';
  return 'flagship';
}

export function bandById(id) {
  return WORD_BANDS[id] || null;
}

function frontmatterOf(source) {
  try { return matter(source).data || {}; } catch { return {}; }
}

function emptyCounts() {
  return { focused: 0, standard: 0, flagship: 0 };
}

export function wordBandMix() {
  const counts = emptyCounts();
  try {
    for (const file of readdirSync(BLOG_DIR)) {
      if (!file.endsWith('.mdx') || file.startsWith('_')) continue;
      const source = readFileSync(join(BLOG_DIR, file), 'utf8');
      const data = frontmatterOf(source);
      if (data.draft === true) continue;
      const profile = data.contentType ? profileForTopic(data) : null;
      counts[profile?.id || bandForCount(countPostWords(source))] += 1;
    }
  } catch { /* no blog directory */ }

  try {
    const queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
    for (const job of queue.jobs || []) {
      if (!IN_FLIGHT.has(job.status)) continue;
      const profile = profileForTopic(job);
      counts[profile.id] += 1;
    }
  } catch { /* no queue */ }

  const total = counts.focused + counts.standard + counts.flagship;
  return { counts, total };
}

export async function claimWordBand(jobId, topic = {}) {
  if (!jobId) throw new Error('A job id is required to claim an editorial profile.');
  const profile = profileForTopic(topic);
  await upsertQueueJob({
    id: jobId,
    contentType: profile.contentType,
    kind: profile.kind,
    wordBand: profile.id,
    wordMin: profile.min,
    wordMax: profile.max,
    imageTarget: profile.images,
  });
  return profile;
}

export function jobWordBand(job) {
  if (!job) return null;
  return profileForTopic(job);
}
