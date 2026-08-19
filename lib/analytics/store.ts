import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AnalyticsEvent, CitationRecord } from './types';

const ROOT = process.cwd();
const FILE_DIR = process.env.ANALYTICS_DIR || join(ROOT, '.content-studio', 'analytics');
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function berlinDay(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function dayFile(day: string) {
  return join(FILE_DIR, `events-${day}.jsonl`);
}

async function kv(command: unknown[]) {
  if (!KV_URL || !KV_TOKEN) return null;
  const response = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = await response.json() as { result?: unknown };
  return payload.result ?? null;
}

export function analyticsSources() {
  return {
    file: true,
    kv: Boolean(KV_URL && KV_TOKEN),
    vercel: Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID),
  };
}

export async function recordEvent(event: AnalyticsEvent) {
  const day = berlinDay(event.t);
  const line = `${JSON.stringify(event)}\n`;
  try {
    await mkdir(FILE_DIR, { recursive: true });
    await appendFile(dayFile(day), line, 'utf8');
  } catch {
    /* Vercel has no writable studio dir. */
  }
  if (!KV_URL || !KV_TOKEN) return;
  const key = `analytics:day:${day}`;
  const existing = await kv(['GET', key]);
  const next = `${typeof existing === 'string' ? existing : ''}${line}`;
  await kv(['SET', key, next]);
  await kv(['SADD', 'analytics:days', day]);
}

export async function readEvents(rangeDays = 30): Promise<AnalyticsEvent[]> {
  const days: string[] = [];
  const now = new Date();
  for (let index = 0; index < rangeDays; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    days.push(berlinDay(date.toISOString()));
  }

  const events: AnalyticsEvent[] = [];
  const seen = new Set<string>();

  const pushLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const event = JSON.parse(trimmed) as AnalyticsEvent;
      if (!event?.t || !event.slug || !event.type) return;
      const id = `${event.t}:${event.sid}:${event.type}:${event.ms}`;
      if (seen.has(id)) return;
      seen.add(id);
      events.push(event);
    } catch { /* skip bad line */ }
  };

  try {
    const names = await readdir(FILE_DIR);
    for (const name of names) {
      if (!name.startsWith('events-') || !name.endsWith('.jsonl')) continue;
      const day = name.slice(7, 17);
      if (!days.includes(day)) continue;
      const text = await readFile(join(FILE_DIR, name), 'utf8');
      text.split('\n').forEach(pushLine);
    }
  } catch { /* no local files */ }

  if (KV_URL && KV_TOKEN) {
    for (const day of days) {
      const raw = await kv(['GET', `analytics:day:${day}`]);
      if (typeof raw === 'string') raw.split('\n').forEach(pushLine);
    }
  }

  return events;
}

export async function readCitations(): Promise<CitationRecord[]> {
  try {
    const text = await readFile(join(FILE_DIR, 'citations.json'), 'utf8');
    const parsed = JSON.parse(text) as CitationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeCitation(record: CitationRecord) {
  await mkdir(FILE_DIR, { recursive: true });
  const current = await readCitations();
  current.unshift(record);
  await writeFile(join(FILE_DIR, 'citations.json'), JSON.stringify(current.slice(0, 200), null, 2), 'utf8');
  return current;
}
