#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = 'www.mariusmanolachi.com';
const SITE_URL = `https://${HOST}`;
const ROOT = join(import.meta.dirname, '..');

function findKey() {
  const pub = join(ROOT, 'public');
  for (const name of readdirSync(pub)) {
    if (!name.endsWith('.txt')) continue;
    const content = readFileSync(join(pub, name), 'utf8').trim();
    if (/^[0-9a-f]{32}$/.test(content) && name === `${content}.txt`) return content;
  }
  throw new Error('No IndexNow key file in public/.');
}

function parseArgs(argv) {
  const urls = [];
  let all = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') all = true;
    else if (arg === '--url' && argv[index + 1]) {
      urls.push(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('http')) urls.push(arg);
  }
  return { urls, all };
}

async function liveSitemapUrls() {
  const response = await fetch(`${SITE_URL}/sitemap.xml`, { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not fetch sitemap: ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function submit(urls) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) {
    console.log('indexnow: no urls');
    return { ok: true, count: 0 };
  }
  await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
  const key = findKey();
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList: unique,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const detail = await response.text().catch(() => '');
  console.log(`indexnow: ${unique.length} url(s), status ${response.status}`);
  unique.forEach((url) => console.log(`  ${url}`));
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow ${response.status}: ${detail.slice(0, 200)}`);
  }
  return { ok: true, count: unique.length };
}

const { urls, all } = parseArgs(process.argv.slice(2));
const list = all ? await liveSitemapUrls() : urls;
await submit(list);
