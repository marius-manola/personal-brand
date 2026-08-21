export type SourceMeta = {
  label: string;
  mono: string;
  color: string;
  channel: string;
};

const SOURCE_META: Array<[RegExp, string | null, string, string, string]> = [
  [/^\(direct\)$/, 'Direct', '⌁', '#64748b', 'Direct'],
  [/facebook|^fb$|^fb(group|page|dm)$|fb\.me/, 'Facebook', 'f', '#1877F2', 'Facebook'],
  [/instagram/, 'Instagram', 'ig', '#E4405F', 'Facebook'],
  [/linkedin|lnkd\.in/, 'LinkedIn', 'in', '#0A66C2', 'Social'],
  [/youtube|youtu\.be/, 'YouTube', '▶', '#FF0000', 'Social'],
  [/reddit/, 'Reddit', 'r/', '#FF4500', 'Social'],
  [/twitter|^x$|^x\.com$|^t\.co$/, 'X (Twitter)', '𝕏', '#31363c', 'Social'],
  [/chatgpt|openai/, 'ChatGPT', 'ai', '#10a37f', 'AI assistants'],
  [/claude|anthropic/, 'Claude', 'cl', '#d97757', 'AI assistants'],
  [/perplexity/, 'Perplexity', 'px', '#20808D', 'AI assistants'],
  [/gemini|bard/, 'Gemini', 'ge', '#886FBF', 'AI assistants'],
  [/copilot/, 'Copilot', 'co', '#0f6cbd', 'AI assistants'],
  [/^google\./, 'Google', 'G', '#4285F4', 'Search'],
  [/bing|duckduckgo|ecosia|brave|yandex|startpage/, null, '⌕', '#5f6b7a', 'Search'],
  [/^newsletter$|^email$/, 'Newsletter', '@', '#b45309', 'Other'],
  [/^dms?$/, 'DM', '✉', '#64748b', 'Social'],
  [/mariusmanolachi\.com|^localhost$|^127\.0\.0\.1$/, 'This site (nav)', 'mm', '#0d9488', 'Own content'],
];

export function foldHost(raw: string) {
  if (!raw) return '';
  const value = raw.trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) return value.toLowerCase();
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

export function eventSource(event: { src?: string; ref?: string }) {
  const tagged = foldHost(event.src || '');
  if (tagged) return tagged;
  return foldHost(event.ref || '') || '(direct)';
}

export function sourceMeta(source: string): SourceMeta {
  const value = (source || '').toLowerCase();
  for (const [rx, label, mono, color, channel] of SOURCE_META) {
    if (rx.test(value)) return { label: label || source, mono, color, channel };
  }
  return {
    label: source || '?',
    mono: (source || '?')[0]?.toUpperCase() || '?',
    color: '#64748b',
    channel: 'Other',
  };
}

export function isInternalSource(source: string) {
  return /mariusmanolachi\.com|^localhost$|^127\.0\.0\.1$/.test((source || '').toLowerCase());
}

export const CHANNEL_COLORS: Record<string, string> = {
  Facebook: 'var(--cat1)',
  Direct: 'var(--cat2)',
  Search: 'var(--cat3)',
  'AI assistants': 'var(--cat4)',
  Social: 'var(--cat-other)',
  Other: 'var(--cat-other)',
  'Own content': '#0d9488',
};
