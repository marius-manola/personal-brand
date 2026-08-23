import { execFile, execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const CODEX_BIN = process.env.CONTENT_STUDIO_CODEX_BIN || '/Applications/ChatGPT.app/Contents/Resources/codex';
const STUDIO_RUNTIME = join(process.cwd(), '.content-studio');
export const BLOG_CODEX_HOME = process.env.CONTENT_STUDIO_CODEX_HOME
  || join(STUDIO_RUNTIME, 'codex-home');
export const BLOG_CODEX_MODEL = process.env.CONTENT_STUDIO_CODEX_MODEL || 'gpt-5.6-luna';
const BLOG_CODEX_ACCOUNTS_ROOT = join(STUDIO_RUNTIME, 'codex-accounts');
const BLOG_CODEX_ACCOUNTS_FILE = join(STUDIO_RUNTIME, 'codex-accounts.json');
const PRIMARY_ACCOUNT_ID = 'primary';

type StoredBlogCodexAccount = {
  id: string;
  label: string;
  createdAt: string;
};

type BlogCodexRegistry = {
  activeAccountId: string;
  accounts: StoredBlogCodexAccount[];
};

export type BlogCodexAccount = {
  id: string;
  label: string;
  email?: string;
  loggedIn: boolean;
  active: boolean;
};

export type BlogCodexStatus = {
  loggedIn: boolean;
  email?: string;
  home: string;
  model: string;
  isolated: true;
  activeAccountId: string;
  accounts: BlogCodexAccount[];
  usage?: BlogCodexUsage | null;
};

export type BlogCodexUsage = {
  plan: string;
  usedPercent: number;
  remainingPercent: number;
  resetsAt?: string;
  resetAfterSeconds?: number;
  windowLabel: string;
  allowed: boolean;
  limitReached: boolean;
  source: 'live' | 'session';
  fetchedAt: string;
};

function accountHome(accountId: string): string {
  return accountId === PRIMARY_ACCOUNT_ID
    ? BLOG_CODEX_HOME
    : join(BLOG_CODEX_ACCOUNTS_ROOT, accountId);
}

function emailFromAuthFile(home: string): string | undefined {
  try {
    const auth = JSON.parse(readFileSync(join(home, 'auth.json'), 'utf8')) as {
      tokens?: { id_token?: string };
    };
    const token = auth.tokens?.id_token;
    if (!token) return undefined;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { email?: string };
    return payload.email;
  } catch {
    return undefined;
  }
}

function defaultAccountLabel(email?: string): string {
  const local = email?.split('@')[0]?.split(/[._-]/)[0];
  return local ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : 'Primary';
}

function initialRegistry(): BlogCodexRegistry {
  return {
    activeAccountId: PRIMARY_ACCOUNT_ID,
    accounts: [{
      id: PRIMARY_ACCOUNT_ID,
      label: defaultAccountLabel(emailFromAuthFile(BLOG_CODEX_HOME)),
      createdAt: new Date().toISOString(),
    }],
  };
}

function writeRegistry(registry: BlogCodexRegistry): void {
  mkdirSync(STUDIO_RUNTIME, { recursive: true });
  const temporary = `${BLOG_CODEX_ACCOUNTS_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(registry, null, 2), { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, BLOG_CODEX_ACCOUNTS_FILE);
}

function readRegistry(): BlogCodexRegistry {
  try {
    const parsed = JSON.parse(readFileSync(BLOG_CODEX_ACCOUNTS_FILE, 'utf8')) as Partial<BlogCodexRegistry>;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.filter((account): account is StoredBlogCodexAccount => Boolean(account?.id && account?.label))
      : [];
    if (!accounts.some((account) => account.id === PRIMARY_ACCOUNT_ID)) {
      accounts.unshift(initialRegistry().accounts[0]);
    }
    const activeAccountId = accounts.some((account) => account.id === parsed.activeAccountId)
      ? String(parsed.activeAccountId)
      : accounts[0].id;
    return { activeAccountId, accounts };
  } catch {
    const registry = initialRegistry();
    writeRegistry(registry);
    return registry;
  }
}

export function getActiveBlogCodexHome(): string {
  return accountHome(readRegistry().activeAccountId);
}

export function studioCodexEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...base,
    CODEX_HOME: getActiveBlogCodexHome(),
  };
}

export function ensureBlogCodexHome(home = getActiveBlogCodexHome()): string {
  mkdirSync(home, { recursive: true });
  const config = join(home, 'config.toml');
  if (!existsSync(config)) {
    writeFileSync(config, [
      `model = "${BLOG_CODEX_MODEL}"`,
      'model_reasoning_effort = "high"',
      'cli_auth_credentials_store = "file"',
      '',
      '# Isolated from ~/.codex. Coding stays on the default Codex login.',
      '',
    ].join('\n'), 'utf8');
  } else {
    const contents = readFileSync(config, 'utf8');
    if (!/^\s*cli_auth_credentials_store\s*=/m.test(contents)) {
      writeFileSync(config, [
        contents.trimEnd(),
        '',
        '# Keep Content Studio credentials isolated from the normal Codex keychain entry.',
        'cli_auth_credentials_store = "file"',
        '',
      ].join('\n'), 'utf8');
    }
  }
  return home;
}

export function getBlogCodexStatus(): BlogCodexStatus {
  const registry = readRegistry();
  const home = accountHome(registry.activeAccountId);
  ensureBlogCodexHome(home);
  const accounts = registry.accounts.map((account) => {
    const email = emailFromAuthFile(accountHome(account.id));
    return {
      id: account.id,
      label: account.label,
      email,
      loggedIn: Boolean(email),
      active: account.id === registry.activeAccountId,
    };
  });
  const email = emailFromAuthFile(home);
  if (email) {
    return {
      loggedIn: true,
      email,
      home,
      model: BLOG_CODEX_MODEL,
      isolated: true,
      activeAccountId: registry.activeAccountId,
      accounts,
    };
  }
  let statusText = '';
  try {
    statusText = execFileSync(CODEX_BIN, ['login', 'status'], {
      env: { ...process.env, CODEX_HOME: home },
      encoding: 'utf8',
      timeout: 8_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    statusText = `${err.stdout || ''} ${err.stderr || ''}`;
  }
  const loggedIn = Boolean(email) || (/logged in/i.test(statusText) && !/not logged in/i.test(statusText));
  return {
    loggedIn,
    email,
    home,
    model: BLOG_CODEX_MODEL,
    isolated: true,
    activeAccountId: registry.activeAccountId,
    accounts,
  };
}

export function activateBlogCodexAccount(accountId: string): void {
  const registry = readRegistry();
  if (!registry.accounts.some((account) => account.id === accountId)) throw new Error('Codex account was not found.');
  writeRegistry({ ...registry, activeAccountId: accountId });
}

export function createBlogCodexAccount(label?: string): StoredBlogCodexAccount {
  const registry = readRegistry();
  const account = {
    id: `account-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`,
    label: label?.trim().slice(0, 50) || `Account ${registry.accounts.length + 1}`,
    createdAt: new Date().toISOString(),
  };
  writeRegistry({ activeAccountId: account.id, accounts: [...registry.accounts, account] });
  ensureBlogCodexHome(accountHome(account.id));
  return account;
}

export async function openBlogCodexLogin(options: { accountId?: string } = {}): Promise<{ opened: true; command: string }> {
  const registry = readRegistry();
  const accountId = options.accountId || registry.activeAccountId;
  if (!registry.accounts.some((account) => account.id === accountId)) throw new Error('Codex account was not found.');
  const home = accountHome(accountId);
  ensureBlogCodexHome(home);
  if (!existsSync(CODEX_BIN)) throw new Error('Codex is missing. Install the ChatGPT desktop app.');
  const codex = JSON.stringify(CODEX_BIN);
  const command = `export CODEX_HOME=${JSON.stringify(home)}; if ${codex} login; then echo; echo "Blog Codex login succeeded. You can close this window."; else echo; echo "Blog Codex login failed. Close extra login windows and try once."; fi; exec "$SHELL"`;
  await execFileAsync('osascript', [
    '-e',
    `tell application "Terminal" to do script ${JSON.stringify(command)}`,
  ]);
  return {
    opened: true,
    command: `CODEX_HOME=${home} ${CODEX_BIN} login`,
  };
}

function windowLabelFrom(seconds?: number, minutes?: number) {
  const fromMinutes = Number.isFinite(minutes) ? Number(minutes) : 0;
  const fromSeconds = Number.isFinite(seconds) ? Math.round(Number(seconds) / 60) : 0;
  const mins = fromMinutes || fromSeconds;
  if (mins >= 10_000) return 'this week';
  if (mins >= 1_400) return 'today';
  if (mins >= 180) return `${Math.max(1, Math.round(mins / 60))}-hour window`;
  if (mins > 0) return `${mins} min window`;
  return 'current window';
}

function usageFromRateLimit(raw: {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: { used_percent?: number; limit_window_seconds?: number; reset_after_seconds?: number; reset_at?: number };
    secondary_window?: { used_percent?: number; limit_window_seconds?: number; reset_after_seconds?: number; reset_at?: number } | null;
  };
  primary?: { used_percent?: number; window_minutes?: number; resets_at?: number };
  plan_type_alt?: string;
  allowed?: boolean;
  limit_reached?: boolean;
} | null, source: 'live' | 'session'): BlogCodexUsage | null {
  if (!raw) return null;
  const primary = raw.rate_limit?.primary_window || raw.primary;
  const used = Number(primary?.used_percent);
  if (!Number.isFinite(used)) return null;
  const usedPercent = Math.max(0, Math.min(100, Math.round(used)));
  const resetAtUnix = Number((primary as { reset_at?: number; resets_at?: number } | undefined)?.reset_at
    ?? (primary as { resets_at?: number } | undefined)?.resets_at);
  const resetAfterSeconds = Number((primary as { reset_after_seconds?: number } | undefined)?.reset_after_seconds);
  const windowSeconds = Number((primary as { limit_window_seconds?: number } | undefined)?.limit_window_seconds);
  const windowMinutes = Number((primary as { window_minutes?: number } | undefined)?.window_minutes);
  return {
    plan: String(raw.plan_type || 'plus'),
    usedPercent,
    remainingPercent: Math.max(0, 100 - usedPercent),
    resetsAt: Number.isFinite(resetAtUnix) && resetAtUnix > 0 ? new Date(resetAtUnix * 1000).toISOString() : undefined,
    resetAfterSeconds: Number.isFinite(resetAfterSeconds) ? resetAfterSeconds : undefined,
    windowLabel: windowLabelFrom(windowSeconds, windowMinutes),
    allowed: raw.rate_limit?.allowed !== false && raw.allowed !== false,
    limitReached: Boolean(raw.rate_limit?.limit_reached || raw.limit_reached),
    source,
    fetchedAt: new Date().toISOString(),
  };
}

function usageFromLatestSession(home: string): BlogCodexUsage | null {
  try {
    const root = join(home, 'sessions');
    const files: Array<{ path: string; mtime: number }> = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const stat = statSync(path);
        if (stat.isDirectory()) walk(path);
        else if (name.endsWith('.jsonl')) files.push({ path, mtime: stat.mtimeMs });
      }
    };
    walk(root);
    files.sort((left, right) => right.mtime - left.mtime);
    for (const file of files.slice(0, 12)) {
      const lines = readFileSync(file.path, 'utf8').trim().split('\n');
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (!lines[index].includes('rate_limits')) continue;
        try {
          const event = JSON.parse(lines[index]) as { payload?: { rate_limits?: Record<string, unknown> } };
          const limits = event.payload?.rate_limits as {
            plan_type?: string;
            primary?: { used_percent?: number; window_minutes?: number; resets_at?: number };
            rate_limit_reached_type?: string | null;
          } | undefined;
          if (!limits?.primary) continue;
          return usageFromRateLimit({
            plan_type: limits.plan_type,
            primary: limits.primary,
            limit_reached: Boolean(limits.rate_limit_reached_type),
          }, 'session');
        } catch { /* next line */ }
      }
    }
  } catch { /* no sessions */ }
  return null;
}

const usageCaches = new Map<string, { at: number; value: BlogCodexUsage | null }>();
const usageRefreshes = new Map<string, Promise<void>>();

async function refreshBlogCodexUsage(home: string) {
  let value: BlogCodexUsage | null = null;
  try {
    const auth = JSON.parse(readFileSync(join(home, 'auth.json'), 'utf8')) as {
      tokens?: { access_token?: string; account_id?: string };
    };
    const token = auth.tokens?.access_token;
    const accountId = auth.tokens?.account_id;
    if (token) {
      const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
        headers: {
          authorization: `Bearer ${token}`,
          ...(accountId ? { 'chatgpt-account-id': accountId } : {}),
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const payload = await response.json() as Parameters<typeof usageFromRateLimit>[0];
        value = usageFromRateLimit(payload, 'live');
      }
    }
  } catch { /* fall back to session logs */ }
  if (!value) value = usageFromLatestSession(home);
  usageCaches.set(home, { at: Date.now(), value });
}

export async function getBlogCodexUsage(): Promise<BlogCodexUsage | null> {
  const home = getActiveBlogCodexHome();
  let cache = usageCaches.get(home);
  const shouldRetryMissingUsage = Boolean(
    cache
    && !cache.value
    && existsSync(join(home, 'auth.json'))
    && Date.now() - cache.at >= 5_000,
  );
  if (!cache || shouldRetryMissingUsage) {
    await refreshBlogCodexUsage(home);
    cache = usageCaches.get(home) || { at: Date.now(), value: usageFromLatestSession(home) };
  }
  if (Date.now() - cache.at >= 2 * 60_000 && !usageRefreshes.has(home)) {
    const refresh = refreshBlogCodexUsage(home).finally(() => { usageRefreshes.delete(home); });
    usageRefreshes.set(home, refresh);
  }
  return cache.value;
}

export function spawnWithBlogCodex(command: string, args: string[], extra: { cwd: string }) {
  const child = spawn(command, args, {
    cwd: extra.cwd,
    detached: true,
    stdio: 'ignore',
    env: studioCodexEnv(),
  });
  child.unref();
  return child;
}
