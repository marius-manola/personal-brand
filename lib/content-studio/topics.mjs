import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectTakenWork, collisionIssues, formatTakenWork, normalizeQuery, planningSnapshot, slugify } from './inventory.mjs';
import {
  CLUSTER_PARENTS, CONTENT_TYPES, canonicalCluster, inferContentType, profileForTopic,
} from './editorial-policy.mjs';

const RUNTIME = join(process.cwd(), '.content-studio');
const TOPICS_FILE = join(RUNTIME, 'topics.json');
const LOCK_FILE = join(RUNTIME, 'topic-worker.lock');

export function emptyTopics() {
  return {
    status: 'idle',
    message: 'Research topics before writing so parallel jobs do not pick the same query.',
    researchedAt: null,
    error: undefined,
    topics: [],
  };
}

export async function readTopics() {
  try {
    const value = JSON.parse(await readFile(TOPICS_FILE, 'utf8'));
    return {
      ...emptyTopics(),
      ...value,
      topics: Array.isArray(value.topics) ? value.topics : [],
      researching: topicWorkerAlive() || value.status === 'researching',
    };
  } catch {
    return { ...emptyTopics(), researching: topicWorkerAlive() };
  }
}

export async function writeTopics(next) {
  await mkdir(RUNTIME, { recursive: true });
  const payload = {
    ...next,
    topics: Array.isArray(next.topics) ? next.topics : [],
    updatedAt: new Date().toISOString(),
  };
  const temporary = `${TOPICS_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(payload, null, 2), 'utf8');
  await rename(temporary, TOPICS_FILE);
  return payload;
}

export function topicWorkerAlive() {
  try {
    const pid = Number(readFileSync(LOCK_FILE, 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readyTopics(bank = null) {
  const topics = bank?.topics || [];
  return topics.filter((topic) => topic && topic.status === 'ready' && topic.query);
}

export function missingSlateTypes(bank = null) {
  const available = new Set(readyTopics(bank).map((topic, index) => normalizeTopic(topic, index).contentType));
  return CONTENT_TYPES.filter((contentType) => !available.has(contentType));
}

function markRejected(topic, reason) {
  topic.status = 'rejected';
  topic.rejectReason = reason;
  topic.claimedBy = undefined;
  topic.claimedAt = undefined;
  return topic;
}

export function sweepOverlaps(bank, { mode = 'plan' } = {}) {
  const taken = collectTakenWork();
  const kept = [];
  for (const topic of bank.topics || []) {
    if (topic.status !== 'ready') {
      kept.push(topic);
      continue;
    }
    const issues = collisionIssues(undefined, { slug: topic.slug, query: topic.query }, { taken, extra: kept.filter((item) => item.status === 'ready'), mode });
    if (issues.length) markRejected(topic, issues[0]);
    kept.push(topic);
  }
  return { ...bank, topics: kept };
}

export async function claimTopics(count, jobIds = []) {
  const bank = sweepOverlaps(await readTopics(), { mode: 'plan' });
  const claimed = [];
  const extras = [];
  const today = new Date().toISOString().slice(0, 10);
  const typeCounts = Object.fromEntries(CONTENT_TYPES.map((type) => [type, 0]));
  for (const topic of bank.topics || []) {
    if ((topic.status !== 'claimed' && topic.status !== 'used') || !String(topic.claimedAt || '').startsWith(today)) continue;
    typeCounts[inferContentType(topic)] += 1;
  }
  const candidates = readyTopics(bank).map((topic, index) => ({
    topic,
    index,
    normalized: normalizeTopic(topic, index),
  }));
  while (claimed.length < count && candidates.length) {
    candidates.sort((a, b) => {
      const typeDelta = typeCounts[a.normalized.contentType] - typeCounts[b.normalized.contentType];
      return typeDelta || CONTENT_TYPES.indexOf(a.normalized.contentType) - CONTENT_TYPES.indexOf(b.normalized.contentType)
        || (b.normalized.score || 0) - (a.normalized.score || 0);
    });
    const candidate = candidates.shift();
    const topic = candidate.topic;
    const issues = collisionIssues(undefined, { slug: topic.slug, query: topic.query }, { extra: extras, mode: 'plan' });
    if (issues.length) {
      markRejected(topic, issues[0]);
      continue;
    }
    Object.assign(topic, candidate.normalized);
    topic.status = 'claimed';
    topic.claimedBy = jobIds[claimed.length] || topic.claimedBy;
    topic.claimedAt = new Date().toISOString();
    topic.rejectReason = undefined;
    claimed.push(topic);
    typeCounts[topic.contentType] += 1;
    extras.push({ query: topic.query, slug: topic.slug });
  }
  await writeTopics(bank);
  return claimed;
}

export async function markTopicUsed(query, jobId) {
  if (!query) return;
  const bank = await readTopics();
  const key = normalizeQuery(query);
  let changed = false;
  for (const topic of bank.topics) {
    if (normalizeQuery(topic.query) !== key && topic.claimedBy !== jobId) continue;
    topic.status = 'used';
    topic.usedAt = new Date().toISOString();
    changed = true;
  }
  if (changed) await writeTopics(bank);
}

export async function releaseTopicsForJob(jobId, query, { force = false } = {}) {
  const bank = await readTopics();
  let changed = false;
  for (const topic of bank.topics) {
    const match = topic.claimedBy === jobId || (query && normalizeQuery(topic.query) === normalizeQuery(query));
    if (!match) continue;
    if (topic.status === 'used' && !force) continue;
    topic.status = 'ready';
    topic.claimedBy = undefined;
    topic.claimedAt = undefined;
    topic.usedAt = undefined;
    changed = true;
  }
  if (changed) await writeTopics(bank);
}

export function takenWorkPrompt(exceptJobId) {
  return formatTakenWork(collectTakenWork(exceptJobId));
}

export function normalizeTopic(raw, index = 0) {
  const query = String(raw.query || raw.topic || '').trim();
  const cluster = canonicalCluster(raw.cluster);
  const contentType = inferContentType({ ...raw, query, cluster });
  const profile = profileForTopic({ ...raw, query, cluster, contentType });
  const distributionHooks = Array.isArray(raw.distributionHooks)
    ? raw.distributionHooks.slice(0, 5).map((hook) => typeof hook === 'string'
      ? { channel: 'community', audience: '', angle: hook }
      : {
          channel: String(hook?.channel || ''),
          audience: String(hook?.audience || ''),
          angle: String(hook?.angle || hook?.hook || ''),
        }).filter((hook) => hook.channel && hook.angle)
    : [];
  return {
    id: String(raw.id || slugify(query) || `topic-${index + 1}`),
    query,
    slug: slugify(raw.slug || query),
    cluster,
    parentSlug: slugify(raw.parentSlug || CLUSTER_PARENTS[cluster]),
    intent: String(raw.intent || 'informational'),
    icp: String(raw.icp || ''),
    contentType,
    kind: profile.kind,
    sourceableAtom: String(raw.sourceableAtom || raw.atom || '').trim(),
    engineGap: String(raw.engineGap || raw.gap || '').trim(),
    evidenceType: String(raw.evidenceType || '').trim(),
    evidencePlan: String(raw.evidencePlan || '').trim(),
    evidenceReadyCondition: String(raw.evidenceReadyCondition || '').trim(),
    distributionHooks,
    geoWhy: String(raw.geoWhy || raw.geo || ''),
    seoWhy: String(raw.seoWhy || raw.seo || ''),
    competition: ['low', 'medium', 'high'].includes(raw.competition) ? raw.competition : 'medium',
    score: Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0))),
    sources: Array.isArray(raw.sources) ? raw.sources.filter((url) => /^https:\/\//.test(String(url))) : [],
    status: raw.status === 'claimed' || raw.status === 'used' || raw.status === 'rejected' ? raw.status : 'ready',
  };
}

export function mergeResearchedTopics(current, incoming) {
  const taken = collectTakenWork();
  const existing = new Map((current.topics || []).map((topic) => [normalizeQuery(topic.query), topic]));
  const incomingReady = [];
  for (const raw of incoming) {
    const topic = normalizeTopic(raw);
    if (!topic.query || topic.query.length < 8) continue;
    const issues = collisionIssues(undefined, { slug: topic.slug, query: topic.query }, { taken, extra: incomingReady, mode: 'plan' });
    if (issues.length) {
      markRejected(topic, issues[0]);
      existing.set(normalizeQuery(topic.query), topic);
      continue;
    }
    const previous = existing.get(normalizeQuery(topic.query));
    if (previous?.status === 'used' || previous?.status === 'claimed') {
      existing.set(normalizeQuery(topic.query), previous);
      continue;
    }
    const next = { ...previous, ...topic, status: 'ready', rejectReason: undefined };
    existing.set(normalizeQuery(topic.query), next);
    incomingReady.push(next);
  }
  return sweepOverlaps({ topics: [...existing.values()] }, { mode: 'plan' }).topics
    .sort((a, b) => {
      const rank = { ready: 0, claimed: 1, used: 2, rejected: 3 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || (b.score || 0) - (a.score || 0);
    });
}

export function topicPlan(bank) {
  return planningSnapshot(bank);
}

export function topicLockPath() {
  return LOCK_FILE;
}

export function topicsFileExists() {
  return existsSync(TOPICS_FILE);
}
