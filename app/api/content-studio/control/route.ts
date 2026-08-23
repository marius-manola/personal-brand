import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import {
  getControlPlaneSnapshot,
  importGeoPrompts,
  importSearchPerformance,
  inspectRecentUrls,
  recordGeoRun,
  updateDistributionItem,
  strengthenInternalLinks,
  syncSearchConsole,
} from '@/lib/content-studio/control-plane.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isLocalRequest())) return new NextResponse(null, { status: 404 });
  return NextResponse.json(await getControlPlaneSnapshot());
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return new NextResponse(null, { status: 404 });
  const body = await request.json().catch(() => ({})) as {
    action?: string;
    rows?: unknown[];
    prompts?: unknown[];
    slug?: string;
    [key: string]: unknown;
  };
  try {
    if (body.action === 'sync-search') await syncSearchConsole({ force: true });
    else if (body.action === 'inspect') await inspectRecentUrls({ force: true });
    else if (body.action === 'import-search') await importSearchPerformance(body.rows || [], 'manual');
    else if (body.action === 'record-geo') await recordGeoRun(body);
    else if (body.action === 'import-geo-prompts') await importGeoPrompts(body.prompts || []);
    else if (body.action === 'strengthen-links' && body.slug) await strengthenInternalLinks(String(body.slug));
    else if (body.action === 'distribution-status') await updateDistributionItem(String(body.id || ''), String(body.status || ''));
    else return NextResponse.json({ error: 'Unknown control-plane action.' }, { status: 400 });
    return NextResponse.json(await getControlPlaneSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
