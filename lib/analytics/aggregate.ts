import { getAllBlogPosts } from '@/lib/server/blog.server';
import { isAiReferrer, referrerHost } from './ai-referrers';
import { analyticsSources, readCitations, readEvents } from './store';
import type { AnalyticsSnapshot, DayPoint, PostPoint, ReferrerPoint } from './types';

function berlinDay(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function emptyDay(date: string): DayPoint {
  return { date, views: 0, visitors: 0, engagedMs: 0, aiReferrals: 0 };
}

export async function buildSnapshot(rangeDays = 30): Promise<AnalyticsSnapshot> {
  const [events, citations, posts] = await Promise.all([
    readEvents(rangeDays),
    readCitations(),
    getAllBlogPosts(),
  ]);
  const titles = new Map(posts.map((post) => [post.slug, post.metadata.title]));
  const seriesMap = new Map<string, DayPoint>();
  const visitorsByDay = new Map<string, Set<string>>();
  const now = new Date();
  for (let index = rangeDays - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = berlinDay(date.toISOString());
    seriesMap.set(key, emptyDay(key));
    visitorsByDay.set(key, new Set());
  }

  const postMap = new Map<string, { views: number; visitors: Set<string>; engagedMs: number; ai: number }>();
  const referrerMap = new Map<string, { views: number; ai: boolean }>();
  const allVisitors = new Set<string>();

  for (const event of events) {
    const day = berlinDay(event.t);
    const point = seriesMap.get(day);
    if (!point) continue;
    const post = postMap.get(event.slug) || { views: 0, visitors: new Set<string>(), engagedMs: 0, ai: 0 };
    if (event.type === 'view') {
      point.views += 1;
      post.views += 1;
      if (event.sid) {
        visitorsByDay.get(day)?.add(event.sid);
        post.visitors.add(event.sid);
        allVisitors.add(event.sid);
      }
      if (isAiReferrer(event.ref)) {
        point.aiReferrals += 1;
        post.ai += 1;
      }
      const host = referrerHost(event.ref) || (event.ref ? 'unknown' : 'direct');
      const referrer = referrerMap.get(host) || { views: 0, ai: isAiReferrer(event.ref) };
      referrer.views += 1;
      referrerMap.set(host, referrer);
    } else {
      const ms = Math.max(0, Math.min(event.ms || 0, 120_000));
      point.engagedMs += ms;
      post.engagedMs += ms;
    }
    postMap.set(event.slug, post);
  }

  const series = [...seriesMap.values()].map((point) => ({
    ...point,
    visitors: visitorsByDay.get(point.date)?.size || 0,
  }));
  const views = series.reduce((sum, point) => sum + point.views, 0);
  const engagedMs = series.reduce((sum, point) => sum + point.engagedMs, 0);
  const aiReferrals = series.reduce((sum, point) => sum + point.aiReferrals, 0);

  const postPoints: PostPoint[] = [...postMap.entries()]
    .map(([slug, value]) => ({
      slug,
      title: titles.get(slug) || slug,
      views: value.views,
      visitors: value.visitors.size,
      engagedMs: value.engagedMs,
      avgSeconds: value.views ? Math.round(value.engagedMs / value.views / 1000) : 0,
      aiReferrals: value.ai,
    }))
    .sort((left, right) => right.views - left.views || right.engagedMs - left.engagedMs);

  const referrers: ReferrerPoint[] = [...referrerMap.entries()]
    .map(([host, value]) => ({ host, views: value.views, ai: value.ai }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    sources: analyticsSources(),
    totals: {
      views,
      visitors: allVisitors.size,
      engagedMs,
      avgSeconds: views ? Math.round(engagedMs / views / 1000) : 0,
      aiReferrals,
    },
    series,
    posts: postPoints,
    referrers,
    citations,
  };
}
