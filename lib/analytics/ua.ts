export function parseUserAgent(ua: string) {
  const value = ua || '';
  const mobile = /iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(value);
  const tablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(value);
  const device = mobile ? 'phone' : tablet ? 'tablet' : 'desktop';
  let os = 'other';
  if (/iPhone|iPad|iPod/i.test(value)) os = 'ios';
  else if (/Android/i.test(value)) os = 'android';
  else if (/Mac OS X|Macintosh/i.test(value)) os = 'mac';
  else if (/Windows/i.test(value)) os = 'windows';
  else if (/Linux/i.test(value)) os = 'linux';
  return { device, os };
}

export function countryFromRequest(request: Request) {
  const header = request.headers.get('x-vercel-ip-country')
    || request.headers.get('cf-ipcountry')
    || '';
  const code = header.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return '';
  return code;
}
