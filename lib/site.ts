export const SITE_URL = 'https://www.mariusmanolachi.com';

export function siteUrl(path = '') {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
