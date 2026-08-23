import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { getGeminiAccounts } from '@/lib/content-studio/state';

export const dynamic = 'force-dynamic';

const ACCOUNT_IDS = ['1', '2', '3'] as const;
const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

function openAccount(id: string) {
  const root = process.cwd();
  const profile = join(root, '.content-studio', 'gemini-profiles', `account-${id}`);
  const extension = join(root, '.content-studio', 'gemini-extensions', `account-${id}`);
  if (!existsSync(BRAVE) || !existsSync(profile) || !existsSync(extension)) {
    throw new Error(`Gemini Account ${id} browser profile or extension is missing.`);
  }
  const child = spawn(BRAVE, [
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    `https://gemini.google.com/app?studioAccount=${id}`,
  ], { detached: true, stdio: 'ignore' });
  child.unref();
}

export async function POST(request: Request) {
  if (!(await isLocalRequest())) return NextResponse.json({ error: 'Local access only.' }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as { all?: boolean; accountId?: string };
    const ids = body.all ? [...ACCOUNT_IDS] : [ACCOUNT_IDS.includes(body.accountId as (typeof ACCOUNT_IDS)[number]) ? body.accountId! : '1'];
    ids.forEach(openAccount);
    const deadline = Date.now() + 60_000;
    let accounts = await getGeminiAccounts();
    while (Date.now() < deadline && !accounts.some((account) => ids.includes(account.id) && account.connected && !account.limited)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      accounts = await getGeminiAccounts();
    }
    return NextResponse.json({ opened: true, accounts });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not open the Gemini browser.',
    }, { status: 500 });
  }
}
