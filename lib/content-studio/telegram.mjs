import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_CHAT_ID = '5020073429';

export function loadLocalEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  }
}

export function telegramConfig() {
  loadLocalEnv();
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID,
  };
}

export async function sendTelegram(text) {
  const { token, chatId } = telegramConfig();
  if (!token) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set in .env or .env.local' };
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: String(text).slice(0, 3900),
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { ok: false, error: `Telegram ${response.status}: ${detail.slice(0, 180)}` };
  }
  return { ok: true };
}
