import type { Platform } from './types';

const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantom|selenium|playwright|puppeteer|scrapy|python-requests|curl|wget|httpx|axios|go-http-client|java\/|libwww|facebookexternalhit|preview|monitor|pingdom|lighthouse|pagespeed|gptbot|claudebot|perplexitybot|bingpreview|petalbot|semrush|ahrefs|mj12bot|dotbot/i;

export function isBotUa(ua: string) {
  return BOT_UA.test(ua || '');
}

export function parseUserAgent(ua: string) {
  const value = ua || '';
  const mobile = /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(value);
  const tablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(value);
  const device = mobile ? 'phone' : tablet ? 'tablet' : 'desktop';
  let os = 'other';
  // iPhone is checked before Macintosh because iPhones say "like Mac OS X".
  if (/iPhone|iPad|iPod/i.test(value)) os = 'ios';
  else if (/Android/i.test(value)) os = 'android';
  else if (/Windows/i.test(value)) os = 'windows';
  else if (/Mac OS X|Macintosh/i.test(value)) os = 'mac';
  else if (/Linux/i.test(value)) os = 'linux';
  return { device, os };
}

export function platformOf(event: { device?: string; os?: string }): Platform {
  const device = event.device || '';
  const os = event.os || '';
  if (device === 'phone' || device === 'tablet' || os === 'ios' || os === 'android') return 'phone';
  if (os === 'windows') return 'windows';
  if (os === 'mac') return 'mac';
  return 'other';
}

export function countryFromRequest(request: Request) {
  const header = request.headers.get('x-vercel-ip-country')
    || request.headers.get('cf-ipcountry')
    || '';
  const code = header.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return '';
  return code;
}
