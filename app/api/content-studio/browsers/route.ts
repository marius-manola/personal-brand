import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { listBrowsers } from '@/lib/content-studio/browsers.mjs';
import { runtimePath } from '@/lib/content-studio/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  return NextResponse.json(await listBrowsers(runtimePath()));
}
