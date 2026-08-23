import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RUNTIME = join(ROOT, '.content-studio');

export const QUERY_SEEDS = [
  'how to identify AI use cases in a small company',
  'which workflow should we automate with AI first',
  'RAG vs workflow vs AI agent',
  'when does an LLM need tools',
  'how to connect an LLM to existing business systems',
  'how to scope an AI product pilot',
  'how to evaluate an AI feature before release',
  'what should a product team learn before using AI',
  'should we train our team or hire an AI agency',
  'how to choose an AI consultant',
  'build vs buy an AI agent',
  'when not to use an AI agent',
  'AI agent permissions and tool access',
  'how to test an AI agent',
  'prompt injection in AI agents',
  'AI agent for internal knowledge',
  'how non-engineers ship with AI',
  'what data do you need for an AI pilot',
  'AI consulting vs internal team',
  'how to make an existing team capable of building AI products',
  'AI misconceptions in corporate workshops',
  'what product managers need to understand about AI',
  'RAG vs workflow vs agent for a first internal tool',
  'how beginners debug AI applications',
  'what 100000 AI learners get stuck on',
];

export function normalizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const GENERIC_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'or', 'and', 'vs', 'versus',
  'how', 'what', 'why', 'when', 'which', 'should', 'can', 'do', 'does', 'is', 'are',
  'i', 'you', 'my', 'your', 'we', 'our', 'it', 'its', 'this', 'that', 'as', 'so', 'if',
  'ai', 'agent', 'agents', 'llm', 'llms', 'system', 'systems',
  'use', 'using', 'used', 'with', 'without', 'from', 'into', 'over', 'after', 'before',
  'between', 'instead', 'multiple', 'single', 'internal', 'one', 'own', 'out',
  'safe', 'safely', 'really', 'actually', 'still',
]);

const ICP_WORDS = new Set([
  'business', 'team', 'teams', 'founder', 'founders', 'nontechnical', 'non', 'technical',
  'company', 'companies', 'organization', 'org', 'buyer', 'buyers', 'operator', 'operators',
  'engineer', 'engineers', 'engineering', 'product', 'ops', 'operations',
]);

const VERB_STEMS = new Map([
  ['learn', 'learn'], ['learning', 'learn'], ['teach', 'learn'],
  ['build', 'build'], ['building', 'build'], ['create', 'build'], ['creating', 'build'],
  ['design', 'design'], ['designing', 'design'],
  ['test', 'test'], ['testing', 'test'],
  ['evaluate', 'eval'], ['evaluation', 'eval'], ['eval', 'eval'],
  ['monitor', 'monitor'], ['monitoring', 'monitor'], ['observability', 'monitor'],
  ['prevent', 'prevent'], ['preventing', 'prevent'], ['stop', 'prevent'],
  ['choose', 'choose'], ['choosing', 'choose'], ['pick', 'choose'],
  ['buy', 'buy'], ['buying', 'buy'], ['purchase', 'buy'],
  ['remember', 'remember'], ['remembering', 'remember'],
  ['give', 'give'], ['giving', 'give'],
  ['ask', 'ask'], ['asking', 'ask'],
  ['calculate', 'calculate'], ['calculating', 'calculate'],
  ['scope', 'scope'], ['scoping', 'scope'],
  ['update', 'update'], ['updating', 'update'],
  ['triage', 'triage'],
  ['set', 'set'], ['setting', 'set'],
  ['make', 'make'], ['making', 'make'],
  ['hire', 'hire'], ['hiring', 'hire'],
  ['replay', 'replay'],
]);

function queryTokens(value) {
  return normalizeQuery(value).split(' ').filter(Boolean);
}

export function querySignature(value) {
  const raw = queryTokens(value);
  const distinctive = raw.filter((token) => token.length >= 3 && !GENERIC_WORDS.has(token));
  const stripped = distinctive.filter((token) => !ICP_WORDS.has(token));
  const verbs = [...new Set(stripped.map((token) => VERB_STEMS.get(token)).filter(Boolean))];
  const objects = stripped.filter((token) => !VERB_STEMS.has(token));
  const grams = [];
  for (let size = 3; size <= 4; size += 1) {
    for (let index = 0; index <= raw.length - size; index += 1) {
      const slice = raw.slice(index, index + size);
      if (slice.filter((token) => !GENERIC_WORDS.has(token)).length >= 2) grams.push(slice.join(' '));
    }
  }
  return { raw, distinctive, stripped, verbs, objects, grams };
}

export function overlapReason(left, right, mode = 'hard') {
  const aQuery = String(left || '').trim();
  const bQuery = String(right || '').trim();
  if (!aQuery || !bQuery) return null;
  if (normalizeQuery(aQuery) === normalizeQuery(bQuery)) return 'exact query match';
  if (slugify(aQuery) && slugify(aQuery) === slugify(bQuery)) return 'same slug';
  const leftSig = querySignature(aQuery);
  const rightSig = querySignature(bQuery);
  const sharedDistinct = leftSig.distinctive.filter((token) => rightSig.distinctive.includes(token));
  const unionDistinct = new Set([...leftSig.distinctive, ...rightSig.distinctive]);
  const distinctScore = unionDistinct.size ? sharedDistinct.length / unionDistinct.size : 0;
  if (sharedDistinct.length >= 2 && distinctScore > 0.55) {
    return `overlaps "${sharedDistinct.join(', ')}"`;
  }
  const sharedStripped = leftSig.stripped.filter((token) => rightSig.stripped.includes(token));
  const unionStripped = new Set([...leftSig.stripped, ...rightSig.stripped]);
  const strippedScore = unionStripped.size ? sharedStripped.length / unionStripped.size : 0;
  if (sharedStripped.length >= 2 && strippedScore > 0.55) {
    return `overlaps "${sharedStripped.join(', ')}"`;
  }
  if (sharedStripped.length >= 2 && (sharedStripped.length === leftSig.stripped.length || sharedStripped.length === rightSig.stripped.length)) {
    return 'one query is a subset of the other';
  }
  const sharedGram = leftSig.grams.find((gram) => rightSig.grams.includes(gram));
  if (sharedGram) {
    const gramHasVerb = sharedGram.split(' ').some((token) => VERB_STEMS.has(token));
    const sameVerb = leftSig.verbs.some((verb) => rightSig.verbs.includes(verb));
    if (gramHasVerb || sameVerb) return `shared phrase "${sharedGram}"`;
    if (mode === 'plan') return `same object as "${bQuery}"`;
  }
  const sameVerb = leftSig.verbs.find((verb) => rightSig.verbs.includes(verb));
  const emptyOrSameObject = (
    (leftSig.objects.length === 0 && rightSig.objects.length === 0)
    || (leftSig.objects.length === 1 && rightSig.objects.length === 1 && leftSig.objects[0] === rightSig.objects[0])
  );
  if (sameVerb && emptyOrSameObject && leftSig.stripped.length && rightSig.stripped.length && strippedScore >= 0.5) {
    return `same job as "${bQuery}"`;
  }
  if (mode === 'plan') {
    const sharedObjects = leftSig.objects.filter((token) => rightSig.objects.includes(token));
    if (sharedObjects.length >= 1 && leftSig.objects.length <= 2 && rightSig.objects.length <= 2) {
      return `same object "${sharedObjects[0]}"`;
    }
  }
  return null;
}

function addTaken(taken, { slug, query, aliases, title, source }) {
  const owner = title || slug || query || source;
  if (slug) taken.slugs.set(slugify(slug), owner);
  const queries = [query, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean);
  for (const item of queries) {
    const key = normalizeQuery(item);
    if (key) taken.queries.set(key, owner);
  }
}

function parseFrontmatter(source) {
  const block = source.match(/^---\n([\s\S]*?)\n---/);
  if (!block) return {};
  const body = block[1];
  const pick = (name) => body.match(new RegExp(`^${name}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'))?.[1];
  const aliases = [];
  const aliasBlock = body.match(/^queryAliases:\n((?:[ \t]+- .+\n)+)/m);
  if (aliasBlock) {
    for (const line of aliasBlock[1].split('\n')) {
      const value = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/)?.[1];
      if (value) aliases.push(value);
    }
  }
  return {
    title: pick('title'),
    targetQuery: pick('targetQuery'),
    cluster: pick('cluster'),
    aliases,
  };
}

function readJobTaken(jobId) {
  const dir = join(RUNTIME, 'jobs', jobId);
  const out = { slug: '', query: '', aliases: [], title: '' };
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    out.slug = manifest.slug || '';
    out.title = manifest.title || '';
  } catch { /* no manifest yet */ }
  try {
    const post = parseFrontmatter(readFileSync(join(dir, 'post.mdx'), 'utf8'));
    out.title = out.title || post.title || '';
    out.query = post.targetQuery || '';
    out.aliases = post.aliases || [];
  } catch { /* no post yet */ }
  try {
    const idea = JSON.parse(readFileSync(join(dir, 'idea.md'), 'utf8'));
    out.query = out.query || idea.query || idea.targetQuery || '';
    out.title = out.title || idea.title || '';
    out.slug = out.slug || idea.slug || '';
  } catch { /* idea may be markdown */ }
  return out;
}

export function listOwnedPosts() {
  const posts = [];
  try {
    for (const file of readdirSync(join(ROOT, 'content/blog'))) {
      if (!file.endsWith('.mdx') || file.startsWith('_')) continue;
      const source = readFileSync(join(ROOT, 'content/blog', file), 'utf8');
      const meta = parseFrontmatter(source);
      posts.push({
        slug: file.replace(/\.mdx$/, ''),
        title: meta.title || file.replace(/\.mdx$/, ''),
        query: meta.targetQuery || '',
        cluster: meta.cluster || '',
      });
    }
  } catch { /* no blog dir */ }
  return posts.sort((left, right) => left.slug.localeCompare(right.slug));
}

function inactiveJobIds() {
  const inactive = new Set();
  try {
    const queue = JSON.parse(readFileSync(join(RUNTIME, 'queue.json'), 'utf8'));
    for (const job of queue.jobs || []) {
      if (job?.id && (job.status === 'failed' || job.status === 'published')) inactive.add(job.id);
    }
  } catch { /* no queue */ }
  return inactive;
}

export function collectTakenWork(exceptJobId) {
  const taken = { slugs: new Map(), queries: new Map(), titles: new Map() };
  const exceptSlug = exceptJobId ? slugify(readJobTaken(exceptJobId).slug) : '';
  const inactive = inactiveJobIds();

  try {
    for (const file of readdirSync(join(ROOT, 'content/blog'))) {
      if (!file.endsWith('.mdx') || file.startsWith('_')) continue;
      const slug = file.replace(/\.mdx$/, '');
      if (exceptSlug && slug === exceptSlug) continue;
      const source = readFileSync(join(ROOT, 'content/blog', file), 'utf8');
      const meta = parseFrontmatter(source);
      addTaken(taken, {
        slug,
        query: meta.targetQuery,
        aliases: meta.aliases,
        title: meta.title,
        source: 'published',
      });
    }
  } catch { /* no blog dir */ }

  try {
    for (const file of readdirSync(join(ROOT, 'content/essays'))) {
      if (!file.endsWith('.mdx')) continue;
      addTaken(taken, { slug: file.replace(/\.mdx$/, ''), title: file, source: 'essay' });
    }
  } catch { /* no essays */ }

  try {
    const queue = JSON.parse(readFileSync(join(RUNTIME, 'queue.json'), 'utf8'));
    for (const job of queue.jobs || []) {
      if (!job?.id || job.id === exceptJobId) continue;
      if (job.status === 'failed' || job.status === 'published') continue;
      const fromFiles = existsSync(join(RUNTIME, 'jobs', job.id)) ? readJobTaken(job.id) : {};
      addTaken(taken, {
        slug: job.slug || fromFiles.slug,
        query: job.topic || fromFiles.query,
        aliases: fromFiles.aliases,
        title: job.title || fromFiles.title,
        source: `job ${job.id}`,
      });
    }
  } catch { /* no queue */ }

  try {
    for (const id of readdirSync(join(RUNTIME, 'jobs'))) {
      if (id === exceptJobId || id === 'topic-research' || String(id).startsWith('e2e-')) continue;
      if (inactive.has(id)) continue;
      const fromFiles = readJobTaken(id);
      if (!fromFiles.slug && !fromFiles.query) continue;
      addTaken(taken, { ...fromFiles, source: `job ${id}` });
    }
  } catch { /* no jobs */ }

  return taken;
}

export function formatTakenWork(taken) {
  const lines = ['Already owned queries and slugs. Do not write another post about any of these:'];
  const seen = new Set();
  for (const [slug, owner] of taken.slugs) {
    lines.push(`- slug ${slug} (${owner})`);
    seen.add(slug);
  }
  for (const [query, owner] of taken.queries) {
    const asSlug = slugify(query);
    if (seen.has(asSlug)) continue;
    lines.push(`- query "${query}" (${owner})`);
  }
  if (lines.length === 1) lines.push('- (none yet)');
  return lines.join('\n');
}

/**
 * @param {string | undefined} exceptJobId
 * @param {{ slug?: string, query?: string, aliases?: string[] }} [candidate]
 * @param {{ taken?: object, extra?: object[], mode?: string, ignore?: string[] }} [options]
 * @returns {string[]}
 */
export function collisionIssues(exceptJobId, candidate = {}, options = {}) {
  const { slug, query, aliases = [] } = candidate;
  const taken = options.taken || collectTakenWork(exceptJobId);
  const extras = Array.isArray(options.extra) ? options.extra : [];
  const mode = options.mode === 'plan' ? 'plan' : 'hard';
  const ignore = Array.isArray(options.ignore) ? options.ignore : [];
  const issues = [];
  const seen = new Set();
  const remember = (issue) => {
    if (!issue || seen.has(issue)) return;
    if (ignore.some((token) => issue.includes(token))) return;
    seen.add(issue);
    issues.push(issue);
  };

  const cleanSlug = slugify(slug || query);
  if (cleanSlug && taken.slugs.has(cleanSlug)) {
    remember(`slug "${cleanSlug}" is already owned by ${taken.slugs.get(cleanSlug)}; pick a different query and slug`);
  }
  const checks = [query, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean);
  for (const item of checks) {
    const key = normalizeQuery(item);
    if (key && taken.queries.has(key)) {
      remember(`query "${item}" is already owned by ${taken.queries.get(key)}; pick a different reader job`);
    }
  }

  const ownedQueries = [
    ...taken.queries.keys(),
    ...extras.map((item) => item?.query || item).filter(Boolean),
  ];
  for (const item of checks) {
    for (const owned of ownedQueries) {
      const reason = overlapReason(item, owned, mode);
      if (!reason) continue;
      const owner = taken.queries.get(normalizeQuery(owned)) || owned;
      remember(`query "${item}" ${reason} (${owner}); pick a different reader job`);
    }
  }
  if (cleanSlug) {
    for (const [ownedSlug, owner] of taken.slugs) {
      const reason = overlapReason(cleanSlug.replace(/-/g, ' '), ownedSlug.replace(/-/g, ' '), mode);
      if (reason) remember(`slug "${cleanSlug}" ${reason} (${owner}); pick a different slug`);
    }
    for (const extra of extras) {
      const extraSlug = slugify(extra?.slug || extra?.query || extra);
      if (!extraSlug) continue;
      const reason = overlapReason(cleanSlug.replace(/-/g, ' '), extraSlug.replace(/-/g, ' '), mode);
      if (reason) remember(`slug "${cleanSlug}" ${reason} (${extraSlug}); pick a different slug`);
    }
  }
  return issues;
}

export function planningSnapshot(bank) {
  const topics = Array.isArray(bank?.topics) ? bank.topics : [];
  const owned = listOwnedPosts();
  return {
    owned,
    ready: topics.filter((topic) => topic.status === 'ready'),
    claimed: topics.filter((topic) => topic.status === 'claimed'),
    used: topics.filter((topic) => topic.status === 'used'),
    rejected: topics.filter((topic) => topic.status === 'rejected'),
    ownedCount: owned.length,
    readyCount: topics.filter((topic) => topic.status === 'ready').length,
    claimedCount: topics.filter((topic) => topic.status === 'claimed').length,
  };
}

export function unusedQuerySeeds(count, extraTaken = []) {
  const taken = collectTakenWork();
  const blocked = new Set([
    ...taken.queries.keys(),
    ...taken.slugs.keys(),
    ...extraTaken.map(normalizeQuery),
    ...extraTaken.map(slugify),
  ]);
  const unused = QUERY_SEEDS.filter((seed) => !blocked.has(normalizeQuery(seed)) && !blocked.has(slugify(seed)));
  return unused.slice(0, Math.max(0, count));
}
