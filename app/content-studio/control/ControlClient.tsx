'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './control.module.css';

type Tab = 'overview' | 'search' | 'lifecycle' | 'geo' | 'conversions' | 'distribution';
type UrlRow = {
  slug: string; title: string; date: string; cluster: string; query: string; state: string; action: string;
  clicks: number; impressions: number; ctr: number; position: number; indexed?: boolean; ageDays: number;
  inboundLinks: number; outboundLinks: number; evidenceScore: number;
  coverageState?: string; userCanonical?: string; googleCanonical?: string;
  queries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
};
type Snapshot = {
  generatedAt: string;
  configuration: { searchConsole: boolean; searchConsoleProperty: string; searchSource: string; searchUpdatedAt?: string };
  totals: { urls: number; clicks: number; impressions: number; ctr: number; indexed: number; winners: number; withoutContextualInbound: number };
  technical: { canonicalOrigin: string; sitemapUrl: string; inspected: number; pageWithRedirect: number; duplicateWithoutCanonical: number; canonicalMismatch: number };
  clusters: Array<{ id: string; label: string; posts: number; clicks: number; impressions: number; winners: number; avgEvidence: number }>;
  urls: UrlRow[];
  opportunities: UrlRow[];
  geo: {
    prompts: Array<{ id: string; cluster: string; prompt: string; variants?: string[] }>;
    recentRuns: Array<{ id: string; date: string; engine: string; prompt: string; cited: boolean; absorbed: boolean; url?: string }>;
    count: number; searchRate: number; retrievalRate: number; citationRate: number; absorptionRate: number;
    byEngine: Array<{ engine: string; runs: number; cited: number; absorbed: number }>;
  };
  distribution: Array<{ id: string; slug: string; title: string; url: string; channel: string; audience: string; angle: string; status: string }>;
};
type Conversions = {
  ctaImpressions: number; ctaClicks: number; intakeStarts: number; intakeSubmits: number;
  calendarOpens: number; booked: number; paid: number;
  byLandingPage: Array<{ slug: string; ctaClicks: number; intakeStarts: number; intakeSubmits: number; calendarOpens: number; booked: number; paid: number }>;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' }, { id: 'search', label: 'Search' },
  { id: 'lifecycle', label: 'Lifecycle' }, { id: 'geo', label: 'GEO lab' },
  { id: 'conversions', label: 'Conversions' }, { id: 'distribution', label: 'Distribution' },
];

const pct = (value: number) => `${(value * 100).toFixed(value > 0 && value < .1 ? 1 : 0)}%`;
const num = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value || 0));
const stateLabel = (value: string) => value.replace(/-/g, ' ');

function Kpi({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <article className={styles.kpi}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

export default function ControlClient() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Snapshot | null>(null);
  const [conversions, setConversions] = useState<Conversions | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [searchImport, setSearchImport] = useState('');
  const [geo, setGeo] = useState({ engine: 'ChatGPT', prompt: '', url: '', cited: false, absorbed: false, searchActivated: true, retrieved: false, prominent: false, atom: '' });
  const [manualLanding, setManualLanding] = useState('manual');

  const load = useCallback(async () => {
    const [controlResponse, analyticsResponse] = await Promise.all([
      fetch('/api/content-studio/control', { cache: 'no-store' }),
      fetch('/api/content-studio/analytics?days=90', { cache: 'no-store' }),
    ]);
    if (!controlResponse.ok) throw new Error('Could not load the growth control plane.');
    setData(await controlResponse.json() as Snapshot);
    if (analyticsResponse.ok) {
      const analytics = await analyticsResponse.json() as { conversions?: Conversions };
      setConversions(analytics.conversions || null);
    }
  }, []);

  useEffect(() => { load().catch((reason) => setError(reason.message)); }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action); setError('');
    try {
      const response = await fetch('/api/content-studio/control', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Action failed.');
      setData(payload as Snapshot);
      if (action === 'import-search') setSearchImport('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(''); }
  };

  const importRows = () => {
    try {
      const parsed = JSON.parse(searchImport);
      void act('import-search', { rows: Array.isArray(parsed) ? parsed : parsed.rows || [] });
    } catch { setError('Paste valid Search Console JSON: an array or an object with rows.'); }
  };

  const recordGeo = async () => {
    await act('record-geo', geo);
    setGeo((current) => ({ ...current, prompt: '', url: '', cited: false, absorbed: false, retrieved: false, prominent: false, atom: '' }));
  };

  const recordOutcome = async (action: 'record-booked' | 'record-paid') => {
    setBusy(action); setError('');
    try {
      const response = await fetch('/api/content-studio/analytics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, landingSlug: manualLanding }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not record outcome.');
      setConversions(payload.conversions || null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(''); }
  };

  const lifecycle = useMemo(() => data?.urls.slice().sort((a, b) => {
    const order: Record<string, number> = { 'not-indexed': 0, cannibalized: 1, invisible: 2, 'ctr-opportunity': 3, winner: 4, developing: 5, watching: 6 };
    return (order[a.state] ?? 9) - (order[b.state] ?? 9) || b.impressions - a.impressions;
  }) || [], [data]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><p>Content Studio</p><h1>Growth control</h1><span>Eight posts keep shipping. This desk raises yield per URL.</span></div>
        <nav><Link href="/content-studio">Production</Link><Link href="/content-studio/analytics">Analytics</Link><Link className={styles.active} href="/content-studio/control">Growth</Link><Link href="/blog" target="_blank">Blog ↗</Link></nav>
      </header>
      <div className={styles.tabs} role="tablist">
        {tabs.map((item) => <button key={item.id} className={tab === item.id ? styles.tabOn : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {!data ? <div className={styles.loading}>Building the URL graph…</div> : (
        <div className={styles.content}>
          {tab === 'overview' && <>
            <section className={styles.kpis}>
              <Kpi label="Published URLs" value={num(data.totals.urls)} note="production remains continuous" />
              <Kpi label="Search impressions" value={num(data.totals.impressions)} note={data.configuration.searchSource} />
              <Kpi label="Search clicks" value={num(data.totals.clicks)} note={`${pct(data.totals.ctr)} CTR`} />
              <Kpi label="Winners" value={data.totals.winners} note="position ≤15 with demand" />
              <Kpi label="GEO citation rate" value={pct(data.geo.citationRate)} note={`${data.geo.count} measured runs`} />
              <Kpi label="Intake submits" value={conversions?.intakeSubmits || 0} note={`${conversions?.calendarOpens || 0} calendar opens`} />
            </section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Cluster compounding</h2><p>Formats stay balanced; demand decides which cluster receives the next URLs.</p></div></div>
              <div className={styles.clusterGrid}>{data.clusters.map((cluster) => <article key={cluster.id}><h3>{cluster.label}</h3><strong>{cluster.impressions} impressions</strong><span>{cluster.posts} URLs · {cluster.winners} winners · evidence {cluster.avgEvidence}/100</span><Link href={`/blog/topic/${cluster.id}`} target="_blank">Open hub ↗</Link></article>)}</div>
            </section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Next actions</h2><p>Highest-leverage work generated from indexing, demand, CTR and position.</p></div></div><UrlTable rows={data.opportunities.slice(0, 12)} /></section>
          </>}

          {tab === 'search' && <>
            <section className={styles.kpis}>
              <Kpi label="Preferred host" value="www" note={data.technical.canonicalOrigin} />
              <Kpi label="URLs inspected" value={data.technical.inspected} note="current canonical host" />
              <Kpi label="Page with redirect" value={data.technical.pageWithRedirect} note="GSC status on preferred URLs" />
              <Kpi label="Duplicate, no canonical" value={data.technical.duplicateWithoutCanonical} note="GSC status on preferred URLs" />
              <Kpi label="Canonical mismatch" value={data.technical.canonicalMismatch} note="declared URL differs" />
            </section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Indexability contract</h2><p>Every sitemap URL must return 200 directly and declare itself on {data.technical.canonicalOrigin}. The publishing worker now blocks a release when the new article redirects, declares another canonical, or is missing from the sitemap.</p></div><a href={data.technical.sitemapUrl} target="_blank" rel="noreferrer">Open sitemap ↗</a></div></section>
            <section className={styles.connection}><div><span className={data.configuration.searchConsole ? styles.good : styles.warn}>{data.configuration.searchConsole ? 'Connected' : 'Credentials missing'}</span><h2>Google Search Console</h2><p>{data.configuration.searchConsoleProperty || 'Set SEARCH_CONSOLE_SITE_URL and GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN, or paste an export below.'}</p></div><div><button disabled={busy !== '' || !data.configuration.searchConsole} onClick={() => act('sync-search')}>{busy === 'sync-search' ? 'Syncing…' : 'Sync D-3 data'}</button><button disabled={busy !== '' || !data.configuration.searchConsole} onClick={() => act('inspect')}>Inspect recent URLs</button></div></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Manual/API import</h2><p>Accepts Search Analytics rows with date, page, query, clicks, impressions, ctr and position.</p></div><button disabled={!searchImport || busy !== ''} onClick={importRows}>Import rows</button></div><textarea className={styles.importBox} value={searchImport} onChange={(event) => setSearchImport(event.target.value)} placeholder='[{"date":"2026-08-20","page":"https://…/blog/slug","query":"…","clicks":1,"impressions":20,"ctr":0.05,"position":12.4}]' /></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Pages and queries</h2><p>Sorted by observed impressions, never estimated search volume.</p></div></div><UrlTable rows={data.urls.filter((row) => row.impressions > 0)} showQueries /></section>
          </>}

          {tab === 'lifecycle' && <section className={styles.panel}><div className={styles.panelHead}><div><h2>Day 3 / 7 / 14 / 28 control lane</h2><p>New publishing never pauses. These are parallel refresh, consolidation and authority actions.</p></div></div><UrlTable rows={lifecycle} /></section>}

          {tab === 'geo' && <>
            <section className={styles.kpis}><Kpi label="Search activation" value={pct(data.geo.searchRate)} /><Kpi label="Retrieval" value={pct(data.geo.retrievalRate)} /><Kpi label="Citation" value={pct(data.geo.citationRate)} /><Kpi label="Absorption" value={pct(data.geo.absorptionRate)} /></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Record a repeated GEO run</h2><p>Measure retrieval, citation and answer absorption separately.</p></div><button disabled={!geo.prompt || busy !== ''} onClick={recordGeo}>Save run</button></div>
              <div className={styles.formGrid}><select value={geo.engine} onChange={(event) => setGeo({ ...geo, engine: event.target.value })}><option>ChatGPT</option><option>Google AI</option><option>Perplexity</option><option>Gemini</option></select><input value={geo.prompt} onChange={(event) => setGeo({ ...geo, prompt: event.target.value })} placeholder="Prompt or paraphrase" /><input value={geo.url} onChange={(event) => setGeo({ ...geo, url: event.target.value })} placeholder="Cited URL" /><input value={geo.atom} onChange={(event) => setGeo({ ...geo, atom: event.target.value })} placeholder="Fact or artifact absorbed" /></div>
              <div className={styles.checks}>{(['searchActivated','retrieved','cited','prominent','absorbed'] as const).map((key) => <label key={key}><input type="checkbox" checked={geo[key]} onChange={(event) => setGeo({ ...geo, [key]: event.target.checked })} />{stateLabel(key)}</label>)}</div>
            </section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>30-prompt weekly panel</h2><p>Five current queries per cluster, each with three repeatable paraphrases.</p></div></div><div className={styles.promptGrid}>{data.geo.prompts.map((item) => <article key={item.id}><span>{item.cluster}</span><h3>{item.prompt}</h3>{(item.variants || [item.prompt]).map((variant) => <button key={variant} onClick={() => setGeo({ ...geo, prompt: variant })}>{variant}</button>)}</article>)}</div></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Recent measurements</h2><p>Repeat prompts and paraphrases; a single run is not a ranking.</p></div></div><table><thead><tr><th>Date</th><th>Engine</th><th>Prompt</th><th>Cited</th><th>Absorbed</th></tr></thead><tbody>{data.geo.recentRuns.map((run) => <tr key={run.id}><td>{run.date.slice(0, 10)}</td><td>{run.engine}</td><td>{run.prompt}</td><td>{run.cited ? 'Yes' : 'No'}</td><td>{run.absorbed ? 'Yes' : 'No'}</td></tr>)}</tbody></table></section>
          </>}

          {tab === 'conversions' && <>
            <section className={styles.kpis}><Kpi label="CTA impressions" value={conversions?.ctaImpressions || 0} /><Kpi label="CTA clicks" value={conversions?.ctaClicks || 0} /><Kpi label="Intake starts" value={conversions?.intakeStarts || 0} /><Kpi label="Intake submits" value={conversions?.intakeSubmits || 0} /><Kpi label="Calendar opens" value={conversions?.calendarOpens || 0} /><Kpi label="Booked / paid" value={`${conversions?.booked || 0} / ${conversions?.paid || 0}`} /></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Lead attribution by landing post</h2><p>The first landing slug stays attached through CTA, intake and calendar events.</p></div></div><table><thead><tr><th>Landing URL</th><th>CTA clicks</th><th>Starts</th><th>Submits</th><th>Calendar</th><th>Booked</th></tr></thead><tbody>{(conversions?.byLandingPage || []).map((row) => <tr key={row.slug}><td>{row.slug}</td><td>{row.ctaClicks}</td><td>{row.intakeStarts}</td><td>{row.intakeSubmits}</td><td>{row.calendarOpens}</td><td>{row.booked}</td></tr>)}</tbody></table></section>
            <section className={styles.panel}><div className={styles.panelHead}><div><h2>Close the offline loop</h2><p>Calendar and payment happen outside the site. Record them against the original landing slug.</p></div><div className={styles.outcomeActions}><input value={manualLanding} onChange={(event) => setManualLanding(event.target.value)} placeholder="landing post slug" /><button disabled={busy !== ''} onClick={() => recordOutcome('record-booked')}>Mark booked</button><button disabled={busy !== ''} onClick={() => recordOutcome('record-paid')}>Mark paid</button></div></div></section>
          </>}

          {tab === 'distribution' && <section className={styles.panel}><div className={styles.panelHead}><div><h2>Distribution queue</h2><p>Publishing creates native discussion hooks. Nothing is spam-posted automatically.</p></div></div><div className={styles.distribution}>{data.distribution.map((item) => <article key={item.id}><div><span>{item.channel} · {item.status}</span><h3>{item.title}</h3><p>{item.angle}</p><small>{item.audience}</small></div><div><button onClick={() => navigator.clipboard.writeText(`${item.angle}\n\n${item.url}`)}>Copy</button><button disabled={busy !== ''} onClick={() => act('distribution-status', { id: item.id, status: 'published' })}>Mark published</button><button disabled={busy !== ''} onClick={() => act('distribution-status', { id: item.id, status: 'skipped' })}>Skip</button></div></article>)}</div></section>}
        </div>
      )}
    </main>
  );
}

function UrlTable({ rows, showQueries = false }: { rows: UrlRow[]; showQueries?: boolean }) {
  return <div className={styles.tableWrap}><table><thead><tr><th>URL / query</th><th>State</th><th>Impr.</th><th>Clicks</th><th>Pos.</th><th>Links</th><th>Evidence</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.slug}><td><a href={`/blog/${row.slug}`} target="_blank">{row.title}</a><small>{showQueries && row.queries.length ? row.queries.map((query) => `${query.query} (${query.impressions})`).join(' · ') : row.query || row.cluster}</small></td><td><span className={`${styles.state} ${styles[`state_${row.state.replace(/-/g, '_')}`] || ''}`}>{stateLabel(row.state)}</span></td><td>{num(row.impressions)}</td><td>{num(row.clicks)}<small>{row.impressions ? pct(row.ctr) : '—'}</small></td><td>{row.position ? row.position.toFixed(1) : '—'}</td><td>{row.inboundLinks} in<small>{row.outboundLinks} out</small></td><td>{row.evidenceScore}/100</td><td>{row.action}</td></tr>)}</tbody></table></div>;
}
