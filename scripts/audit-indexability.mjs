#!/usr/bin/env node

const CANONICAL_ORIGIN = process.env.SITE_URL || 'https://www.mariusmanolachi.com';

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function canonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    if (!rel.split(/\s+/).some((value) => value.toLowerCase() === 'canonical')) continue;
    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
  }
  return '';
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchWithoutRedirect(url) {
  return fetch(url, {
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
}

const targetOrigin = new URL(argument('--origin', CANONICAL_ORIGIN)).origin;
const expectedOrigin = new URL(CANONICAL_ORIGIN).origin;
const sitemapResponse = await fetchWithoutRedirect(`${targetOrigin}/sitemap.xml`);
if (!sitemapResponse.ok) {
  throw new Error(`Sitemap returned ${sitemapResponse.status} at ${targetOrigin}/sitemap.xml`);
}

const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1]));
const errors = [];
const seen = new Set();

for (const value of urls) {
  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`Invalid sitemap URL: ${value}`);
    continue;
  }
  if (seen.has(value)) errors.push(`Duplicate sitemap URL: ${value}`);
  seen.add(value);
  if (url.origin !== expectedOrigin) errors.push(`Wrong sitemap host: ${value}`);
  if (url.pathname !== '/' && url.pathname.endsWith('/')) errors.push(`Trailing-slash sitemap URL: ${value}`);
  if (url.search || url.hash) errors.push(`Non-canonical sitemap URL: ${value}`);
}

const pending = [...new Set(urls)];
const workers = Array.from({ length: Math.min(8, pending.length) }, async () => {
  while (pending.length) {
    const canonicalUrl = pending.shift();
    if (!canonicalUrl) return;
    const path = new URL(canonicalUrl).pathname;
    const testUrl = `${targetOrigin}${path}`;
    try {
      const response = await fetchWithoutRedirect(testUrl);
      if (response.status >= 300 && response.status < 400) {
        errors.push(`Sitemap URL redirects: ${canonicalUrl} -> ${response.headers.get('location') || '(missing location)'}`);
        continue;
      }
      if (!response.ok) {
        errors.push(`Sitemap URL returned ${response.status}: ${canonicalUrl}`);
        continue;
      }
      const html = await response.text();
      const canonical = canonicalHref(html);
      if (!canonical) errors.push(`Missing self-canonical: ${canonicalUrl}`);
      else if (canonical !== canonicalUrl) errors.push(`Canonical mismatch: ${canonicalUrl} declares ${canonical}`);
    } catch (error) {
      errors.push(`Could not inspect ${canonicalUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

await Promise.all(workers);

if (errors.length) {
  console.error(`indexability audit failed (${errors.length} issue${errors.length === 1 ? '' : 's'})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`indexability audit passed: ${urls.length} canonical sitemap URLs, zero redirects or canonical mismatches`);
}
