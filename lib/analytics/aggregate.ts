import { getAllBlogPosts } from '@/lib/server/blog.server';
import { eventSource } from './sources';
import { analyticsSources, berlinDay, readCitations, readConfig, readEvents } from './store';
import { platformOf } from './ua';
import type {
  AnalyticsEvent,
  AnalyticsSnapshot,
  ClassFunnel,
  DayStack,
  DevicePoint,
  Journey,
  JourneyEvent,
  PagePoint,
  Platform,
  SourceFunnel,
} from './types';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/learn-ai': 'Consulting',
  '/essays': 'Essays',
  '/books': 'Books',
  '/projects': 'Projects',
  '/stats': 'Stats',
  '/blog': 'Blog index',
};

const ENGAGED_MS = 30_000;
const SESSION_GAP_MS = 30 * 60 * 1000;
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: AnalyticsSnapshot }>();

const visitorOf = (event: AnalyticsEvent) => event.vid || event.sid || '';
const isBlogPath = (path: string) => path.startsWith('/blog/') && path.split('/').filter(Boolean).length >= 2;
const isHomePath = (path: string) => path === '/';
const isConsultingPath = (path: string) => path === '/learn-ai' || path.startsWith('/learn-ai/');

function emptyDay(date: string): DayStack {
  return {
    day: date,
    home_visitors: 0,
    home_pageviews: 0,
    blog_visitors: 0,
    blog_pageviews: 0,
    site_visitors: 0,
    site_pageviews: 0,
  };
}

function splitJourneys(events: AnalyticsEvent[]): Journey[] {
  const bySid = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    const sid = event.sid || visitorOf(event);
    if (!sid) continue;
    const list = bySid.get(sid) || [];
    list.push(event);
    bySid.set(sid, list);
  }

  const journeys: Journey[] = [];
  for (const [sid, list] of bySid) {
    list.sort((a, b) => a.t.localeCompare(b.t));
    let bucket: AnalyticsEvent[] = [];
    const flush = () => {
      if (!bucket.length) return;
      const start = Date.parse(bucket[0].t);
      const end = Date.parse(bucket[bucket.length - 1].t);
      const firstView = bucket.find((event) => event.type === 'view') || bucket[0];
      const paths = [...new Set(bucket.filter((event) => event.type === 'view').map((event) => event.path))];
      const chips: JourneyEvent[] = [];
      for (const event of bucket) {
        if (event.type !== 'view') continue;
        const last = chips[chips.length - 1];
        if (last && last.path === event.path) continue;
        chips.push({ event: 'pageview', path: event.path, t: event.t });
      }
      const scrolls = bucket.map((event) => event.scroll || 0).filter((value) => value > 0);
      journeys.push({
        id: `${sid}:${start}`,
        start,
        end: Number.isFinite(end) ? end : start,
        duration: Math.max(0, (Number.isFinite(end) ? end : start) - start),
        country: firstView.country || '',
        device: platformOf(firstView),
        source: eventSource(firstView),
        maxScroll: scrolls.length ? Math.max(...scrolls) : null,
        engagedMs: bucket.reduce((sum, event) => sum + (event.type === 'view' ? 0 : Math.max(0, event.ms || 0)), 0),
        events: chips,
        paths,
      });
      bucket = [];
    };

    let last = 0;
    for (const event of list) {
      const at = Date.parse(event.t);
      if (bucket.length && Number.isFinite(at) && at - last > SESSION_GAP_MS) flush();
      bucket.push(event);
      last = Number.isFinite(at) ? at : last;
    }
    flush();
  }

  return journeys.sort((a, b) => b.start - a.start);
}

export async function buildSnapshot(
  rangeDays = 30,
  { device = '', fresh = false }: { device?: string; fresh?: boolean } = {},
): Promise<AnalyticsSnapshot> {
  const window = Math.min(Math.max(Number(rangeDays) || 30, 1), 365);
  const deviceFilter: Exclude<Platform, 'other'> | '' = (['mac', 'windows', 'phone'] as const).includes(device as Exclude<Platform, 'other'>)
    ? device as Exclude<Platform, 'other'>
    : '';
  const config = await readConfig();
  const excludedVisitors = new Set(config.excludeVisitors);
  const excludedCountries = config.excludeCountries;
  const excludedCountrySet = new Set(excludedCountries);
  const cacheKey = `${window}|${deviceFilter}|${excludedCountries.join(',')}|${config.excludeVisitors.join(',')}`;
  const hit = cache.get(cacheKey);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) {
    return { ...hit.data, cached: true };
  }

  const [rawEvents, citations, posts] = await Promise.all([
    readEvents(window),
    readCitations(),
    getAllBlogPosts(),
  ]);
  const titles = new Map(posts.map((post) => [post.slug, post.metadata.title]));

  let botEvents = 0;
  const humans: AnalyticsEvent[] = [];
  for (const event of rawEvents) {
    if (event.bot) {
      botEvents += 1;
      continue;
    }
    const vid = visitorOf(event);
    if (vid && excludedVisitors.has(vid)) continue;
    if (deviceFilter && platformOf(event) !== deviceFilter) continue;
    humans.push(event);
  }

  const counted = humans.filter((event) => !event.country || !excludedCountrySet.has(event.country));
  const now = new Date();
  const seriesMap = new Map<string, DayStack>();
  const homeByDay = new Map<string, Set<string>>();
  const blogByDay = new Map<string, Set<string>>();
  const siteByDay = new Map<string, Set<string>>();
  for (let index = window - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = berlinDay(date.toISOString());
    seriesMap.set(key, emptyDay(key));
    homeByDay.set(key, new Set());
    blogByDay.set(key, new Set());
    siteByDay.set(key, new Set());
  }

  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const readers = new Set<string>();
  const consulting = new Set<string>();
  const engagedMsByVisitor = new Map<string, number>();
  const firstTouch = new Map<string, { t: string; source: string }>();
  const pageMap = new Map<string, { views: number; visitors: Set<string>; engagedMs: number }>();
  const countryVisitors = new Map<string, Set<string>>();
  const countryVisitorsAll = new Map<string, Set<string>>();
  const deviceVisitors = new Map<Platform, Set<string>>();
  const desk = { visitors: new Set<string>(), readers: new Set<string>(), engaged: new Set<string>(), consulting: new Set<string>(), pageviews: 0 };
  const mob = { visitors: new Set<string>(), readers: new Set<string>(), engaged: new Set<string>(), consulting: new Set<string>(), pageviews: 0 };
  const scrollByVisitor = new Map<string, number>();
  const platformByVisitor = new Map<string, Platform>();
  let pageviews = 0;
  let blogPageviews = 0;
  const homeVisitors = new Set<string>();
  const blogVisitors = new Set<string>();
  const conversionCounts = {
    ctaImpressions: 0, ctaClicks: 0, intakeStarts: 0, intakeSubmits: 0,
    calendarOpens: 0, booked: 0, paid: 0,
  };
  const conversionByLanding = new Map<string, typeof conversionCounts>();

  const bumpCountry = (map: Map<string, Set<string>>, code: string, vid: string) => {
    if (!code) return;
    const set = map.get(code) || new Set<string>();
    set.add(vid);
    map.set(code, set);
  };

  for (const event of humans) {
    if (event.type !== 'view') continue;
    const vid = visitorOf(event);
    if (!vid) continue;
    bumpCountry(countryVisitorsAll, event.country, vid);
  }

  for (const event of counted) {
    const vid = visitorOf(event);
    if (!vid) continue;
    const day = berlinDay(event.t);
    const point = seriesMap.get(day);
    if (!point) continue;
    const conversionKey = ({
      cta_impression: 'ctaImpressions', cta_click: 'ctaClicks', intake_start: 'intakeStarts',
      intake_submit: 'intakeSubmits', calendar_open: 'calendarOpens', booked: 'booked', paid: 'paid',
    } as Partial<Record<AnalyticsEvent['type'], keyof typeof conversionCounts>>)[event.type];
    if (conversionKey) {
      conversionCounts[conversionKey] += 1;
      const landing = event.landingSlug || event.slug || 'unknown';
      const row = conversionByLanding.get(landing) || {
        ctaImpressions: 0, ctaClicks: 0, intakeStarts: 0, intakeSubmits: 0,
        calendarOpens: 0, booked: 0, paid: 0,
      };
      row[conversionKey] += 1;
      conversionByLanding.set(landing, row);
      continue;
    }
    const plat = platformOf(event);
    const cls = plat === 'phone' ? mob : desk;
    if (event.sid) sessions.add(event.sid);
    visitors.add(vid);
    cls.visitors.add(vid);
    if (!platformByVisitor.has(vid)) platformByVisitor.set(vid, plat);

    const page = pageMap.get(event.path) || { views: 0, visitors: new Set<string>(), engagedMs: 0 };
    if (event.type === 'view') {
      pageviews += 1;
      cls.pageviews += 1;
      page.views += 1;
      page.visitors.add(vid);
      bumpCountry(countryVisitors, event.country, vid);
      const dSet = deviceVisitors.get(plat) || new Set<string>();
      dSet.add(vid);
      deviceVisitors.set(plat, dSet);

      const prev = firstTouch.get(vid);
      if (!prev || event.t < prev.t) firstTouch.set(vid, { t: event.t, source: eventSource(event) });

      if (isHomePath(event.path)) {
        point.home_pageviews += 1;
        homeByDay.get(day)?.add(vid);
        homeVisitors.add(vid);
      } else if (isBlogPath(event.path)) {
        blogPageviews += 1;
        point.blog_pageviews += 1;
        blogByDay.get(day)?.add(vid);
        blogVisitors.add(vid);
        readers.add(vid);
        cls.readers.add(vid);
      } else {
        point.site_pageviews += 1;
        siteByDay.get(day)?.add(vid);
      }
      if (isConsultingPath(event.path)) {
        consulting.add(vid);
        cls.consulting.add(vid);
      }
    } else {
      const ms = Math.max(0, Math.min(event.ms || 0, 120_000));
      page.engagedMs += ms;
      engagedMsByVisitor.set(vid, (engagedMsByVisitor.get(vid) || 0) + ms);
      if (event.scroll && event.scroll > 0) {
        scrollByVisitor.set(vid, Math.max(scrollByVisitor.get(vid) || 0, event.scroll));
      }
    }
    pageMap.set(event.path, page);
  }

  const engaged = new Set<string>();
  for (const [vid, ms] of engagedMsByVisitor) {
    if (ms >= ENGAGED_MS) engaged.add(vid);
  }
  for (const vid of engaged) {
    const cls = platformByVisitor.get(vid) === 'phone' ? mob : desk;
    cls.engaged.add(vid);
  }

  const sourceMap = new Map<string, SourceFunnel>();
  for (const vid of visitors) {
    const source = firstTouch.get(vid)?.source || '(direct)';
    const row = sourceMap.get(source) || { source, visitors: 0, readers: 0, engaged: 0, consulting: 0 };
    row.visitors += 1;
    if (readers.has(vid)) row.readers += 1;
    if (engaged.has(vid)) row.engaged += 1;
    if (consulting.has(vid)) row.consulting += 1;
    sourceMap.set(source, row);
  }

  const propertyDaily = [...seriesMap.values()].map((point) => ({
    ...point,
    home_visitors: homeByDay.get(point.day)?.size || 0,
    blog_visitors: blogByDay.get(point.day)?.size || 0,
    site_visitors: siteByDay.get(point.day)?.size || 0,
  }));

  const pages: PagePoint[] = [...pageMap.entries()]
    .map(([path, value]) => {
      const slug = path.startsWith('/blog/') ? path.split('/')[2] || '' : '';
      return {
        path,
        title: titles.get(slug) || PAGE_TITLES[path] || path,
        pageviews: value.views,
        visitors: value.visitors.size,
        engagedMs: value.engagedMs,
        avgSeconds: value.views ? Math.round(value.engagedMs / value.views / 1000) : 0,
      };
    })
    .sort((a, b) => b.visitors - a.visitors || b.pageviews - a.pageviews || a.path.localeCompare(b.path));

  const sourcesTable = [...sourceMap.values()]
    .sort((a, b) => b.visitors - a.visitors || b.consulting - a.consulting || a.source.localeCompare(b.source));

  const countries = [...countryVisitorsAll.entries()]
    .map(([country, set]) => ({ country, visitors: set.size }))
    .sort((a, b) => b.visitors - a.visitors || a.country.localeCompare(b.country));

  const devices: DevicePoint[] = [...deviceVisitors.entries()]
    .map(([device, set]) => ({ device, visitors: set.size }))
    .sort((a, b) => b.visitors - a.visitors);

  const toClass = (cls: typeof desk, name: 'desktop' | 'mobile'): ClassFunnel => ({
    class: name,
    visitors: cls.visitors.size,
    pageviews: cls.pageviews,
    readers: cls.readers.size,
    engaged: cls.engaged.size,
    consulting: cls.consulting.size,
  });

  const engagedMs = [...engagedMsByVisitor.values()].reduce((sum, value) => sum + value, 0);
  const scrollValues = [...scrollByVisitor.values()];
  const journeys = splitJourneys(counted);

  const data: AnalyticsSnapshot = {
    generatedAt: new Date().toISOString(),
    rangeDays: window,
    cached: false,
    sources: analyticsSources(),
    excludedCountries,
    excludedVisitors: excludedVisitors.size,
    funnel: {
      visitors: visitors.size,
      pageviews,
      readers: readers.size,
      engaged: engaged.size,
      consulting: consulting.size,
    },
    totals: {
      visitors: visitors.size,
      sessions: sessions.size,
      pageviews,
      homeVisitors: homeVisitors.size,
      blogVisitors: blogVisitors.size,
      blogPageviews,
      consultingVisitors: consulting.size,
    },
    engagement: {
      avg_secs: visitors.size ? Math.round(engagedMs / visitors.size / 1000) : null,
      avg_scroll: scrollValues.length ? Math.round(scrollValues.reduce((a, b) => a + b, 0) / scrollValues.length) : null,
    },
    bots: { bot_events: botEvents },
    funnelClass: [toClass(desk, 'desktop'), toClass(mob, 'mobile')],
    sourcesTable,
    pages,
    propertyDaily,
    countries,
    devices,
    journeys,
    eventLogCount: counted.length,
    citations,
    conversions: {
      ...conversionCounts,
      byLandingPage: [...conversionByLanding.entries()].map(([slug, row]) => ({ slug, ...row }))
        .sort((a, b) => b.intakeSubmits - a.intakeSubmits || b.ctaClicks - a.ctaClicks),
    },
  };
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export function bustAnalyticsCache() {
  cache.clear();
}
