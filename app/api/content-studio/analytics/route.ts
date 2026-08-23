import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { buildSnapshot, bustAnalyticsCache } from '@/lib/analytics/aggregate';
import { readConfig, recordEvent, writeCitation, writeConfig } from '@/lib/analytics/store';
import type { CitationRecord } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await isLocalRequest())) return new NextResponse(null, { status: 404 });
  const url = new URL(request.url);
  const days = Number(url.searchParams.get('days') || 30);
  const device = url.searchParams.get('device') || '';
  const fresh = url.searchParams.get('fresh') === '1';
  return NextResponse.json(await buildSnapshot(days, { device, fresh }));
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return new NextResponse(null, { status: 404 });
  const body = await request.json() as {
    action?: string;
    countries?: string[];
    vid?: string;
    engine?: string;
    query?: string;
    cited?: boolean;
    date?: string;
    url?: string;
    notes?: string;
    landingSlug?: string;
  };

  if (body.action === 'record-booked' || body.action === 'record-paid') {
    const landingSlug = String(body.landingSlug || 'manual').slice(0, 80);
    await recordEvent({
      t: new Date().toISOString(), type: body.action === 'record-paid' ? 'paid' : 'booked',
      slug: 'learn-ai', path: '/learn-ai', ms: 0, ref: '', src: 'manual', sid: `manual-${Date.now()}`,
      vid: `manual-${Date.now()}`, country: '', device: 'manual', os: 'manual', bot: false, scroll: 0,
      name: body.action, landingSlug,
    });
    bustAnalyticsCache();
    return NextResponse.json(await buildSnapshot(90, { fresh: true }));
  }

  if (body.action === 'exclude-countries') {
    const config = await readConfig();
    const next = await writeConfig({
      ...config,
      excludeCountries: Array.isArray(body.countries) ? body.countries.map(String) : [],
    });
    bustAnalyticsCache();
    return NextResponse.json({ ok: true, excludeCountries: next.excludeCountries });
  }

  if (body.action === 'exclude-me') {
    const vid = String(body.vid || '');
    if (!/^[0-9a-f-]{8,80}$/i.test(vid)) {
      return NextResponse.json({ error: 'bad visitor id' }, { status: 400 });
    }
    const config = await readConfig();
    const excludeVisitors = config.excludeVisitors.includes(vid)
      ? config.excludeVisitors.filter((value) => value !== vid)
      : [...config.excludeVisitors, vid];
    const next = await writeConfig({ ...config, excludeVisitors });
    bustAnalyticsCache();
    return NextResponse.json({ ok: true, excluded: next.excludeVisitors.includes(vid), excludeVisitors: next.excludeVisitors });
  }

  const record: CitationRecord = {
    id: `${Date.now()}`,
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    engine: String(body.engine || '').slice(0, 40),
    query: String(body.query || '').slice(0, 180),
    cited: body.cited === true,
    url: body.url ? String(body.url).slice(0, 300) : undefined,
    notes: body.notes ? String(body.notes).slice(0, 400) : undefined,
  };
  if (!record.engine || !record.query) {
    return NextResponse.json({ error: 'engine and query are required' }, { status: 400 });
  }
  await writeCitation(record);
  const url = new URL(request.url);
  return NextResponse.json(await buildSnapshot(Number(url.searchParams.get('days') || 30), { fresh: true }));
}
