import type { DayPoint } from './types';

type VercelRow = {
  day?: string;
  requestPath?: string;
  count?: number;
  visits?: number;
};

function berlinDay(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export async function fetchVercelPageviews(rangeDays = 30): Promise<DayPoint[] | null> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;

  const until = new Date();
  const since = new Date(until);
  since.setDate(until.getDate() - (rangeDays - 1));
  const params = new URLSearchParams({
    projectId,
    since: since.toISOString(),
    until: until.toISOString(),
    limit: '100',
  });
  params.append('by', 'day');
  params.append('by', 'requestPath');
  if (teamId) params.set('teamId', teamId);

  const response = await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = await response.json() as { data?: VercelRow[] };
  const byDay = new Map<string, DayPoint>();
  for (const row of payload.data || []) {
    if (!row.day) continue;
    const path = String(row.requestPath || '');
    if (path && !path.startsWith('/blog')) continue;
    const date = berlinDay(row.day);
    const point = byDay.get(date) || { date, views: 0, visitors: 0, engagedMs: 0, aiReferrals: 0 };
    point.views += Number(row.count || row.visits || 0);
    byDay.set(date, point);
  }
  return [...byDay.values()].sort((left, right) => left.date.localeCompare(right.date));
}
