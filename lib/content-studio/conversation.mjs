import matter from 'gray-matter';
import { extractFiles } from './extract-files.mjs';

export const SECTION_DONE = '===== SECTION_DONE =====';
export const TURN_DONE = '===== TURN_DONE =====';

export function wordCount(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`|~]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countPostWords(source) {
  const text = String(source || '');
  if (!text.trim()) return 0;
  try {
    return wordCount(matter(text).content);
  } catch {
    return wordCount(text);
  }
}

export function isSearchOrThinkingStatus(text) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return true;
  if (source.length > 160) return false;
  return /^(searching(\s+\d+\s+websites?)?|searching the web|thought for\b|thinking\b|working on it|browsing\b|reading\b)/i.test(source)
    || /searching \d+ websites?/i.test(source);
}

export function isHollowReply(text) {
  if (isSearchOrThinkingStatus(text)) return true;
  const source = String(text || '').trim();
  if (!source) return true;
  const without = source
    .replace(/===== [^=\n]+ =====/g, ' ')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[A-Za-z0-9_-]*\s*|\s*```$/g, '').trim())
    .replace(/```/g, ' ')
    .trim();
  return without.length < 40;
}

export function parseJsonBlock(text) {
  const source = String(text || '');
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : source;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = raw.slice(start, end + 1).replace(/[\r\n]+/g, ' ');
  try { return JSON.parse(candidate); } catch { return null; }
}

function unwrapFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```(?:[A-Za-z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  return match ? match[1].trim() : trimmed;
}

export function parseBrief(text) {
  if (isSearchOrThinkingStatus(text) || isHollowReply(text)) return null;
  const json = parseJsonBlock(text);
  if (json && Array.isArray(json.sections) && json.sections.length) {
    return {
      title: String(json.title || ''),
      slug: String(json.slug || ''),
      targetQuery: String(json.targetQuery || json.query || ''),
      excerpt: String(json.excerpt || ''),
      answer: String(json.answer || ''),
      cta: String(json.cta || ''),
      sources: Array.isArray(json.sources) ? json.sources.map(String) : [],
      sections: json.sections.map((section) => (
        typeof section === 'string'
          ? { heading: section, notes: '' }
          : { heading: String(section.heading || section.title || ''), notes: String(section.notes || section.purpose || '') }
      )).filter((section) => section.heading),
    };
  }
  const headings = [...String(text || '').matchAll(/^##\s+(.+)$/gm)].map((match) => ({ heading: match[1].trim(), notes: '' }));
  if (!headings.length) return null;
  return { title: '', slug: '', targetQuery: '', excerpt: '', answer: '', cta: '', sources: [], sections: headings };
}

export function isControlReply(text) {
  return /===== FRONTMATTER =====|===== FILE:/.test(String(text || ''));
}

export function parseSection(text) {
  if (isHollowReply(text) || isControlReply(text)) return null;
  let body = String(text || '').replaceAll(SECTION_DONE, '').replaceAll(TURN_DONE, '').trim();
  const named = body.match(/===== SECTION:\s*(.+?)\s*=====\s*([\s\S]*)/);
  if (named) body = named[2].trim();
  body = unwrapFence(body);
  if (wordCount(body) < 80) return null;
  return body;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripOwnHeading(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*\\n+`, 'i');
  return markdown.replace(pattern, '');
}

export function applySection(existingBody, heading, sectionMarkdown) {
  const content = stripOwnHeading(String(sectionMarkdown || '').trim(), heading);
  const block = `## ${heading}\n\n${content}`.trim();
  const lines = String(existingBody || '').split('\n');
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'i').test(line));
  if (start < 0) return `${String(existingBody || '').trim()}${existingBody ? '\n\n' : ''}${block}\n`;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) { end = index; break; }
  }
  return `${[...lines.slice(0, start), ...block.split('\n'), ...lines.slice(end)].join('\n').trim()}\n`;
}

export function splitPost(source) {
  try {
    const parsed = matter(String(source || ''));
    return { data: parsed.data || {}, body: parsed.content || '' };
  } catch {
    return { data: {}, body: String(source || '') };
  }
}

function yamlScalar(value) {
  if (Array.isArray(value)) return value.map((item) => `  - ${JSON.stringify(String(item))}`).join('\n');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(String(value));
}

export function assemblePost(data, body) {
  const keys = [
    'title', 'date', 'updated', 'excerpt', 'answer', 'targetQuery', 'queryAliases', 'intent', 'funnel',
    'cluster', 'parent', 'contentType', 'kind', 'sourceableAtom', 'evidenceType', 'evidenceBasis',
    'tags', 'author', 'nextReviewAt', 'sources', 'cover', 'coverAlt', 'draft',
  ];
  const lines = ['---'];
  for (const key of keys) {
    if (data[key] === undefined) continue;
    if (Array.isArray(data[key])) {
      lines.push(`${key}:`);
      if (data[key].length) lines.push(yamlScalar(data[key]));
    } else {
      lines.push(`${key}: ${yamlScalar(data[key])}`);
    }
  }
  lines.push('---', '', String(body || '').trim(), '');
  return lines.join('\n');
}

export function mergeFrontmatter(existing, incoming) {
  const next = { ...existing };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    next[key] = value;
  }
  return next;
}

export function mergePost(existing, incoming) {
  const current = splitPost(existing);
  const next = splitPost(incoming);
  const incomingHollow = isHollowReply(next.body) || isControlReply(next.body);
  const body = incomingHollow || wordCount(next.body) < 80 ? current.body : next.body;
  return assemblePost(mergeFrontmatter(current.data, next.data), body);
}

export function extractNamedBlocks(text) {
  const source = String(text || '');
  const sections = [];
  const parts = source.split(/(?:^|\n)===== SECTION:\s*(.+?)\s*=====\s*\n/);
  for (let index = 1; index < parts.length; index += 2) {
    sections.push({ heading: parts[index].trim(), body: parts[index + 1] || '' });
  }
  const frontmatter = source.match(/===== FRONTMATTER =====\s*([\s\S]*?)(?=\n===== |\s*$)/);
  return {
    sections,
    frontmatter: frontmatter ? unwrapFence(frontmatter[1]) : '',
  };
}

export function parseFrontmatterBlock(text) {
  const raw = unwrapFence(String(text || '').trim());
  const wrapped = raw.startsWith('---') ? raw : `---\n${raw}\n---\n`;
  try { return matter(wrapped).data || {}; } catch { return {}; }
}

export function applyConversationReply(artifacts, text, { heading } = {}) {
  const current = { ...artifacts };
  if (isHollowReply(text)) return { artifacts: current, applied: false, reason: 'hollow' };

  let applied = false;
  const named = extractNamedBlocks(text);
  if (named.frontmatter && !isHollowReply(named.frontmatter)) {
    const post = splitPost(current['post.mdx'] || '');
    current['post.mdx'] = assemblePost(mergeFrontmatter(post.data, parseFrontmatterBlock(named.frontmatter)), post.body);
    applied = true;
  }
  for (const section of named.sections) {
    const parsed = parseSection(section.body);
    if (!parsed) continue;
    const post = splitPost(current['post.mdx'] || '');
    current['post.mdx'] = assemblePost(post.data, applySection(post.body, section.heading, parsed));
    applied = true;
  }
  if (heading) {
    const parsed = parseSection(text);
    if (parsed) {
      const post = splitPost(current['post.mdx'] || '');
      current['post.mdx'] = assemblePost(post.data, applySection(post.body, heading, parsed));
      applied = true;
    }
  }

  const files = extractFiles(text);
  for (const [name, content] of Object.entries(files)) {
    if (isHollowReply(content)) continue;
    if (name === 'post.mdx') current[name] = mergePost(current[name] || '', content);
    else current[name] = content;
    applied = true;
  }

  return { artifacts: current, applied, reason: applied ? 'merged' : 'no-op' };
}
