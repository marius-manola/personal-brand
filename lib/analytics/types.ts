export type AnalyticsEventType = 'view' | 'tick' | 'leave';

export type AnalyticsEvent = {
  t: string;
  type: AnalyticsEventType;
  slug: string;
  path: string;
  ms: number;
  ref: string;
  sid: string;
  country: string;
  device: string;
  os: string;
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

export type DayPoint = {
  date: string;
  views: number;
  visitors: number;
  engagedMs: number;
  aiReferrals: number;
};

export type PostPoint = {
  slug: string;
  title: string;
  views: number;
  visitors: number;
  engagedMs: number;
  avgSeconds: number;
  aiReferrals: number;
};

export type ReferrerPoint = {
  host: string;
  views: number;
  ai: boolean;
};

export type CountryPoint = {
  code: string;
  name: string;
  views: number;
  lat?: number;
  lon?: number;
};

export type DevicePoint = {
  key: string;
  views: number;
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  rangeDays: number;
  sources: { file: boolean; kv: boolean; vercel: boolean };
  totals: {
    views: number;
    visitors: number;
    engagedMs: number;
    avgSeconds: number;
    aiReferrals: number;
  };
  series: DayPoint[];
  posts: PostPoint[];
  referrers: ReferrerPoint[];
  countries: CountryPoint[];
  devices: DevicePoint[];
  os: DevicePoint[];
  citations: CitationRecord[];
};
