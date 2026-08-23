import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const ARTIFACTS = ['idea.md', 'research.md', 'post.mdx', 'review.md', 'manifest.json'];

function unwrapFence(text) {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```(?:[A-Za-z0-9_-]+)?\r?\n([\s\S]*?)\r?\n```$/);
  return match ? match[1].trim() : trimmed;
}

function restorePlaceholders(value) {
  return String(value || '')
    .replace(/(?<!_)HERO_IMAGE(?!_)/g, '__HERO_IMAGE__')
    .replace(/(?<!_)INLINE_IMAGE_(\d+)(?!_)/g, '__INLINE_IMAGE_$1__');
}

function restoreYamlLists(frontmatter) {
  return frontmatter.replace(/^([A-Za-z][\w]*):\n(?:\n(?:"[^"\n]+"\n+)+)/gm, (block, key) => {
    const items = [...block.matchAll(/"([^"]+)"/g)].map((match) => `  - '${match[1].replace(/'/g, "''")}'`);
    return items.length ? `${key}:\n${items.join('\n')}\n` : block;
  });
}

function restorePost(source) {
  let text = restorePlaceholders(source).replace(/\r\n/g, '\n').trim();
  if (!text) return text;
  if (!text.startsWith('---')) text = `---\n${text}`;
  if (!/^---\n[\s\S]*?\n---\s*\n/.test(text)) {
    text = text.replace(/(draft:\s*(?:false|true))\n+/, '$1\n---\n\n');
  }
  const split = text.match(/^---\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!split) return text;
  const frontmatter = restoreYamlLists(split[1]);
  const body = split[2].trim();
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function restoreManifest(source) {
  const text = restorePlaceholders(source);
  try {
    const manifest = JSON.parse(text);
    const images = Array.isArray(manifest.images) ? manifest.images : Array.isArray(manifest.imageRequests) ? manifest.imageRequests : [];
    if (!images.length) return text;
    images.forEach((image, index) => {
      if (!image) return;
      if (index === 0) {
        image.placeholder = '__HERO_IMAGE__';
        image.role = 'hero';
      } else {
        image.placeholder = `__INLINE_IMAGE_${index}__`;
        image.role = image.role === 'hero' ? 'inline' : (image.role || 'inline');
      }
    });
    return JSON.stringify(manifest, null, 2);
  } catch {
    return text;
  }
}

export function normalizeFiles(files) {
  const next = { ...files };
  if (next['post.mdx']) next['post.mdx'] = restorePost(next['post.mdx']);
  if (next['manifest.json']) next['manifest.json'] = restoreManifest(next['manifest.json']);
  for (const name of ['idea.md', 'research.md', 'review.md']) {
    if (next[name]) next[name] = restorePlaceholders(next[name]);
  }
  return next;
}

export function extractFiles(text) {
  const source = String(text || '');
  const files = {};

  const parts = source.split(/(?:^|\n)===== FILE: ([A-Za-z0-9._-]+) =====\r?\n/);
  for (let index = 1; index < parts.length; index += 2) {
    files[parts[index]] = unwrapFence(parts[index + 1] || '');
  }

  if (!Object.keys(files).length) {
    const fenced = [...source.matchAll(/```(?:mdx?|json|markdown)?[ \t]+([A-Za-z0-9._-]+)[\r\n]+([\s\S]*?)```/gi)];
    for (const match of fenced) files[match[1]] = match[2].trim();
  }

  return normalizeFiles(files);
}

export async function writeExtractedFiles(jobDir, files) {
  const written = [];
  for (const name of ARTIFACTS) {
    if (!files[name]) continue;
    const body = files[name].endsWith('\n') ? files[name] : `${files[name]}\n`;
    await writeFile(join(jobDir, name), body, 'utf8');
    written.push(name);
  }
  return written;
}
