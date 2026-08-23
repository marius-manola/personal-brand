import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, 'content', 'blog');
const RUNTIME = join(ROOT, '.content-studio');
const GROWTH_DIR = join(RUNTIME, 'growth');
const SEARCH_FILE = join(GROWTH_DIR, 'search-console.json');
const INSPECTION_FILE = join(GROWTH_DIR, 'url-inspection.json');
const GEO_FILE = join(GROWTH_DIR, 'geo-runs.json');
const CYCLE_FILE = join(GROWTH_DIR, 'cycle.json');
const DISTRIBUTION_FILE = join(GROWTH_DIR, 'distribution.json');
const SITE_URL = process.env.CONTENT_STUDIO_SITE_URL || 'https://www.mariusmanolachi.com';
const DAY = 86_400_000;

const CLUSTER_LABELS = {
  opportunity: 'AI opportunities',
  architecture: 'AI architecture',
  implementation: 'AI implementation',
  evaluation: 'AI evaluation',
  capability: 'AI capability',
  commercial: 'AI buying decisions',
};

function canonicalCluster(value) {
  const raw = String(value || '').toLowerCase();
  if (Object.hasOwn(CLUSTER_LABELS, raw)) return raw;
  if (/architect|rag|model|system.design|memory|agent.design/.test(raw)) return 'architecture';
  if (/implement|build|deploy|integrat|migrat|tool/.test(raw)) return 'implementation';
  if (/evaluat|reliab|quality|observ|test|monitor|failure|debug|security|safe/.test(raw)) return 'evaluation';
  if (/capab|learn|team|skill|tutor|training/.test(raw)) return 'capability';
  if (/commercial|consult|agency|hire|buy|cost|roi|budget|vendor/.test(raw)) return 'commercial';
  return 'opportunity';
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function writeJson(file, value) {
  await mkdir(GROWTH_DIR, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await rename(temporary, file);
  return value;
}

function day(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function slugFromUrl(value) {
  try {
    const path = new URL(value, SITE_URL).pathname;
    return path.startsWith('/blog/') ? path.split('/')[2] || '' : '';
  } catch { return ''; }
}

function cleanRow(raw) {
  const keys = Array.isArray(raw.keys) ? raw.keys : [];
  const date = String(raw.date || keys.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value))) || '');
  const page = String(raw.page || keys.find((value) => /^https?:\/\//.test(String(value))) || '');
  const query = String(raw.query || keys.find((value) => value !== date && value !== page) || '').trim();
  return {
    date,
    page,
    slug: String(raw.slug || slugFromUrl(page)),
    query,
    clicks: Math.max(0, Number(raw.clicks) || 0),
    impressions: Math.max(0, Number(raw.impressions) || 0),
    ctr: Math.max(0, Number(raw.ctr) || 0),
    position: Math.max(0, Number(raw.position) || 0),
  };
}

function mergeRows(current, incoming) {
  const rows = new Map();
  for (const raw of [...current, ...incoming]) {
    const row = cleanRow(raw);
    if (!row.page && !row.slug) continue;
    const key = `${row.date}|${row.page || row.slug}|${row.query}`;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date) || b.impressions - a.impressions).slice(0, 50_000);
}

export async function importSearchPerformance(input, source = 'manual') {
  const existing = await readJson(SEARCH_FILE, { rows: [] });
  const candidateRows = Array.isArray(input) ? input : Array.isArray(input?.rows) ? input.rows : [];
  const rows = mergeRows(existing.rows || [], candidateRows);
  return writeJson(SEARCH_FILE, {
    rows,
    source,
    importedAt: new Date().toISOString(),
    property: process.env.SEARCH_CONSOLE_SITE_URL || existing.property || '',
  });
}

function accessToken() {
  return process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || process.env.SEARCH_CONSOLE_ACCESS_TOKEN || '';
}

export async function syncSearchConsole({ force = false } = {}) {
  const token = accessToken();
  const property = process.env.SEARCH_CONSOLE_SITE_URL || '';
  const existing = await readJson(SEARCH_FILE, { rows: [] });
  if (!token || !property) return { ok: false, configured: false, reason: 'Set SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN.' };
  const last = Date.parse(existing.syncedAt || '');
  if (!force && Number.isFinite(last) && Date.now() - last < 20 * 60 * 60 * 1000) {
    return { ok: true, configured: true, skipped: true, rows: existing.rows?.length || 0 };
  }
  const end = new Date(Date.now() - 3 * DAY);
  const start = new Date(end.getTime() - 34 * DAY);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: day(start), endDate: day(end), dimensions: ['date', 'page', 'query'],
      type: 'web', rowLimit: 25_000, dataState: 'final', aggregationType: 'byPage',
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Search Console sync failed (${response.status}): ${(await response.text()).slice(0, 240)}`);
  const payload = await response.json();
  const rows = mergeRows(existing.rows || [], payload.rows || []);
  await writeJson(SEARCH_FILE, { rows, source: 'api', property, syncedAt: new Date().toISOString() });
  return { ok: true, configured: true, rows: rows.length };
}

function readPosts() {
  const posts = [];
  for (const file of readdirSync(BLOG_DIR)) {
    if (!file.endsWith('.mdx') || file.startsWith('_')) continue;
    const source = readFileSync(join(BLOG_DIR, file), 'utf8');
    const parsed = matter(source);
    if (parsed.data.draft === true) continue;
    posts.push({
      slug: file.replace(/\.mdx$/, ''),
      title: String(parsed.data.title || file),
      date: String(parsed.data.date || ''),
      updated: String(parsed.data.updated || parsed.data.date || ''),
      query: String(parsed.data.targetQuery || ''),
      cluster: canonicalCluster(parsed.data.cluster || `${parsed.data.targetQuery || ''} ${parsed.data.title || ''}`),
      contentType: String(parsed.data.contentType || 'legacy'),
      parent: String(parsed.data.parent || ''),
      sourceableAtom: String(parsed.data.sourceableAtom || ''),
      evidenceBasis: String(parsed.data.evidenceBasis || ''),
      sources: Array.isArray(parsed.data.sources) ? parsed.data.sources.map(String) : [],
      links: [...parsed.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((match) => match[1]),
      wordCount: parsed.content.split(/\s+/).filter(Boolean).length,
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

function performanceBySlug(rows) {
  const map = new Map();
  for (const raw of rows) {
    const row = cleanRow(raw);
    if (!row.slug) continue;
    const value = map.get(row.slug) || { clicks: 0, impressions: 0, weightedPosition: 0, queries: new Map(), recentImpressions: 0 };
    value.clicks += row.clicks;
    value.impressions += row.impressions;
    value.weightedPosition += row.position * row.impressions;
    if (row.date >= day(new Date(Date.now() - 7 * DAY))) value.recentImpressions += row.impressions;
    if (row.query) {
      const query = value.queries.get(row.query) || { query: row.query, clicks: 0, impressions: 0, weightedPosition: 0 };
      query.clicks += row.clicks;
      query.impressions += row.impressions;
      query.weightedPosition += row.position * row.impressions;
      value.queries.set(row.query, query);
    }
    map.set(row.slug, value);
  }
  return map;
}

function lifecycleFor(post, performance, inspection) {
  const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(`${post.date}T00:00:00Z`)) / DAY));
  const impressions = performance?.impressions || 0;
  const clicks = performance?.clicks || 0;
  const position = impressions ? performance.weightedPosition / impressions : 0;
  const indexed = inspection?.verdict === 'PASS' || inspection?.coverageState?.toLowerCase().includes('indexed');
  const coverageState = String(inspection?.coverageState || '');
  let state = ageDays < 3 ? 'watching' : 'developing';
  let action = ageDays < 3 ? 'Wait for the first finalized search data.' : 'Strengthen evidence and contextual inbound links.';
  if (/page with redirect/i.test(coverageState)) { state = 'not-indexed'; action = 'Replace links to this redirecting variant with its final canonical URL.'; }
  else if (/duplicate without user-selected canonical/i.test(coverageState)) { state = 'not-indexed'; action = 'Add or repair the self-canonical, then align sitemap and internal links.'; }
  else if (indexed === false && ageDays >= 3) { state = 'not-indexed'; action = 'Inspect crawl/indexing reason and reinforce discovery.'; }
  else if (impressions >= 20 && position > 0 && position <= 15) { state = 'winner'; action = 'Publish supporting URLs and add inbound links.'; }
  else if (impressions >= 20 && clicks / impressions < 0.015) { state = 'ctr-opportunity'; action = 'Test a clearer title and search promise.'; }
  else if (impressions === 0 && ageDays >= 28) { state = 'invisible'; action = 'Re-scope query ownership or consolidate with a stronger URL.'; }
  return { ageDays, impressions, clicks, ctr: impressions ? clicks / impressions : 0, position, indexed, state, action };
}

function evidenceScore(post) {
  let score = 0;
  if (post.sourceableAtom.length >= 40) score += 25;
  if (post.evidenceBasis.length >= 50) score += 25;
  if (post.sources.length >= 3) score += 20;
  if (post.wordCount >= 1200) score += 10;
  if (post.contentType !== 'legacy') score += 10;
  if (/observ|measur|tested|built|count|reproduc|dataset|benchmark/i.test(post.evidenceBasis)) score += 10;
  return Math.min(100, score);
}

export async function inspectRecentUrls({ force = false, limit = 24 } = {}) {
  const token = accessToken();
  const property = process.env.SEARCH_CONSOLE_SITE_URL || '';
  if (!token || !property) return { ok: false, configured: false };
  const existing = await readJson(INSPECTION_FILE, { urls: {} });
  const posts = readPosts().slice(0, limit);
  let changed = false;
  for (const post of posts) {
    const url = `${SITE_URL}/blog/${post.slug}`;
    const previous = existing.urls?.[url];
    if (!force && previous?.checkedAt && Date.now() - Date.parse(previous.checkedAt) < 3 * DAY) continue;
    const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: property, languageCode: 'en-US' }),
      cache: 'no-store',
    });
    if (!response.ok) continue;
    const payload = await response.json();
    const result = payload.inspectionResult?.indexStatusResult || {};
    existing.urls ||= {};
    existing.urls[url] = { ...result, checkedAt: new Date().toISOString() };
    changed = true;
  }
  if (changed) await writeJson(INSPECTION_FILE, { ...existing, syncedAt: new Date().toISOString() });
  return { ok: true, configured: true, inspected: Object.keys(existing.urls || {}).length };
}

export async function recordGeoRun(input) {
  const store = await readJson(GEO_FILE, { prompts: [], runs: [] });
  const record = {
    id: String(input.id || `${Date.now()}`),
    date: String(input.date || new Date().toISOString()),
    engine: String(input.engine || '').slice(0, 40),
    prompt: String(input.prompt || input.query || '').slice(0, 500),
    variant: String(input.variant || '').slice(0, 200),
    searchActivated: input.searchActivated === true,
    retrieved: input.retrieved === true,
    cited: input.cited === true,
    prominent: input.prominent === true,
    absorbed: input.absorbed === true,
    url: String(input.url || '').slice(0, 400),
    atom: String(input.atom || '').slice(0, 600),
    notes: String(input.notes || '').slice(0, 800),
  };
  if (!record.engine || !record.prompt) throw new Error('Engine and prompt are required.');
  store.runs = [record, ...(store.runs || [])].slice(0, 5_000);
  await writeJson(GEO_FILE, { ...store, updatedAt: new Date().toISOString() });
  return record;
}

export async function importGeoPrompts(prompts) {
  const store = await readJson(GEO_FILE, { prompts: [], runs: [] });
  const clean = (Array.isArray(prompts) ? prompts : []).map((item, index) => ({
    id: String(item.id || `prompt-${index + 1}`),
    cluster: String(item.cluster || 'opportunity'),
    prompt: String(item.prompt || item.query || '').slice(0, 500),
    variants: (Array.isArray(item.variants) ? item.variants : []).map(String).slice(0, 3),
  })).filter((item) => item.prompt);
  return writeJson(GEO_FILE, { ...store, prompts: clean.slice(0, 100), updatedAt: new Date().toISOString() });
}

export async function queueDistributionHooks(manifest) {
  const store = await readJson(DISTRIBUTION_FILE, { items: [] });
  const slug = String(manifest.slug || '');
  const existing = new Set((store.items || []).map((item) => item.id));
  const additions = (Array.isArray(manifest.distribution) ? manifest.distribution : []).map((hook, index) => ({
    id: `${slug}:${index + 1}`,
    slug,
    title: String(manifest.title || slug),
    url: `${SITE_URL}/blog/${slug}`,
    channel: String(hook.channel || 'community'),
    audience: String(hook.audience || ''),
    angle: String(hook.angle || ''),
    status: 'ready',
    createdAt: new Date().toISOString(),
  })).filter((item) => item.slug && item.angle && !existing.has(item.id));
  store.items = [...additions, ...(store.items || [])].slice(0, 1_000);
  await writeJson(DISTRIBUTION_FILE, { ...store, updatedAt: new Date().toISOString() });
  return additions;
}

export async function updateDistributionItem(id, status) {
  const allowed = new Set(['ready', 'published', 'skipped']);
  if (!allowed.has(status)) throw new Error('Invalid distribution status.');
  const store = await readJson(DISTRIBUTION_FILE, { items: [] });
  const item = (store.items || []).find((candidate) => candidate.id === id);
  if (!item) throw new Error('Distribution item not found.');
  item.status = status;
  item.updatedAt = new Date().toISOString();
  await writeJson(DISTRIBUTION_FILE, { ...store, updatedAt: new Date().toISOString() });
  return item;
}

function geoSummary(store) {
  const runs = store.runs || [];
  const count = runs.length;
  const pct = (field) => count ? runs.filter((run) => run[field]).length / count : 0;
  const byEngine = Object.values(runs.reduce((acc, run) => {
    const key = run.engine || 'Unknown';
    acc[key] ||= { engine: key, runs: 0, cited: 0, absorbed: 0, referrals: 0 };
    acc[key].runs += 1;
    if (run.cited) acc[key].cited += 1;
    if (run.absorbed) acc[key].absorbed += 1;
    return acc;
  }, {}));
  return { count, searchRate: pct('searchActivated'), retrievalRate: pct('retrieved'), citationRate: pct('cited'), absorptionRate: pct('absorbed'), byEngine };
}

export async function getControlPlaneSnapshot() {
  const [search, inspections, geo, distribution] = await Promise.all([
    readJson(SEARCH_FILE, { rows: [] }), readJson(INSPECTION_FILE, { urls: {} }), readJson(GEO_FILE, { prompts: [], runs: [] }),
    readJson(DISTRIBUTION_FILE, { items: [] }),
  ]);
  const posts = readPosts();
  const promptPanel = (geo.prompts || []).length ? geo.prompts : posts
    .filter((post) => post.query)
    .filter((post, index, all) => all.findIndex((candidate) => candidate.cluster === post.cluster && candidate.query === post.query) === index)
    .sort((left, right) => left.cluster.localeCompare(right.cluster) || right.date.localeCompare(left.date))
    .reduce((selected, post) => {
      if (selected.filter((item) => item.cluster === post.cluster).length >= 5) return selected;
      selected.push({
        id: `auto-${post.slug}`, cluster: post.cluster, prompt: post.query,
        variants: [post.query, `${post.query} for a small team`, `${post.query} with practical evidence`],
      });
      return selected;
    }, []).slice(0, 30);
  const performance = performanceBySlug(search.rows || []);
  const queryOwners = new Map();
  for (const raw of search.rows || []) {
    const row = cleanRow(raw);
    if (!row.query || !row.slug || row.impressions < 1) continue;
    const owners = queryOwners.get(row.query) || new Map();
    owners.set(row.slug, (owners.get(row.slug) || 0) + row.impressions);
    queryOwners.set(row.query, owners);
  }
  const cannibalizedBySlug = new Map();
  for (const [query, owners] of queryOwners) {
    const material = [...owners.entries()].filter(([, impressions]) => impressions >= 2);
    if (material.length < 2) continue;
    for (const [slug] of material) {
      const list = cannibalizedBySlug.get(slug) || [];
      list.push(query);
      cannibalizedBySlug.set(slug, list);
    }
  }
  const inbound = new Map(posts.map((post) => [post.slug, 0]));
  for (const post of posts) for (const target of new Set(post.links)) if (inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
  const urls = posts.map((post) => {
    const perf = performance.get(post.slug);
    const inspection = inspections.urls?.[`${SITE_URL}/blog/${post.slug}`];
    const queries = perf ? [...perf.queries.values()].map((query) => ({
      ...query, position: query.impressions ? query.weightedPosition / query.impressions : 0,
    })).sort((a, b) => b.impressions - a.impressions).slice(0, 5) : [];
    const lifecycle = lifecycleFor(post, perf, inspection);
    const cannibalizedQueries = cannibalizedBySlug.get(post.slug) || [];
    if (cannibalizedQueries.length) {
      lifecycle.state = 'cannibalized';
      lifecycle.action = `Choose one owner for: ${cannibalizedQueries.slice(0, 2).join(', ')}. Consolidate intent and rewire links.`;
    }
    return {
      ...post,
      inboundLinks: inbound.get(post.slug) || 0,
      outboundLinks: new Set(post.links).size,
      evidenceScore: evidenceScore(post),
      queries,
      cannibalizedQueries,
      coverageState: inspection?.coverageState || '',
      userCanonical: inspection?.userCanonical || '',
      googleCanonical: inspection?.googleCanonical || '',
      ...lifecycle,
    };
  });
  const totals = urls.reduce((acc, item) => {
    acc.clicks += item.clicks; acc.impressions += item.impressions;
    if (item.indexed) acc.indexed += 1;
    if (item.state === 'winner') acc.winners += 1;
    if (item.inboundLinks === 0) acc.withoutContextualInbound += 1;
    return acc;
  }, { clicks: 0, impressions: 0, indexed: 0, winners: 0, withoutContextualInbound: 0 });
  const clusters = Object.entries(CLUSTER_LABELS).map(([id, label]) => {
    const children = urls.filter((item) => item.cluster === id);
    return {
      id, label, posts: children.length,
      clicks: children.reduce((sum, item) => sum + item.clicks, 0),
      impressions: children.reduce((sum, item) => sum + item.impressions, 0),
      winners: children.filter((item) => item.state === 'winner').length,
      avgEvidence: children.length ? Math.round(children.reduce((sum, item) => sum + item.evidenceScore, 0) / children.length) : 0,
    };
  });
  const inspectedUrls = urls.filter((item) => item.coverageState);
  const technical = {
    canonicalOrigin: SITE_URL,
    sitemapUrl: `${SITE_URL}/sitemap.xml`,
    inspected: inspectedUrls.length,
    pageWithRedirect: inspectedUrls.filter((item) => /page with redirect/i.test(item.coverageState)).length,
    duplicateWithoutCanonical: inspectedUrls.filter((item) => /duplicate without user-selected canonical/i.test(item.coverageState)).length,
    canonicalMismatch: inspectedUrls.filter((item) => item.userCanonical && item.userCanonical !== `${SITE_URL}/blog/${item.slug}`).length,
  };
  return {
    generatedAt: new Date().toISOString(),
    configuration: {
      searchConsole: Boolean(accessToken() && process.env.SEARCH_CONSOLE_SITE_URL),
      searchConsoleProperty: process.env.SEARCH_CONSOLE_SITE_URL || '',
      searchSource: search.source || 'none',
      searchUpdatedAt: search.syncedAt || search.importedAt || null,
    },
    totals: { ...totals, urls: urls.length, ctr: totals.impressions ? totals.clicks / totals.impressions : 0 },
    technical,
    clusters,
    urls: urls.sort((a, b) => b.impressions - a.impressions || b.date.localeCompare(a.date)),
    opportunities: urls.filter((item) => ['winner', 'ctr-opportunity', 'invisible', 'not-indexed', 'cannibalized'].includes(item.state)).slice(0, 40),
    geo: { prompts: promptPanel, recentRuns: (geo.runs || []).slice(0, 100), ...geoSummary(geo) },
    distribution: distribution.items || [],
  };
}

export async function growthPromptContext() {
  const snapshot = await getControlPlaneSnapshot();
  const winners = snapshot.urls.filter((item) => item.state === 'winner').slice(0, 8);
  const opportunities = snapshot.urls.filter((item) => item.impressions >= 5 && item.position >= 5 && item.position <= 30).slice(0, 12);
  const lines = [
    'OBSERVED SEARCH PERFORMANCE (use as demand evidence; do not invent missing volume):',
    winners.length ? `Winning pages/clusters: ${winners.map((item) => `${item.query || item.title} [${item.cluster}; ${item.impressions} impressions; pos ${item.position.toFixed(1)}]`).join(' | ')}` : 'No mature winners yet.',
    opportunities.length ? `Expansion opportunities: ${opportunities.map((item) => `${item.query || item.title} [${item.impressions} impressions; pos ${item.position.toFixed(1)}; queries ${item.queries.map((query) => query.query).join(', ')}]`).join(' | ')}` : 'No Search Console expansion data yet; use live SERP evidence for exploration topics.',
    'Daily portfolio target: 3 proven-demand expansions, 2 adjacent cluster gaps, 1 fresh demand topic, 1 commercial decision, 1 flagship evidence post. Content type is an independent format choice.',
    'Score candidates: 30 observed demand + 20 ranking opportunity + 15 cluster momentum + 15 unique evidence + 10 AI-engine source gap + 10 business fit.',
  ];
  return lines.join('\n');
}

export async function maybeRunGrowthCycle() {
  const cycle = await readJson(CYCLE_FILE, {});
  const last = Date.parse(cycle.lastRunAt || '');
  if (Number.isFinite(last) && Date.now() - last < 20 * 60 * 60 * 1000) return { skipped: true };
  const result = { lastRunAt: new Date().toISOString(), search: null, inspection: null, errors: [] };
  try { result.search = await syncSearchConsole(); } catch (error) { result.errors.push(error instanceof Error ? error.message : String(error)); }
  try { result.inspection = await inspectRecentUrls(); } catch (error) { result.errors.push(error instanceof Error ? error.message : String(error)); }
  await writeJson(CYCLE_FILE, result);
  return result;
}

function tokens(value) {
  const stop = new Set(['the','and','for','with','from','that','this','how','what','when','why','should','into','your','their','before','after','agent','agents','ai']);
  return new Set(String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word)));
}

function similarity(left, right) {
  const a = tokens(left); const b = tokens(right);
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.max(1, new Set([...a, ...b]).size);
}

function appendRelated(source, target) {
  const href = `/blog/${target.slug}`;
  if (source.includes(`](${href})`)) return source;
  const line = `- [${target.title}](${href})`;
  const heading = '## Continue with a related field note';
  if (source.includes(heading)) {
    const start = source.indexOf(heading);
    const nextHeading = source.indexOf('\n## ', start + heading.length);
    const end = nextHeading === -1 ? source.length : nextHeading;
    const section = source.slice(start, end);
    const bullets = section.match(/^- \[[^\]]+\]\(\/blog\/[a-z0-9-]+\)$/gm) || [];
    if (bullets.length >= 6) return source;
    return `${source.slice(0, end).trimEnd()}\n${line}\n\n${source.slice(end).trimStart()}`.trimEnd() + '\n';
  }
  return `${source.trimEnd()}\n\n${heading}\n\n${line}\n`;
}

export async function strengthenInternalLinks(newSlug) {
  const posts = readPosts();
  const target = posts.find((post) => post.slug === newSlug);
  if (!target) return { changed: [], urls: [] };
  const parentSlug = target.parent.replace(/^\/blog\//, '');
  const ranked = posts.filter((post) => post.slug !== target.slug).map((post) => ({
    post,
    score: (post.slug === parentSlug ? 4 : 0) + (post.cluster === target.cluster ? 2 : 0)
      + similarity(`${post.title} ${post.query}`, `${target.title} ${target.query}`) * 5,
  })).sort((a, b) => b.score - a.score).slice(0, 4);
  const changed = [];
  for (const { post } of ranked) {
    const file = join(BLOG_DIR, `${post.slug}.mdx`);
    const source = await readFile(file, 'utf8');
    const next = appendRelated(source, target);
    if (next === source) continue;
    await writeFile(file, next, 'utf8');
    changed.push(`content/blog/${post.slug}.mdx`);
  }
  return { changed, urls: changed.map((file) => `${SITE_URL}/blog/${file.split('/').pop().replace(/\.mdx$/, '')}`) };
}
