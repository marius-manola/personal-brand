export type AnalyticsEventType = 'view' | 'tick' | 'leave';
export type Platform = 'mac' | 'windows' | 'phone' | 'other';

export type AnalyticsEvent = {
  t: string;
  type: AnalyticsEventType;
  slug: string;
  path: string;
  ms: number;
  ref: string;
  src?: string;
  sid: string;
  vid?: string;
  country: string;
  device: string;
  os: string;
  bot?: boolean;
  scroll?: number;
};

export type CitationRecord = {
  id: string;
  date: string;
  engine: string;
  query: string;
  cited: boolean;
  url?: string;
  notes?: string;
};

export type AnalyticsConfig = {
  excludeVisitors: string[];
  excludeCountries: string[];
};

export type FunnelPoint = {
  visitors: number;
  pageviews: number;
  readers: number;
  engaged: number;
  consulting: number;
};

export type SourceFunnel = {
  source: string;
  visitors: number;
  readers: number;
  engaged: number;
  consulting: number;
};

export type PagePoint = {
  path: string;
  title: string;
  pageviews: number;
  visitors: number;
  engagedMs: number;
  avgSeconds: number;
};

export type DayStack = {
  day: string;
  home_visitors: number;
  home_pageviews: number;
  blog_visitors: number;
  blog_pageviews: number;
  site_visitors: number;
  site_pageviews: number;
};

export type CountryPoint = {
  country: string;
  visitors: number;
};

export type DevicePoint = {
  device: Platform;
  visitors: number;
};

export type ClassFunnel = {
  class: 'desktop' | 'mobile';
  visitors: number;
  pageviews: number;
  readers: number;
  engaged: number;
  consulting: number;
};

export type JourneyEvent = {
  event: string;
  path: string;
  t: string;
};

export type Journey = {
  id: string;
  start: number;
  end: number;
  duration: number;
  country: string;
  device: Platform;
  source: string;
  maxScroll: number | null;
  engagedMs: number;
  events: JourneyEvent[];
  paths: string[];
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  rangeDays: number;
  cached: boolean;
  sources: { file: boolean; kv: boolean; vercel: boolean };
  excludedCountries: string[];
  excludedVisitors: number;
  funnel: FunnelPoint;
  totals: {
    visitors: number;
    sessions: number;
    pageviews: number;
    homeVisitors: number;
    blogVisitors: number;
    blogPageviews: number;
    consultingVisitors: number;
  };
  engagement: { avg_secs: number | null; avg_scroll: number | null };
  bots: { bot_events: number };
  funnelClass: ClassFunnel[];
  sourcesTable: SourceFunnel[];
  pages: PagePoint[];
  propertyDaily: DayStack[];
  countries: CountryPoint[];
  devices: DevicePoint[];
  journeys: Journey[];
  eventLogCount: number;
  citations: CitationRecord[];
};
