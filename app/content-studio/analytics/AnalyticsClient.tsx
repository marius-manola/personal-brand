'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import type { AnalyticsSnapshot, CitationRecord, Journey } from '@/lib/analytics/types';
import { CHANNEL_COLORS, isInternalSource, sourceMeta } from '@/lib/analytics/sources';
import { GlobeCanvas, GLOBE_RAMP_COLORS } from './GlobeCanvas';
import { tippable } from './tip';
import './analytics.css';

const PLATFORM_LABELS: Record<string, string> = { mac: 'Mac', windows: 'Windows', phone: 'Phone', other: 'Other' };
const DEVICE_COLORS: Record<string, string> = { mac: 'var(--cat1)', windows: 'var(--cat2)', phone: 'var(--cat3)' };
const REGION_NAMES = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

function regionName(cc: string) {
  try {
    return (cc && REGION_NAMES?.of(cc.toUpperCase())) || cc || '?';
  } catch {
    return cc || '?';
  }
}

function flagEmoji(cc: string) {
  return cc && /^[A-Za-z]{2}$/.test(cc)
    ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🌐';
}

function pctOf(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 1000) / 10}%` : '—';
}

function fmtDur(ms: number) {
  return ms >= 90_000 ? `${Math.round(ms / 60000)}min` : `${Math.round(ms / 1000)}s`;
}

function myVid() {
  try {
    return window.localStorage.getItem('mm_vid') || '';
  } catch {
    return '';
  }
}

function DeviceIcon({ device }: { device: string }) {
  const svg = {
    mac: '<svg viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="18.2" r="1.2" fill="#fff" opacity="0.85"/></svg>',
    windows: '<svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4.4v7.1H3V5.5Zm8.6-1.3L21 3v8.5h-9.4V4.2ZM3 12.6h7.5v7.1L3 18.6v-6Zm8.6 0H21V21l-9.4-1.4v-7Z"/></svg>',
  }[device] || '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12.5" rx="2"/><rect x="9" y="18" width="6" height="1.7" rx="0.8"/></svg>';
  return <span className="devico" dangerouslySetInnerHTML={{ __html: svg }} title={PLATFORM_LABELS[device] || 'device'} />;
}

function SourceBadge({ source }: { source: string }) {
  const meta = sourceMeta(source);
  return <span className="smono" style={{ background: meta.color }}>{meta.mono}</span>;
}

function kpiTile(label: string, value: ReactNode, sub?: ReactNode) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value == null || value === '' ? '—' : value}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

function barRow(label: ReactNode, count: number, max: number, sub?: ReactNode, display?: ReactNode) {
  const pct = max > 0 ? Math.max((count / max) * 100, 1.5) : 0;
  return (
    <div className="abar">
      <div className="abar-label">{label}</div>
      <div className="abar-track"><div className="abar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="abar-num">{display ?? count}{sub ? <span className="abar-sub"> {sub}</span> : null}</div>
    </div>
  );
}

function analyticsCard(title: ReactNode, kids: ReactNode, note?: string) {
  return (
    <div className="acard">
      <div className="acard-head">
        <b>{title}</b>
        {note ? <span className="muted" style={{ fontSize: 11 }}>{note}</span> : null}
      </div>
      {kids}
    </div>
  );
}

function donutCard(title: string, rawSlices: Array<{ label: string; value: number; color: string }>, note?: string) {
  const slices = rawSlices.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const shown = slices.slice(0, 5);
  const rest = slices.slice(5);
  if (rest.length) shown.push({ label: 'Other', value: rest.reduce((a, s) => a + s.value, 0), color: 'var(--cat-other)' });
  const total = shown.reduce((a, s) => a + s.value, 0);
  if (!total) return analyticsCard(title, <div className="muted">No data yet</div>, note);
  const R = 34;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = shown.map((s) => {
    const len = (s.value / total) * C;
    const dash = Math.max(len - 1.8, 0.6);
    const seg = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${s.color}" stroke-width="17" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acc}"/>`;
    acc += len;
    return seg;
  }).join('');
  return analyticsCard(title, (
    <div className="donut-wrap">
      <div
        className="donut-svgwrap"
        dangerouslySetInnerHTML={{
          __html: `<svg viewBox="0 0 100 100" class="donut-svg" role="img"><g transform="rotate(-90 50 50)">${segs}</g><text x="50" y="48" text-anchor="middle" class="donut-total">${total}</text><text x="50" y="61" text-anchor="middle" class="donut-cap">visitors</text></svg>`,
        }}
      />
      <div className="donut-legend">
        {shown.map((s) => (
          <div key={s.label} className="dleg" {...tippable(`<b>${s.label}</b><br>${s.value} visitors · ${Math.round((s.value / total) * 100)}%`)}>
            <span className="sw" style={{ background: s.color }} />
            <span className="lbl">{s.label}</span>
            <span className="val">{s.value}</span>
            <span className="pct">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  ), note);
}

function pageChip(path: string) {
  if (path === '/') return ['Home', 'page'] as const;
  if (path === '/learn-ai' || path.startsWith('/learn-ai/')) return ['Opened consulting', 'hot'] as const;
  if (path.startsWith('/blog/')) return [path.replace('/blog/', ''), 'page'] as const;
  return [path, 'page'] as const;
}

function JourneyRow({ journey }: { journey: Journey }) {
  const src = sourceMeta(journey.source);
  const facts = [
    journey.duration ? `stayed ${fmtDur(journey.duration)}` : null,
    journey.maxScroll != null ? `${journey.maxScroll}% scroll` : null,
    journey.engagedMs >= 30_000 ? 'engaged' : null,
  ].filter(Boolean);
  const when = new Date(journey.start);
  const whenLabel = `${when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <div className="jrow">
      <div className="jhead">
        <span className="jflag" {...tippable(regionName(journey.country))}>{flagEmoji(journey.country)}</span>
        <DeviceIcon device={journey.device} />
        <b>{whenLabel}</b>
        <span className="jsrc"><SourceBadge source={journey.source} />{src.label}</span>
        <span className="muted">{facts.join(' · ')}</span>
      </div>
      <div className="jsteps">
        {journey.events.length
          ? journey.events.flatMap((ev, i) => {
              const [label, kind] = pageChip(ev.path);
              return [
                i > 0 ? <span key={`a${i}`} className="jarrow">→</span> : null,
                <span key={`${ev.t}${i}`} className={`jchip ${kind}`}>{label}</span>,
              ];
            })
          : <span className="muted">viewed only</span>}
      </div>
    </div>
  );
}

function TagLinkCard() {
  const [platform, setPlatform] = useState('facebook');
  const [source, setSource] = useState('fbgroup');
  const [medium, setMedium] = useState('post');
  const [path, setPath] = useState('/');
  const [copied, setCopied] = useState(false);

  const platforms = [
    { id: 'facebook', label: 'Facebook', color: '#1877F2', source: 'fbgroup', medium: 'post' },
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', source: 'linkedin', medium: 'post' },
    { id: 'x', label: 'X', color: '#d6d9dc', source: 'x', medium: 'post' },
    { id: 'newsletter', label: 'Email', color: '#b45309', source: 'newsletter', medium: 'email' },
  ];

  let href = 'https://mariusmanolachi.com/';
  try {
    const url = new URL(path.trim() || '/', 'https://mariusmanolachi.com');
    if (source.trim()) url.searchParams.set('utm_source', source.trim());
    if (medium.trim()) url.searchParams.set('utm_medium', medium.trim());
    href = url.href;
  } catch { /* keep default */ }
  const meta = sourceMeta(source.trim() || '(direct)');

  return analyticsCard('Tag a link', (
    <div className="taglink">
      <div className="tl-row">
        <div className="tl-lab">1 · Where you&apos;re posting</div>
        <div className="tl-tiles">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`tl-tile${p.id === platform ? ' on' : ''}`}
              style={{ ['--brand' as string]: p.color }}
              onClick={() => { setPlatform(p.id); setSource(p.source); setMedium(p.medium); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tl-row">
        <div className="tl-lab">2 · Your link</div>
        <div className="taglink-fields">
          <label className="taglink-field"><span className="muted">path</span><input value={path} onChange={(e) => setPath(e.target.value)} /></label>
          <label className="taglink-field"><span className="muted">utm_source</span><input value={source} onChange={(e) => setSource(e.target.value)} /></label>
          <label className="taglink-field"><span className="muted">utm_medium</span><input value={medium} onChange={(e) => setMedium(e.target.value)} /></label>
        </div>
        <div className="taglink-out">
          <div className="taglink-url">{href}</div>
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              await navigator.clipboard.writeText(href);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <div className="taglink-brand">
          <SourceBadge source={source.trim() || '(direct)'} />
          <span className="muted">lands under {meta.label} · {meta.channel}</span>
        </div>
      </div>
    </div>
  ), "posted links lose their referrer — tags don't");
}

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [device, setDevice] = useState('');
  const [dailySeries, setDailySeries] = useState<Set<string>>(new Set(['home', 'blog', 'site']));
  const [visitF, setVisitF] = useState({ country: '', action: '', scope: '' });
  const [engine, setEngine] = useState('ChatGPT');
  const [query, setQuery] = useState('');
  const [cited, setCited] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vid, setVid] = useState('');

  useEffect(() => { setVid(myVid()); }, []);

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/content-studio/analytics?days=${days}${device ? `&device=${device}` : ''}${fresh ? '&fresh=1' : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load analytics');
      setData(await response.json() as AnalyticsSnapshot);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [days, device]);

  useEffect(() => { void load(); }, [load]);

  const toggleCountry = async (cc: string) => {
    const cur = new Set(data?.excludedCountries || []);
    if (cur.has(cc)) cur.delete(cc); else cur.add(cc);
    await fetch('/api/content-studio/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'exclude-countries', countries: [...cur] }),
    });
    await load(true);
  };

  const resetCountries = async () => {
    await fetch('/api/content-studio/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'exclude-countries', countries: [] }),
    });
    await load(true);
  };

  const hideMe = async () => {
    let id = vid;
    if (!id) {
      try {
        id = window.localStorage.getItem('mm_vid') || crypto.randomUUID().replace(/-/g, '');
        window.localStorage.setItem('mm_vid', id);
      } catch {
        return;
      }
      setVid(id);
    }
    await fetch('/api/content-studio/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'exclude-me', vid: id }),
    });
    await load(true);
  };

  const logCitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/content-studio/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, query: query.trim(), cited }),
      });
      if (!response.ok) throw new Error('Could not save citation');
      setData(await response.json() as AnalyticsSnapshot);
      setQuery('');
    } finally {
      setSaving(false);
    }
  };

  const f = data?.funnel;
  const t = data?.totals;
  const eng = data?.engagement;
  const desk = data?.funnelClass.find((row) => row.class === 'desktop') || { visitors: 0, readers: 0, engaged: 0, consulting: 0, pageviews: 0 };
  const mob = data?.funnelClass.find((row) => row.class === 'mobile') || { visitors: 0, readers: 0, engaged: 0, consulting: 0, pageviews: 0 };
  const visitorTotal = (desk.visitors || 0) + (mob.visitors || 0);
  const topSource = data?.sourcesTable[0];
  const topPlat = data?.devices[0];
  const excludedSet = useMemo(() => new Set(data?.excludedCountries || []), [data?.excludedCountries]);
  const countries = useMemo(() => {
    const rows = [...(data?.countries || [])];
    for (const cc of excludedSet) if (!rows.some((c) => c.country === cc)) rows.push({ country: cc, visitors: 0 });
    return rows;
  }, [data?.countries, excludedSet]);
  const counts = useMemo(() => new Map(countries.map((c) => [c.country, c.visitors])), [countries]);
  const activeCountries = countries.filter((c) => !excludedSet.has(c.country));
  const offCountries = countries.filter((c) => excludedSet.has(c.country));
  const maxCountry = Math.max(1, ...activeCountries.map((c) => c.visitors));

  const journeys = data?.journeys || [];
  const shown = journeys.filter((j) => {
    if (visitF.country && j.country !== visitF.country) return false;
    if (visitF.scope === 'home' && !j.paths.includes('/')) return false;
    if (visitF.scope === 'blog' && !j.paths.some((p) => p.startsWith('/blog/'))) return false;
    if (visitF.action === 'consulting' && !j.paths.some((p) => p === '/learn-ai' || p.startsWith('/learn-ai/'))) return false;
    if (visitF.action === 'engaged' && j.engagedMs < 30_000) return false;
    if (visitF.action === 'viewed' && j.paths.length <= 1 && j.engagedMs < 30_000) return false;
    return true;
  });
  const countryCounts = new Map<string, number>();
  for (const j of journeys) if (j.country) countryCounts.set(j.country, (countryCounts.get(j.country) || 0) + 1);

  const series = [
    { key: 'home', label: 'Home', visitors: 'home_visitors' as const, pageviews: 'home_pageviews' as const },
    { key: 'blog', label: 'Blog', visitors: 'blog_visitors' as const, pageviews: 'blog_pageviews' as const },
    { key: 'site', label: 'Rest of site', visitors: 'site_visitors' as const, pageviews: 'site_pageviews' as const },
  ];
  const activeSeries = series.filter((s) => dailySeries.has(s.key));
  const propertyDaily = data?.propertyDaily || [];

  const steps: Array<[string, number]> = f
    ? [['Visited any page', f.visitors], ['Read a post', f.readers], ['Stayed 30s+', f.engaged], ['Opened consulting', f.consulting]]
    : [];

  const byChannel = new Map<string, number>();
  for (const row of data?.sourcesTable || []) {
    const ch = sourceMeta(row.source).channel;
    byChannel.set(ch, (byChannel.get(ch) || 0) + row.visitors);
  }

  return (
    <div className="signal">
      <header className="signal-pagebar">
        <div>
          <h1>Signal, without the <em>noise.</em></h1>
          <p className="sub">One first-party event store. Humans only. Founder traffic stripped. Every number is one visitor-attributed funnel from first pageview through consulting.</p>
        </div>
        <div className="actions">
          <span className={`badge ${data?.sources.kv ? 'ok' : 'warn'}`}>{data?.sources.kv ? 'Live store on' : 'Live store off'}</span>
          <Link href="/content-studio" className="btn ghost sm">Desk</Link>
          <Link href="/content-studio/control" className="btn ghost sm">Growth control</Link>
        </div>
      </header>

      <div className="signal-content">
        <div className="reco">
          <div>
            <div className="label">All-source funnel</div>
            <div className="muted" style={{ fontSize: 12 }}>mariusmanolachi.com → /api/analytics/collect → Upstash · humans only, bots counted separately</div>
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Range">
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <div className="chips">
            {[['','All'],['mac','Mac'],['windows','Windows'],['phone','Phone']].map(([v, l]) => (
              <button key={v || 'all'} type="button" className={device === v ? 'on' : ''} onClick={() => setDevice(v)}>{l}</button>
            ))}
          </div>
          <button type="button" className="btn ghost sm" onClick={hideMe}>
            This is me · {data?.excludedVisitors ? `${data.excludedVisitors} hidden` : 'hide my traffic'}
          </button>
          {(data?.excludedCountries || []).length ? (
            <button type="button" className="btn ghost sm" onClick={resetCountries}>
              ⊘ {data!.excludedCountries.length} {data!.excludedCountries.length === 1 ? 'country' : 'countries'} hidden · reset
            </button>
          ) : null}
          <button type="button" className="btn gray sm" disabled={loading} onClick={() => load(true)}>
            {loading ? 'Loading…' : '↻ Live refresh'}
          </button>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {loading && !data ? <div className="empty"><b>Crunching numbers…</b>Reading the first-party event store.</div> : null}

        {f && t ? (
          <>
            <div className="kpis">
              {kpiTile('Site visitors', f.visitors, `${f.pageviews} pageviews · ${desk.visitors} desktop · ${mob.visitors} mobile`)}
              {kpiTile('Read a post', f.readers, `${pctOf(f.readers, f.visitors)} of visitors`)}
              {kpiTile('Stayed 30s+', f.engaged, `${pctOf(f.engaged, f.visitors)} of visitors`)}
              {kpiTile('Opened consulting', f.consulting, `${pctOf(f.consulting, f.visitors)} of visitors`)}
              {kpiTile('Top source', topSource ? sourceMeta(topSource.source).label : '—', topSource ? `${topSource.visitors} visitors · ${topSource.consulting} consulting` : null)}
              {kpiTile('Top platform', topPlat ? PLATFORM_LABELS[topPlat.device] : '—', topPlat ? `${topPlat.visitors} site visitors` : null)}
              {kpiTile('Time on site', eng?.avg_secs != null ? `${eng.avg_secs}s` : '—', 'average per visitor')}
              {kpiTile('Scroll depth', eng?.avg_scroll != null ? `${eng.avg_scroll}%` : '—', 'average max')}
            </div>

            <section className="asec">
              <div className="asec-title">Acquisition surfaces · included in the funnel above</div>
              <div className="kpis site-kpis">
                {kpiTile('Sessions', t.sessions, `${t.visitors} unique visitors`)}
                {kpiTile('All pageviews', t.pageviews, 'home + blog + rest of site')}
                {kpiTile('Home visitors', t.homeVisitors, 'unique visitors on /')}
                {kpiTile('Blog visitors', t.blogVisitors, 'unique visitors on articles')}
                {kpiTile('Blog pageviews', t.blogPageviews, 'all article views')}
                {kpiTile('Consulting visitors', t.consultingVisitors, 'opened /learn-ai')}
                {kpiTile('Bot events', data.bots.bot_events, 'excluded from every human number')}
              </div>
            </section>

            <section className="asec">
              <div className="asec-title">The funnel · who converts</div>
              <div className="agrid">
                {analyticsCard('All-traffic funnel', steps.map(([label, n], i) => (
                  <div key={label}>{barRow(label, n, steps[0][1], i > 0 && steps[i - 1][1] ? `${pctOf(n, steps[i - 1][1])} of prev` : null)}</div>
                )), 'unique visitors · all entry pages and first-touch sources')}
                {analyticsCard('Desktop vs mobile', [
                  <div key="desk">{barRow('Desktop visitors', desk.visitors, visitorTotal || 1, `${desk.consulting} consulting · ${desk.engaged} stayed`)}</div>,
                  <div key="mob">{barRow('Mobile visitors', mob.visitors, visitorTotal || 1, `${mob.consulting} consulting · ${mob.engaged} stayed`)}</div>,
                ], 'all pages · same visitor population')}
              </div>
            </section>

            {propertyDaily.length ? (
              <section className="asec">
                <div className="asec-title">Daily traffic</div>
                <div className="agrid">
                  <div className="acard daily-compare">
                    <div className="acard-head">
                      <b>Daily visitors</b>
                      <span className="muted" style={{ fontSize: 11 }}>stacked unique humans · hover a day for visitors and pageviews</span>
                    </div>
                    <div className="series-toggles">
                      {series.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          className={`series-toggle${dailySeries.has(s.key) ? ' on' : ''}`}
                          onClick={() => setDailySeries((cur) => {
                            const next = new Set(cur);
                            if (next.has(s.key)) next.delete(s.key); else next.add(s.key);
                            return next;
                          })}
                        >
                          <i className={`series-swatch ${s.key}`} />{s.label}
                        </button>
                      ))}
                    </div>
                    {activeSeries.length ? (() => {
                      const dayTotal = (row: typeof propertyDaily[number]) => activeSeries.reduce((sum, s) => sum + (Number(row[s.visitors]) || 0), 0);
                      const peak = Math.max(1, ...propertyDaily.map(dayTotal));
                      const roughStep = peak / 5;
                      const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
                      const normalized = roughStep / magnitude;
                      const tickStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
                      const axisMax = Math.max(tickStep, Math.ceil(peak / tickStep) * tickStep);
                      const ticks = Array.from({ length: Math.round(axisMax / tickStep) + 1 }, (_, i) => i * tickStep);
                      return (
                        <div className="stack-chart" role="img" aria-label={`Stacked daily unique visitors. Peak ${peak}`}>
                          <div className="stack-y-label" aria-hidden>Visitors</div>
                          <div className="stack-y-axis" aria-hidden>
                            {ticks.map((tick) => <span key={tick} className="stack-y-tick" style={{ bottom: `${(tick / axisMax) * 100}%` }}>{tick.toLocaleString()}</span>)}
                          </div>
                          <div className="stack-plot">
                            <div className="stack-grid" aria-hidden>
                              {ticks.map((tick) => <i key={tick} className="stack-grid-line" style={{ bottom: `${(tick / axisMax) * 100}%` }} />)}
                            </div>
                            <div className="stack-columns">
                              {propertyDaily.map((row) => {
                                const total = dayTotal(row);
                                const tip = activeSeries.map((s) => `<b>${s.label}</b>: ${(Number(row[s.visitors]) || 0).toLocaleString()} visitors · ${(Number(row[s.pageviews]) || 0).toLocaleString()} views`).join('<br>');
                                return (
                                  <div key={row.day} className="stack-col" {...tippable(`<b>${row.day}</b><br><b>Total</b>: ${total.toLocaleString()} visitors<br>${tip}`)}>
                                    <div className="stack-bar-wrap">
                                      <div className="stack-bar" style={{ height: `${(total / axisMax) * 100}%` }}>
                                        {activeSeries.map((s) => {
                                          const n = Number(row[s.visitors]) || 0;
                                          return n ? <i key={s.key} className={`stack-segment ${s.key}`} style={{ flexGrow: n }} /> : null;
                                        })}
                                      </div>
                                    </div>
                                    <div className="stack-day">{row.day.slice(5)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })() : <div className="muted">Turn on a property to draw its daily bars.</div>}
                  </div>
                </div>
              </section>
            ) : null}

            {data.pages.length ? (
              <section className="asec">
                <div className="asec-title">Pages · site-wide views</div>
                <div className="agrid">
                  {analyticsCard('Every page', (
                    <div className="apagewrap">
                      <table className="custable apagetable">
                        <thead>
                          <tr>
                            <th>Page</th>
                            <th>Views</th>
                            <th>Visitors</th>
                            <th>Avg time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.pages.map((p) => (
                            <tr key={p.path}>
                              <td title={p.path}>{p.title === p.path ? p.path : `${p.title} · ${p.path}`}</td>
                              <td>{p.pageviews}</td>
                              <td>{p.visitors}</td>
                              <td>{p.avgSeconds}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ), `${data.pages.length} pages · complete selected window · no top-N cap`)}
                </div>
              </section>
            ) : null}

            {data.sourcesTable.length ? (
              <section className="asec">
                <div className="asec-title">Where they come from · first-touch through consulting</div>
                <div className="agrid">
                  {analyticsCard('Every source → consulting', (
                    <div className="apagewrap">
                      <table className="custable apagetable asourcetable">
                        <thead>
                          <tr>
                            <th>First-touch source</th>
                            <th>Visitors</th>
                            <th>Read a post</th>
                            <th>Stayed 30s+</th>
                            <th>Consulting</th>
                            <th>Visit → consulting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.sourcesTable.map((s) => {
                            const m = sourceMeta(s.source);
                            const internal = isInternalSource(s.source);
                            const label = internal
                              ? 'Your site (nav)'
                              : (m.label === s.source || s.source.includes('.') || s.source.startsWith('(') ? m.label : `${m.label} · ${s.source}`);
                            return (
                              <tr key={s.source}>
                                <td title={s.source}>
                                  <div className="srclabel">
                                    <SourceBadge source={s.source} />
                                    <span className="txt">{label}</span>
                                    {internal ? <span className="muted" style={{ fontSize: 10, border: '1px solid currentColor', borderRadius: 4, padding: '0 4px', marginLeft: 6, opacity: 0.5 }}>internal</span> : null}
                                  </div>
                                </td>
                                <td>{s.visitors}</td>
                                <td>{s.readers}</td>
                                <td>{s.engaged}</td>
                                <td className={s.consulting > 0 ? 'paid-cell' : ''}>{s.consulting}</td>
                                <td>{pctOf(s.consulting, s.visitors)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ), 'first pageview source · unique visitors at each stage · complete selected window')}
                  {donutCard('Channels', [...byChannel].map(([label, value]) => ({
                    label,
                    value,
                    color: CHANNEL_COLORS[label] || 'var(--cat-other)',
                  })), 'share of visitors')}
                </div>
              </section>
            ) : null}

            {data.devices.length ? (
              <section className="asec">
                <div className="asec-title">What they&apos;re on · Mac vs Windows vs phone</div>
                <div className="agrid">
                  {donutCard('Platforms', data.devices.map((r) => ({
                    label: PLATFORM_LABELS[r.device] || 'Other',
                    value: r.visitors,
                    color: DEVICE_COLORS[r.device] || 'var(--cat-other)',
                  })), 'all site visitors by OS')}
                  {visitorTotal ? donutCard('Desktop vs mobile share', [
                    { label: 'Desktop', value: desk.visitors, color: 'var(--cat1)' },
                    { label: 'Mobile', value: mob.visitors, color: 'var(--cat3)' },
                  ], 'all site visitors') : null}
                </div>
              </section>
            ) : null}

            {countries.length ? (
              <section className="asec">
                <div className="asec-title">The world · click to hide a country from every number</div>
                <div className="agrid">
                  {analyticsCard(
                    <>World {excludedSet.size ? <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> — {excludedSet.size} {excludedSet.size === 1 ? 'country' : 'countries'} switched off</span> : null}</>,
                    <div className="worldwrap">
                      <div className="globebox">
                        <GlobeCanvas counts={counts} excluded={excludedSet} onToggle={toggleCountry} />
                        <div className="glegend">
                          <span className="glegend-cap">fewer</span>
                          {GLOBE_RAMP_COLORS.map((c) => <i key={c} style={{ background: c }} />)}
                          <span className="glegend-cap">more</span>
                          {excludedSet.size ? <span className="glegend-off"><i />switched off</span> : null}
                        </div>
                      </div>
                      <div className="clist">
                        {[...activeCountries, ...offCountries].map((c) => {
                          const off = excludedSet.has(c.country);
                          return (
                            <div key={c.country} className={`crow${off ? ' off' : ''}`}>
                              {barRow(`${flagEmoji(c.country)} ${regionName(c.country)}`, c.visitors, maxCountry, off ? 'off' : null)}
                              <button type="button" className="btn ghost sm ctoggle" onClick={() => toggleCountry(c.country)}>
                                {off ? 'show' : 'hide'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>,
                    'drag to spin · click a country (or “hide”) to drop it from all analytics',
                  )}
                </div>
              </section>
            ) : null}

            {journeys.length ? (
              <section className="asec">
                <div className="asec-title">Visit explorer · every sitting, newest first</div>
                <div className="agrid">
                  {analyticsCard(
                    <>Visit explorer <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> — {shown.length} of {journeys.length} visits · {data.eventLogCount} events</span></>,
                    <>
                      <div className="utoolbar" style={{ marginBottom: 10 }}>
                        <select value={visitF.country} onChange={(e) => setVisitF((cur) => ({ ...cur, country: e.target.value }))}>
                          <option value="">All countries ({journeys.length})</option>
                          {[...countryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                            <option key={c} value={c}>{flagEmoji(c)} {regionName(c)} · {n}</option>
                          ))}
                        </select>
                        <div className="chips">
                          {[['','Every page'],['home','Home visits'],['blog','Blog visits']].map(([v, l]) => (
                            <button key={v || 'allp'} type="button" className={visitF.scope === v ? 'on' : ''} onClick={() => setVisitF((cur) => ({ ...cur, scope: v }))}>{l}</button>
                          ))}
                        </div>
                        <div className="chips">
                          {[['','All'],['consulting','Opened consulting'],['engaged','Stayed 30s+'],['viewed','Viewed only']].map(([v, l]) => (
                            <button key={v || 'alla'} type="button" className={visitF.action === v ? 'on' : ''} onClick={() => setVisitF((cur) => ({ ...cur, action: v }))}>{l}</button>
                          ))}
                        </div>
                        {visitF.country || visitF.action || visitF.scope ? (
                          <button type="button" className="btn ghost sm" onClick={() => setVisitF({ country: '', action: '', scope: '' })}>× Clear filters</button>
                        ) : null}
                      </div>
                      <div className="ajourneys">
                        {shown.length
                          ? shown.map((j) => <JourneyRow key={j.id} journey={j} />)
                          : <div className="muted" style={{ padding: '10px 2px' }}>No sessions match these filters — clear one and try again.</div>}
                      </div>
                    </>,
                    'all sittings in the window · 30-minute inactivity split · no top-N cap · bots excluded · newest first',
                  )}
                </div>
              </section>
            ) : null}

            <section className="asec">
              <div className="agrid">
                <TagLinkCard />
                {analyticsCard('Citation log', (
                  <>
                    <form className="cite-form" onSubmit={logCitation}>
                      <select value={engine} onChange={(e) => setEngine(e.target.value)} aria-label="Engine">
                        {['ChatGPT', 'Perplexity', 'Gemini', 'Claude', 'Copilot', 'Google AI Overviews'].map((name) => (
                          <option key={name}>{name}</option>
                        ))}
                      </select>
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Query you asked" aria-label="Query" />
                      <label className="muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="checkbox" checked={cited} onChange={(e) => setCited(e.target.checked)} />
                        Cited
                      </label>
                      <button type="submit" className="btn sm" disabled={saving || !query.trim()}>Log</button>
                    </form>
                    {data.citations.length ? (
                      <ul className="cite-list">
                        {data.citations.slice(0, 20).map((item: CitationRecord) => (
                          <li key={item.id}>
                            <b>{item.engine}</b>
                            <span>{item.query}</span>
                            <em className={item.cited ? 'cite-hit' : 'cite-miss'}>{item.cited ? 'cited' : 'miss'}</em>
                            <time className="muted">{item.date}</time>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="muted">Ask an engine a target query, then log whether this site was cited.</p>}
                  </>
                ), 'manual GEO checks · not mixed into the funnel')}
              </div>
            </section>
          </>
        ) : null}

        {data && !f?.visitors && !loading ? (
          <div className="empty">
            <b>No human visits in this window.</b>
            Open a public page, or wait for live traffic. Local hits count. Country only stamps on Vercel.
          </div>
        ) : null}
      </div>
    </div>
  );
}
