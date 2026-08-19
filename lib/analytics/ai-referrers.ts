const AI_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'copilot.microsoft.com',
  'gemini.google.com',
  'claude.ai',
  'you.com',
  'poe.com',
];

export function referrerHost(raw: string) {
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function isAiReferrer(raw: string) {
  const host = referrerHost(raw);
  if (!host) {
    const lower = raw.toLowerCase();
    return lower.includes('utm_source=chatgpt') || lower.includes('utm_source=perplexity');
  }
  return AI_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
}
