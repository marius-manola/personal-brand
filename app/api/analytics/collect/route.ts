import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/analytics/store';
import { countryFromRequest, parseUserAgent } from '@/lib/analytics/ua';
import type { AnalyticsEventType } from '@/lib/analytics/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = new Set<AnalyticsEventType>(['view', 'tick', 'leave']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,12}$/;

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin') || '';
  const host = request.headers.get('host') || '';
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'mariusmanolachi.com'
      || hostname === 'www.mariusmanolachi.com'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || host.startsWith(hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: 'origin' }, { status: 403 });
  }

  let body: {
    type?: string;
    slug?: string;
    path?: string;
    ms?: number;
    ref?: string;
    sid?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const type = TYPES.has(body.type as AnalyticsEventType) ? body.type as AnalyticsEventType : null;
  const slug = String(body.slug || '').slice(0, 80);
  const path = String(body.path || '').slice(0, 180);
  if (!type || !SLUG.test(slug) || !path.startsWith('/') || path.startsWith('/api') || path.startsWith('/content-studio')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const { device, os } = parseUserAgent(request.headers.get('user-agent') || '');
  await recordEvent({
    t: new Date().toISOString(),
    type,
    slug,
    path,
    ms: Math.max(0, Math.min(Number(body.ms) || 0, 120_000)),
    ref: String(body.ref || '').slice(0, 300),
    sid: String(body.sid || '').slice(0, 80),
    country: countryFromRequest(request),
    device,
    os,
  });

  return new NextResponse(null, { status: 204 });
}
