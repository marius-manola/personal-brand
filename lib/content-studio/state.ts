import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type StudioState = {
  id?: string;
  status: 'idle' | 'running' | 'waiting' | 'done' | 'failed';
  stage: 'idle' | 'idea' | 'research' | 'write' | 'review' | 'image' | 'publish' | 'done' | 'failed';
  message: string;
  startedAt?: string;
  updatedAt?: string;
  title?: string;
  slug?: string;
  liveUrl?: string;
  imagePrompt?: string;
  imageAlt?: string;
  imagePath?: string;
  imageTarget?: number;
  imageRequests?: Array<{
    id: string;
    placeholder: string;
    role: 'hero' | 'inline';
    prompt: string;
    alt: string;
  }>;
  images?: Array<{
    id: string;
    path: string;
    alt: string;
    accountId: string;
    createdAt: string;
  }>;
  geminiAccountId?: string;
  geminiImageId?: string;
  chatgptTurnId?: string;
  chatgptPrompt?: string;
  chatgptStage?: 'idea' | 'research' | 'write' | 'review';
  chatgptClaimedAt?: string;
  chatgptSentAt?: string;
  chatgptCompletedTurnId?: string;
  chatgptError?: string;
  chatgptPlan?: 'free' | 'plus' | 'unknown';
  continueChat?: boolean;
  newChat?: boolean;
  chatgptThreadUrl?: string;
  e2e?: boolean;
  stopped?: boolean;
  error?: string;
  log?: string[];
};

export type GeminiAccountStatus = {
  id: string;
  label: string;
  connected: boolean;
  limited: boolean;
  limitedUntil?: string;
  lastSeenAt?: string;
};

export type ImageProvider = 'gemini' | 'codex';

export type StudioSettings = {
  enabled: boolean;
  postsPerDay: number;
  scheduleMode?: 'spread' | 'daily-batch' | 'autopilot';
  thinkEnabled?: boolean;
  imageProvider?: ImageProvider;
  lastSlotKey?: string;
  updatedAt?: string;
};

export function normalizeImageProvider(value?: unknown): ImageProvider {
  return value === 'codex' ? 'codex' : 'gemini';
}

const RUNTIME = join(process.cwd(), '.content-studio');
const STATE_FILE = join(RUNTIME, 'state.json');
const GEMINI_ACCOUNTS = join(RUNTIME, 'gemini-accounts');
const CHATGPT_FILE = join(RUNTIME, 'chatgpt.json');
const SETTINGS_FILE = join(RUNTIME, 'settings.json');
const GEMINI_ACCOUNT_IDS = ['1', '2', '3'] as const;
const CHATGPT_HEARTBEAT_MS = 120_000;

export async function readState(): Promise<StudioState> {
  try { return JSON.parse(await readFile(STATE_FILE, 'utf8')) as StudioState; }
  catch { return { status: 'idle', stage: 'idle', message: 'Ready when you are.' }; }
}

export async function writeState(state: StudioState): Promise<void> {
  await mkdir(RUNTIME, { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString(), log: (state.log || []).slice(-30) };
  const temporary = `${STATE_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
  await rename(temporary, STATE_FILE);
}

function validGeminiAccountId(accountId?: string): string {
  return GEMINI_ACCOUNT_IDS.includes(accountId as (typeof GEMINI_ACCOUNT_IDS)[number]) ? accountId! : '1';
}

type GeminiAccountRecord = { at?: string; limitedUntil?: string };

async function readGeminiAccount(accountId: string): Promise<GeminiAccountRecord> {
  try {
    return JSON.parse(await readFile(join(GEMINI_ACCOUNTS, `${validGeminiAccountId(accountId)}.json`), 'utf8')) as GeminiAccountRecord;
  } catch { return {}; }
}

async function writeGeminiAccount(accountId: string, record: GeminiAccountRecord): Promise<void> {
  await mkdir(GEMINI_ACCOUNTS, { recursive: true });
  const id = validGeminiAccountId(accountId);
  const target = join(GEMINI_ACCOUNTS, `${id}.json`);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(record, null, 2), 'utf8');
  await rename(temporary, target);
}

export async function recordGeminiHeartbeat(accountId?: string): Promise<void> {
  const id = validGeminiAccountId(accountId);
  const current = await readGeminiAccount(id);
  await writeGeminiAccount(id, { ...current, at: new Date().toISOString() });
}

export async function markGeminiAccountLimited(accountId: string): Promise<string> {
  const id = validGeminiAccountId(accountId);
  const current = await readGeminiAccount(id);
  const limitedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await writeGeminiAccount(id, { ...current, at: new Date().toISOString(), limitedUntil });
  return limitedUntil;
}

export async function getGeminiAccounts(): Promise<GeminiAccountStatus[]> {
  const now = Date.now();
  return Promise.all(GEMINI_ACCOUNT_IDS.map(async (id) => {
    const record = await readGeminiAccount(id);
    const lastSeen = record.at ? new Date(record.at).getTime() : 0;
    const limitedUntil = record.limitedUntil ? new Date(record.limitedUntil).getTime() : 0;
    return {
      id,
      label: `Account ${id}`,
      // Chrome heavily throttles timers in background Gemini windows; the
      // companion often reports once per minute even while generation is active.
      connected: now - lastSeen < 120_000,
      limited: limitedUntil > now,
      limitedUntil: limitedUntil > now ? record.limitedUntil : undefined,
      lastSeenAt: record.at,
    };
  }));
}

export async function geminiIsConnected(): Promise<boolean> {
  const accounts = await getGeminiAccounts();
  return accounts.some((account) => account.connected && !account.limited);
}

export type ChatGPTHeartbeat = {
  at?: string;
  plan?: 'free' | 'plus' | 'unknown';
  url?: string;
  event?: string;
  detail?: string;
};

export async function readChatGPTHeartbeat(): Promise<ChatGPTHeartbeat> {
  try { return JSON.parse(await readFile(CHATGPT_FILE, 'utf8')) as ChatGPTHeartbeat; }
  catch { return {}; }
}

export async function recordChatGPTHeartbeat(extra: ChatGPTHeartbeat = {}): Promise<void> {
  await mkdir(RUNTIME, { recursive: true });
  const previous = await readChatGPTHeartbeat();
  const next = {
    at: new Date().toISOString(),
    plan: extra.plan || previous.plan,
    url: extra.url || previous.url,
    event: extra.event || previous.event,
    detail: extra.detail || previous.detail,
  };
  const temporary = `${CHATGPT_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), 'utf8');
  await rename(temporary, CHATGPT_FILE);
}

export async function chatgptIsConnected(): Promise<boolean> {
  try {
    const record = JSON.parse(await readFile(CHATGPT_FILE, 'utf8')) as { at?: string };
    const lastSeen = record.at ? new Date(record.at).getTime() : 0;
    return Date.now() - lastSeen < CHATGPT_HEARTBEAT_MS;
  } catch {
    return false;
  }
}

export async function readSettings(): Promise<StudioSettings> {
  try {
    const value = JSON.parse(await readFile(SETTINGS_FILE, 'utf8')) as Partial<StudioSettings>;
    const parsedPostsPerDay = Number(value.postsPerDay);
    return {
      enabled: value.enabled !== false,
      postsPerDay: Number.isFinite(parsedPostsPerDay)
        ? Math.min(10, Math.max(0, Math.round(parsedPostsPerDay)))
        : 8,
      scheduleMode: value.scheduleMode === 'spread' || value.scheduleMode === 'daily-batch'
        ? value.scheduleMode
        : 'autopilot',
      thinkEnabled: value.thinkEnabled === true,
      imageProvider: normalizeImageProvider(value.imageProvider),
      lastSlotKey: value.lastSlotKey,
      updatedAt: value.updatedAt,
    };
  } catch {
    return { enabled: true, postsPerDay: 8, scheduleMode: 'autopilot', thinkEnabled: false, imageProvider: 'gemini' };
  }
}

export async function writeSettings(settings: StudioSettings): Promise<void> {
  await mkdir(RUNTIME, { recursive: true });
  const temporary = `${SETTINGS_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  await rename(temporary, SETTINGS_FILE);
}

export const runtimePath = (...parts: string[]) => join(RUNTIME, ...parts);

export function isStopRequested(state?: Pick<StudioState, 'stopped' | 'error'> | null): boolean {
  if (existsSync(join(RUNTIME, 'stop'))) return true;
  return Boolean(state?.stopped) || state?.error === 'Stopped by you.';
}

export function workerIsAlive(): boolean {
  const lockAlive = (file: string) => {
    try {
      const pid = Number(readFileSync(file, 'utf8'));
      if (!pid) return false;
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  if (lockAlive(join(RUNTIME, 'worker.lock'))) return true;
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as StudioState;
    if (state.id && lockAlive(join(RUNTIME, 'jobs', state.id, 'worker.lock'))) return true;
  } catch { /* no current job */ }
  return false;
}
