import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import {
  activateBlogCodexAccount,
  createBlogCodexAccount,
  getBlogCodexStatus,
  getBlogCodexUsage,
  openBlogCodexLogin,
} from '@/lib/content-studio/codex-account';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  return NextResponse.json({ ...getBlogCodexStatus(), usage: await getBlogCodexUsage() });
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as { action?: string; accountId?: string; label?: string };
    if (body.action === 'activate') {
      if (!body.accountId) throw new Error('Choose a Codex account first.');
      activateBlogCodexAccount(body.accountId);
      return NextResponse.json({ ...getBlogCodexStatus(), usage: await getBlogCodexUsage() });
    }
    if (body.action === 'add' || body.action === 'switch') {
      const account = createBlogCodexAccount(body.label);
      const result = await openBlogCodexLogin({ accountId: account.id });
      return NextResponse.json({ ...getBlogCodexStatus(), ...result });
    }
    const result = await openBlogCodexLogin({ accountId: body.accountId });
    return NextResponse.json({ ...getBlogCodexStatus(), ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
