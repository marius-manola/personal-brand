import { headers } from 'next/headers';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export async function isLocalRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const rawHost = forwardedHost ?? requestHeaders.get('host') ?? '';
  const host = rawHost.startsWith('[') ? rawHost.split(']')[0] + ']' : rawHost.split(':')[0];
  return LOCAL_HOSTS.has(host.toLowerCase());
}
