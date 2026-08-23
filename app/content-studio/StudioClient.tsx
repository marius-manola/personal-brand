'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './studio.module.css';

type Stage = 'idle' | 'idea' | 'research' | 'write' | 'review' | 'image' | 'publish' | 'done' | 'failed';
type PublishedPostMetric = {
  slug: string;
  title: string;
  date: string;
  wordCount: number;
  readingTime: number;
  imageCount: number;
  liveUrl: string;
};
type WordBandMix = {
  counts: { focused: number; standard: number; flagship: number };
  total: number;
  next?: { id: string; min: number; max: number; label: string };
};
type Metrics = {
  today: string;
  publishedToday: number;
  targetToday: number;
  remainingToday: number;
  totalPublished: number;
  currentWordCount: number;
  currentImageCount: number;
  history: PublishedPostMetric[];
};
type GeneratedImage = {
  id: string;
  path: string;
  alt: string;
  accountId: string;
  createdAt: string;
};
type TopicItem = {
  id: string;
  query: string;
  cluster?: string;
  intent?: string;
  seoWhy?: string;
  competition?: 'low' | 'medium' | 'high';
  score?: number;
  status: 'ready' | 'claimed' | 'used' | 'rejected';
  rejectReason?: string;
};
type OwnedPost = { slug: string; title: string; query: string; cluster?: string };
type Plan = {
  owned: OwnedPost[];
  ready: TopicItem[];
  claimed: TopicItem[];
  rejected: TopicItem[];
  ownedCount: number;
  readyCount: number;
  claimedCount: number;
};
type TopicBank = {
  status: 'idle' | 'researching' | 'ready' | 'failed';
  error?: string;
  researching?: boolean;
  topics: TopicItem[];
};
type QueueItem = {
  id: string;
  topic?: string;
  status: 'generating' | 'imaging' | 'ready' | 'publishing' | 'published' | 'failed' | 'quarantined';
  stage?: Stage;
  title?: string;
  slug?: string;
  message?: string;
  error?: string;
  hasDraft?: boolean;
  wordCount?: number;
  wordBand?: 'focused' | 'standard' | 'flagship';
  contentType?: 'original-research' | 'decision-tool' | 'failure-clinic' | 'implementation-lab' | 'capability-guide' | 'commercial-decision';
  wordMin?: number;
  wordMax?: number;
  liveUrl?: string;
};
type Job = {
  id?: string;
  status: 'idle' | 'running' | 'waiting' | 'done' | 'failed';
  stage: Stage;
  message: string;
  startedAt?: string;
  updatedAt?: string;
  title?: string;
  slug?: string;
  liveUrl?: string;
  error?: string;
  log?: string[];
  workerAlive?: boolean;
  stopRequested?: boolean;
  imageTarget?: number;
  images?: GeneratedImage[];
  metrics?: Metrics;
  blogCodex?: {
    loggedIn: boolean;
    email?: string;
    home: string;
    model: string;
    isolated: true;
    activeAccountId: string;
    accounts: Array<{
      id: string;
      label: string;
      email?: string;
      loggedIn: boolean;
      active: boolean;
    }>;
    usage?: {
      plan: string;
      usedPercent: number;
      remainingPercent: number;
      resetsAt?: string;
      resetAfterSeconds?: number;
      windowLabel: string;
      allowed: boolean;
      limitReached: boolean;
      source: 'live' | 'session';
    } | null;
  };
  imageProvider?: 'gemini' | 'codex';
  gemini?: { installed?: boolean; browserOpen?: boolean; signedIn?: boolean; lastError?: string | null };
  geminiConnected?: boolean;
  telegramConfigured?: boolean;
  topics?: TopicBank;
  plan?: Plan;
  queue?: QueueItem[];
  generatingCount?: number;
  imagingCount?: number;
  maxParallel?: number;
  maxStock?: number;
  maxPerDay?: number;
  stock?: { target?: number; onHand?: number; needed?: number };
  wordBands?: WordBandMix;
  autopilot?: { lastAction?: string; lastTickAt?: string; lastError?: string | null };
};
type Settings = {
  enabled: boolean;
  postsPerDay: number;
  scheduleMode?: 'spread' | 'daily-batch' | 'autopilot';
  thinkEnabled?: boolean;
  imageProvider?: 'gemini' | 'codex';
  schedulerRunning?: boolean;
  telegramConfigured?: boolean;
  telegramChatReady?: boolean;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WRITE_STAGES: Stage[] = ['idea', 'research', 'write', 'review'];

function calendarFor(metrics?: Metrics) {
  if (!metrics) return { label: '', year: 0, month: 0, cells: [] as Array<{ day: number; count: number; date: string } | null> };
  const [year, month] = metrics.today.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const counts = new Map<number, number>();
  metrics.history.forEach((post) => {
    const [postYear, postMonth, postDay] = post.date.split('-').map(Number);
    if (postYear === year && postMonth === month) counts.set(postDay, (counts.get(postDay) || 0) + 1);
  });
  const length = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, count: counts.get(day) || 0, date };
  });
  return {
    label: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    year,
    month,
    cells,
  };
}

function postsByDay(posts: PublishedPostMetric[]) {
  const groups = new Map<string, PublishedPostMetric[]>();
  for (const post of posts) {
    const list = groups.get(post.date) || [];
    list.push(post);
    groups.set(post.date, list);
  }
  return [...groups.entries()].sort(([left], [right]) => right.localeCompare(left));
}

function readableDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function chipClass(status: QueueItem['status']) {
  if (status === 'ready') return `${styles.chip} ${styles.chipReady}`;
  if (status === 'failed') return `${styles.chip} ${styles.chipFail}`;
  if (status === 'quarantined') return `${styles.chip} ${styles.chipHold}`;
  if (status === 'generating' || status === 'imaging' || status === 'publishing') return `${styles.chip} ${styles.chipWork}`;
  return styles.chip;
}

function jobLabel(item: QueueItem) {
  return item.title || item.topic || item.slug || item.id;
}

function wordsLabel(count?: number) {
  if (typeof count !== 'number') return null;
  return `${count.toLocaleString()} words`;
}

function bandLabel(item: { wordMin?: number; wordMax?: number; wordBand?: string }) {
  if (item.wordMin && item.wordMax) return `${item.wordMin.toLocaleString()}-${item.wordMax.toLocaleString()}`;
  return null;
}

function liveBandLabel(count?: number) {
  if (typeof count !== 'number') return null;
  if (count <= 3000) return 'focused';
  if (count <= 4500) return 'standard';
  return 'flagship';
}

function formatUsageReset(iso?: string, seconds?: number) {
  if (iso) {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (seconds && seconds > 0) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h`;
    return `${Math.max(1, Math.round(seconds / 60))}m`;
  }
  return '';
}

export default function StudioClient() {
  const [job, setJob] = useState<Job>({ status: 'idle', stage: 'idle', message: 'Desk is idle.' });
  const [settings, setSettings] = useState<Settings>({ enabled: true, postsPerDay: 8, imageProvider: 'gemini' });
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPace, setSavingPace] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [connectingGemini, setConnectingGemini] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [codexError, setCodexError] = useState('');
  const [codexLoginBusy, setCodexLoginBusy] = useState(false);
  const [laterCount, setLaterCount] = useState(8);
  const [readerId, setReaderId] = useState<string | null>(null);
  const [liveDay, setLiveDay] = useState<string | null>(null);
  const [researchingTopics, setResearchingTopics] = useState(false);
  const [pingingTelegram, setPingingTelegram] = useState(false);
  const [telegramPing, setTelegramPing] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/content-studio/job', { cache: 'no-store' });
      if (response.ok) setJob(await response.json() as Job);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    const response = await fetch('/api/content-studio/settings', { cache: 'no-store' });
    if (response.ok) setSettings(await response.json() as Settings);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && readerId) {
        setReaderId(null);
        return;
      }
      if (event.key === '8') {
        event.preventDefault();
        window.location.href = '/content-studio/analytics';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readerId]);

  useEffect(() => {
    refreshSettings();
    const timer = window.setInterval(refreshSettings, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshSettings]);

  useEffect(() => {
    if (job.geminiConnected) {
      setConnectingGemini(false);
      setConnectionError('');
    }
  }, [job.geminiConnected]);

  const saveSettings = async (next: Settings) => {
    const previous = settings;
    setSettings(next);
    try {
      const response = await fetch('/api/content-studio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error('Could not save settings');
      setSettings(await response.json() as Settings);
    } catch {
      setSettings(previous);
    }
  };

  const updateBlogCodexAccount = async (action: 'login' | 'add' | 'activate', accountId?: string) => {
    setCodexLoginBusy(true);
    setCodexError('');
    try {
      const response = await fetch('/api/content-studio/codex-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, accountId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not update the Codex account');
      await refresh();
      if (action !== 'activate') window.setTimeout(refresh, 4000);
    } catch (error) {
      setCodexError(error instanceof Error ? error.message : 'Could not update the blog Codex account.');
    } finally {
      setCodexLoginBusy(false);
    }
  };

  const signInBlogCodex = () => updateBlogCodexAccount('login', job.blogCodex?.activeAccountId);
  const addBlogCodexAccount = () => updateBlogCodexAccount('add');
  const activateBlogCodexAccount = (accountId: string) => updateBlogCodexAccount('activate', accountId);

  const connectGemini = async () => {
    setConnectingGemini(true);
    setConnectionError('');
    try {
      const response = await fetch('/api/content-studio/open-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; signedIn?: boolean };
      if (!response.ok) throw new Error(payload.error || 'Could not open Gemini');
      setConnectingGemini(false);
      if (!payload.signedIn) setConnectionError('Brave opened. Sign into Google in that window once.');
      window.setTimeout(refresh, 2500);
    } catch (error) {
      setConnectingGemini(false);
      setConnectionError(error instanceof Error ? error.message : 'Brave did not open.');
    }
  };

  const pingTelegram = async () => {
    setPingingTelegram(true);
    setTelegramPing('');
    try {
      const response = await fetch('/api/content-studio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pingTelegram: true }),
      });
      const payload = await response.json() as Settings & { ping?: { ok?: boolean; error?: string } };
      setSettings(payload);
      setTelegramPing(payload.ping?.ok ? 'Test sent to Telegram.' : payload.ping?.error || 'Telegram ping failed.');
    } finally {
      setPingingTelegram(false);
    }
  };

  const researchTopics = async () => {
    setResearchingTopics(true);
    const response = await fetch('/api/content-studio/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 12 }),
    });
    const payload = await response.json() as TopicBank & { error?: string };
    setResearchingTopics(false);
    if (!response.ok) {
      setJob((current) => ({ ...current, message: payload.error || 'Could not start topic research.' }));
      return;
    }
    setJob((current) => ({ ...current, topics: payload }));
  };

  const generateLater = async () => {
    setLoading(true);
    const topics = topic.split('\n').map((line) => line.trim()).filter(Boolean);
    const response = await fetch('/api/content-studio/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ later: true, count: laterCount, topics, topic: topics[0] || topic.trim() }),
    });
    const payload = await response.json() as Job & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setJob((current) => ({ ...current, status: 'failed', stage: 'failed', message: payload.error || 'Could not queue posts.' }));
      return;
    }
    setJob(payload);
  };

  const deleteQueued = async (id: string) => {
    setLoading(true);
    const response = await fetch('/api/content-studio/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteQueuedId: id }),
    });
    const payload = await response.json() as Job & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setJob((current) => ({ ...current, message: payload.error || 'Could not delete queued post.' }));
      return;
    }
    setJob(payload);
  };

  const publishQueued = async (id: string) => {
    setLoading(true);
    const response = await fetch('/api/content-studio/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishQueuedId: id }),
    });
    const payload = await response.json() as Job & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setJob((current) => ({ ...current, status: 'failed', stage: 'failed', message: payload.error || 'Could not publish queued post.' }));
      return;
    }
    setJob(payload);
  };

  const start = async () => {
    setLoading(true);
    const response = await fetch('/api/content-studio/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim() }),
    });
    const payload = await response.json() as Job & { error?: string };
    setLoading(false);
    if (!response.ok) {
      setJob((current) => ({ ...current, status: 'failed', stage: 'failed', message: payload.error || 'Could not start.' }));
      return;
    }
    setJob(payload);
  };

  const stop = async () => {
    setStopping(true);
    try {
      const response = await fetch('/api/content-studio/job', { method: 'DELETE' });
      const payload = await response.json() as Job;
      if (response.ok) setJob(payload);
    } finally {
      setStopping(false);
    }
  };

  const metrics = job.metrics;
  const calendar = calendarFor(metrics);
  const imageProvider = job.imageProvider || settings.imageProvider || 'gemini';
  const usesCodexImages = imageProvider === 'codex';
  const imagesReady = Boolean(job.geminiConnected) || Boolean(job.blogCodex?.loggedIn);
  const telegramReady = Boolean(job.telegramConfigured ?? settings.telegramConfigured);
  const autopilotOn = Boolean(settings.enabled && settings.scheduleMode !== 'spread');
  const topicBank = job.topics;
  const readyTopicCount = (topicBank?.topics || []).filter((item) => item.status === 'ready').length;
  const topicsBusy = Boolean(topicBank?.researching || topicBank?.status === 'researching' || researchingTopics);
  const hasManualTopics = topic.split('\n').map((line) => line.trim()).filter(Boolean).length > 0;
  const isActive = job.status === 'running' || job.status === 'waiting';
  const canStop = isActive || Boolean(job.workerAlive) || (job.generatingCount || 0) > 0 || (job.imagingCount || 0) > 0;
  const generatedImages = job.images || [];
  const imageTarget = job.imageTarget || 3;
  const publishedToday = metrics?.publishedToday ?? 0;
  const targetToday = metrics?.targetToday ?? settings.postsPerDay;
  const remainingToday = metrics?.remainingToday ?? Math.max(0, targetToday - publishedToday);
  const fillPercent = targetToday > 0 ? Math.min(100, Math.round((publishedToday / targetToday) * 100)) : 0;

  const lanes = useMemo(() => {
    const queue = job.queue || [];
    const seen = new Set<string>();
    const take = (status: QueueItem['status']) => queue.filter((item) => {
      const effectiveStatus = item.stage === 'image' && (item.status === 'publishing' || item.status === 'imaging')
        ? 'imaging'
        : item.stage === 'publish' && (item.status === 'publishing' || item.status === 'imaging')
          ? 'publishing'
          : item.status;
      if (effectiveStatus !== status) return false;
      seen.add(item.id);
      return true;
    });
    const writing = take('generating');
    const imaging = take('imaging');
    const publishing = take('publishing');
    if (job.id && !seen.has(job.id) && isActive) {
      const current: QueueItem = {
        id: job.id,
        title: job.title,
        slug: job.slug,
        topic: job.title,
        status: job.stage === 'image' ? 'imaging' : job.stage === 'publish' ? 'publishing' : 'generating',
        message: job.message,
        wordCount: job.metrics?.currentWordCount,
      };
      if (WRITE_STAGES.includes(job.stage) || job.stage === 'idle') writing.unshift(current);
      else if (job.stage === 'image') imaging.unshift(current);
      else if (job.stage === 'publish') publishing.unshift(current);
    }
    return { writing, imaging, publishing, ready: take('ready'), failed: take('failed') };
  }, [job, isActive]);

  const laterQueue = useMemo(
    () => (job.queue || []).filter((item) => item.status !== 'published'),
    [job.queue],
  );
  const liveGroups = useMemo(() => {
    const posts = (metrics?.history || []).filter((post) => !liveDay || post.date === liveDay);
    return postsByDay(posts);
  }, [metrics?.history, liveDay]);

  const startDisabled = loading || stopping || isActive || !job.blogCodex?.loggedIn || !imagesReady || remainingToday <= 0 || (!topic.trim() && readyTopicCount < 1);
  const startLabel = isActive
    ? 'A post is already moving'
    : remainingToday <= 0
      ? 'Daily cap reached'
      : !job.blogCodex?.loggedIn
        ? 'Sign in blog Codex'
        : !topic.trim() && readyTopicCount < 1
          ? 'Research topics first'
          : imagesReady
            ? 'Write and publish one'
            : 'Connect Gemini or use Codex images';
  const bankOnHand = job.stock?.onHand ?? (lanes.ready.length + lanes.writing.length + lanes.imaging.length);
  const stockNeeded = Math.max(0, laterCount - bankOnHand);
  const laterDisabled = loading || stopping || !job.blogCodex?.loggedIn || stockNeeded < 1 || (stockNeeded > 0 && !hasManualTopics && readyTopicCount < 1);
  const laterLabel = !job.blogCodex?.loggedIn
    ? 'Sign in blog Codex'
    : stockNeeded < 1
      ? `Already have ${bankOnHand} queued`
      : `Stock ${laterCount} · generate ${stockNeeded}`;

  return (
    <main className={styles.shell}>
      <div className={styles.desk}>
        <header className={styles.mast}>
          <div>
            <h1>Content desk</h1>
            <p>Writers stock unique queries. Images run on other jobs. Publish one live post at a time. Analytics is on the next desk.</p>
          </div>
          <div className={styles.lamps}>
            <span className={`${styles.lamp} ${job.blogCodex?.loggedIn ? (job.blogCodex.usage?.limitReached || (job.blogCodex.usage?.remainingPercent ?? 100) < 20 ? styles.lampWarn : styles.lampOn) : ''}`}>
              <i /> Codex {job.blogCodex?.usage
                ? job.blogCodex.usage.limitReached
                  ? 'limit reached'
                  : `${job.blogCodex.usage.remainingPercent}% left`
                : job.blogCodex?.loggedIn ? job.blogCodex.email || 'signed in' : 'signed out'}
            </span>
            <span className={`${styles.lamp} ${job.gemini?.signedIn || usesCodexImages ? styles.lampOn : styles.lampWarn}`}>
              <i /> Images {job.gemini?.signedIn ? 'Gemini' : usesCodexImages ? 'Codex' : 'Gemini first · sign in'}
            </span>
            <span className={`${styles.lamp} ${telegramReady ? styles.lampOn : styles.lampWarn}`}>
              <i /> Telegram {telegramReady ? 'ready' : 'missing env'}
            </span>
            <span className={`${styles.lamp} ${settings.schedulerRunning ? styles.lampOn : autopilotOn ? styles.lampWarn : ''}`}>
              <i /> Scheduler {settings.schedulerRunning ? 'alive' : 'off'}
            </span>
            <Link href="/content-studio/analytics" className={styles.lamp}>Analytics <kbd style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>8</kbd></Link>
            <Link href="/content-studio/control" className={styles.lamp}>Growth control</Link>
            <Link href="/blog" target="_blank" className={styles.lamp}>Blog ↗</Link>
          </div>
        </header>

        <section className={styles.ticket} aria-label="Today's production ticket">
          <div className={styles.fill}>
            <div className={styles.fillLabel}>{metrics?.today ? readableDate(metrics.today) : 'Today'}</div>
            <div className={styles.flap} aria-label={`${publishedToday} of ${targetToday} published today`}>
              {String(publishedToday).padStart(2, '0')}<em>/{String(targetToday).padStart(2, '0')}</em>
            </div>
            <div className={styles.fillMeter}><i style={{ width: `${fillPercent}%` }} /></div>
            <div className={styles.meta}>
              <span>{remainingToday} left today</span>
              <span>{lanes.ready.length} ready</span>
              <span>{job.generatingCount || 0}/{job.maxParallel || 5} writing</span>
              <span>{job.imagingCount || 0} imaging</span>
              {job.wordBands && (
                <span>
                  profiles {job.wordBands.counts.focused}/{job.wordBands.counts.standard}/{job.wordBands.counts.flagship}
                  {' '}(1.5-3k / 1.8-3.5k / 3-6k)
                </span>
              )}
            </div>
          </div>
          <div className={styles.action}>
            <h2>{job.autopilot?.lastAction || job.message || 'Watching the queue'}</h2>
            <p>
              {autopilotOn
                ? `Autopilot fills ${settings.postsPerDay} live posts whenever this laptop is on. Failures retry, then Telegram if it needs you.`
                : 'Autopilot is off. Stock drafts or publish one by hand.'}
            </p>
            {job.autopilot?.lastError && <p>{job.autopilot.lastError}</p>}
            <div className={styles.meta}>
              <span>Cap {job.maxPerDay || 10}/day</span>
              <span>{metrics?.totalPublished ?? 0} live all-time</span>
              {job.blogCodex?.usage && (
                <span>
                  {job.blogCodex.usage.plan} · {job.blogCodex.usage.remainingPercent}% left {job.blogCodex.usage.windowLabel}
                  {formatUsageReset(job.blogCodex.usage.resetsAt, job.blogCodex.usage.resetAfterSeconds)
                    ? ` · resets ${formatUsageReset(job.blogCodex.usage.resetsAt, job.blogCodex.usage.resetAfterSeconds)}`
                    : ''}
                </span>
              )}
              {job.updatedAt && <span>Updated {new Date(job.updatedAt).toLocaleTimeString()}</span>}
            </div>
          </div>
          <div className={styles.controls}>
            <div className={styles.controlRow}>
              <span>Autopilot</span>
              <button
                type="button"
                className={`${styles.toggle} ${autopilotOn ? styles.toggleOn : ''}`}
                onClick={() => saveSettings({
                  ...settings,
                  enabled: !autopilotOn,
                  scheduleMode: !autopilotOn ? 'autopilot' : 'spread',
                  postsPerDay: !autopilotOn ? Math.max(settings.postsPerDay, 8) : settings.postsPerDay,
                })}
              >
                {autopilotOn ? 'On' : 'Off'}
              </button>
            </div>
            <div className={styles.controlRow}>
              <span>Daily target</span>
              <select
                className={styles.select}
                aria-label="Posts per day"
                value={settings.postsPerDay}
                disabled={savingPace}
                onChange={(event) => {
                  const postsPerDay = Number(event.target.value);
                  setSavingPace(true);
                  saveSettings({ ...settings, postsPerDay, enabled: postsPerDay > 0 }).finally(() => setSavingPace(false));
                }}
              >
                <option value={0}>Paused</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <option value={count} key={count}>{count}/day{count === 10 ? ' max' : ''}</option>
                ))}
              </select>
            </div>
            <div className={styles.controlRow}>
              <span>Images</span>
              <select
                className={styles.select}
                aria-label="Image generator"
                value={imageProvider}
                onChange={(event) => saveSettings({ ...settings, imageProvider: event.target.value === 'codex' ? 'codex' : 'gemini' })}
              >
                <option value="codex">Codex</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
        </section>

        <section className={job.blogCodex?.loggedIn ? styles.accountPanel : styles.warn}>
          <div>
            <h2>{job.blogCodex?.loggedIn ? 'Blog Codex account' : 'Blog Codex is signed out'}</h2>
            <p>
              {job.blogCodex?.loggedIn
                ? `Active: ${job.blogCodex.email || 'connected account'}. Usage and new writers follow this selection.`
                : 'Choose a saved account or sign into a new isolated account. Your normal coding Codex login stays untouched.'}
            </p>
          </div>
          <div className={styles.accountActions}>
            <select
              className={styles.select}
              aria-label="Active Blog Codex account"
              value={job.blogCodex?.activeAccountId || ''}
              disabled={codexLoginBusy || !job.blogCodex?.accounts?.length}
              onChange={(event) => activateBlogCodexAccount(event.target.value)}
            >
              {(job.blogCodex?.accounts || []).map((account) => (
                <option value={account.id} key={account.id}>
                  {account.email || account.label}{account.loggedIn ? '' : ' · signed out'}
                </option>
              ))}
            </select>
            {!job.blogCodex?.loggedIn && (
              <button type="button" className={styles.tiny} onClick={signInBlogCodex} disabled={codexLoginBusy}>
                {codexLoginBusy ? 'Opening login…' : 'Sign in selected'}
              </button>
            )}
            <button type="button" className={styles.toggle} onClick={addBlogCodexAccount} disabled={codexLoginBusy}>
              {codexLoginBusy ? 'Opening login…' : 'Add account'}
            </button>
          </div>
          {codexError && <p>{codexError}</p>}
        </section>

        {!telegramReady && (
          <section className={styles.warn}>
            <h2>Telegram is not configured</h2>
            <p>Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env, then ping once.</p>
          </section>
        )}

        <section className={styles.plan} aria-label="Editorial plan">
          <div className={styles.planHead}>
            <div>
              <h2>Plan</h2>
              <p>Research first. Writers only take a query that does not overlap a live post, a queued draft, or another writer.</p>
            </div>
            <div className={styles.planMeta}>
              <span>{job.plan?.ownedCount ?? metrics?.totalPublished ?? 0} live</span>
              <span>{job.plan?.readyCount ?? readyTopicCount} ready</span>
              <span>{job.plan?.claimedCount || 0} claimed</span>
              <button type="button" className={styles.toggle} onClick={researchTopics} disabled={topicsBusy || !job.blogCodex?.loggedIn}>
                {topicsBusy ? 'Researching…' : readyTopicCount ? 'Refresh topics' : 'Research topics'}
              </button>
            </div>
          </div>
          {topicBank?.error && <p className={styles.planError}>{topicBank.error}</p>}
          <div className={styles.planGrid}>
            <article>
              <h3>Owned live</h3>
              <ul>
                {(job.plan?.owned || []).map((item) => (
                  <li key={item.slug}>
                    <strong>{item.query || item.title}</strong>
                    <span>{item.cluster || item.slug}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Ready to write</h3>
              {(job.plan?.ready || topicBank?.topics.filter((item) => item.status === 'ready') || []).length ? (
                <ul>
                  {(job.plan?.ready || topicBank?.topics.filter((item) => item.status === 'ready') || []).slice(0, 12).map((item) => (
                    <li key={item.id}>
                      <strong>{item.query}</strong>
                      <span>{item.cluster || 'cluster'} · {item.competition || 'unknown'} · {item.score ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.emptyLane}>No unused topics. Research a new batch.</p>}
            </article>
            <article>
              <h3>Blocked overlap</h3>
              {(job.plan?.rejected || []).length ? (
                <ul>
                  {(job.plan?.rejected || []).slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <strong>{item.query}</strong>
                      <span>{item.rejectReason || 'Overlaps an owned query'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.emptyLane}>No blocked topics in this bank.</p>}
            </article>
          </div>
        </section>

        {!job.geminiConnected && imageProvider !== 'codex' && (
          <section className={styles.warn}>
            <h2>Sign into Gemini so images stay free</h2>
            <p>One Brave profile, cookies stay, no API key. Until you sign in, this job will fall back to Codex and burn Plus usage. {connectionError}</p>
            <button type="button" className={styles.tiny} onClick={connectGemini} disabled={connectingGemini}>
              {connectingGemini ? 'Opening Gemini…' : 'Connect Gemini'}
            </button>
          </section>
        )}

        {job.status === 'failed' && (
          <section className={styles.alert}>
            <h2>{job.message}</h2>
            {job.error && <p>{job.error}</p>}
            <button type="button" className={styles.tiny} onClick={start}>Try again</button>
          </section>
        )}

        {job.status === 'done' && job.liveUrl && (
          <section className={styles.ok}>
            <h2>{job.title || 'Published'}</h2>
            <a href={job.liveUrl} target="_blank" rel="noopener noreferrer">Open live post ↗</a>
          </section>
        )}

        <section className={styles.lanes} aria-label="Production lanes">
          <article className={styles.lane}>
            <div className={styles.laneHead}>
              <h2>Write</h2>
              <span>{lanes.writing.length} in lane · {job.generatingCount || 0}/{job.maxParallel || 5} slots</span>
            </div>
            {lanes.writing.length ? (
              <ul className={styles.tickets}>
                {lanes.writing.map((item) => (
                  <li key={item.id} className={styles.jobTicket}>
                    <strong>{jobLabel(item)}</strong>
                    <span>{[wordsLabel(item.wordCount), item.message || 'Codex is writing the post.'].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.emptyLane}>No writers running.</p>}
          </article>
          <article className={`${styles.lane} ${styles.laneImage}`}>
            <div className={styles.laneHead}>
              <h2>Image</h2>
              <span>{lanes.imaging.length} in lane · {generatedImages.length}/{imageTarget} on the current sheet</span>
            </div>
            {lanes.imaging.length ? (
              <ul className={styles.tickets}>
                {lanes.imaging.map((item) => (
                  <li key={item.id} className={styles.jobTicket}>
                    <strong>{jobLabel(item)}</strong>
                    <span>{[wordsLabel(item.wordCount), item.message || 'Making the image set.'].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.emptyLane}>No imagers running. Writers can keep going.</p>}
            {generatedImages.length > 0 && (
              <div className={styles.images}>
                {Array.from({ length: imageTarget }, (_, imageIndex) => {
                  const generated = generatedImages[imageIndex];
                  return generated ? (
                    <a href={generated.path} target="_blank" rel="noopener noreferrer" key={generated.id}>
                      <Image unoptimized src={generated.path} alt={generated.alt} width={160} height={90} />
                      <span>{imageIndex === 0 ? 'Hero' : imageIndex + 1}</span>
                    </a>
                  ) : (
                    <div className={styles.slot} key={imageIndex}>{imageIndex + 1}</div>
                  );
                })}
              </div>
            )}
          </article>
          <article className={`${styles.lane} ${styles.laneLive}`}>
            <div className={styles.laneHead}>
              <h2>Live</h2>
              <span>{lanes.publishing.length ? 'Publishing one' : 'One at a time'}</span>
            </div>
            {lanes.publishing.length ? (
              <ul className={styles.tickets}>
                {lanes.publishing.map((item) => (
                  <li key={item.id} className={styles.jobTicket}>
                    <strong>{jobLabel(item)}</strong>
                    <span>{[wordsLabel(item.wordCount), item.message || 'Build, commit, push, verify.'].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.emptyLane}>{lanes.ready.length} drafts waiting for a live slot.</p>}
          </article>
        </section>

        <section className={styles.board}>
          <article className={styles.panel}>
            <div className={styles.queueHead}>
              <div>
                <h2>Later queue</h2>
                <p>Unpublished drafts only. Read one before it goes live. Public date is stamped on publish day.</p>
              </div>
              <span>
                {lanes.ready.length} ready · {lanes.failed.length} failed
                {job.stock?.target ? ` · stocking ${bankOnHand}/${job.stock.target}` : ''}
              </span>
            </div>
            {laterQueue.length > 0 ? (
              <ul className={styles.queueList}>
                {laterQueue.slice(0, 30).map((item) => (
                  <li key={item.id} className={styles.queueRow}>
                    <span className={chipClass(item.status)}>{item.status}</span>
                    <div>
                      <strong>
                        {jobLabel(item)}
                        {(typeof item.wordCount === 'number' || bandLabel(item)) && (
                          <em className={styles.words}>
                            {' '}
                            {[wordsLabel(item.wordCount), bandLabel(item) ? `slot ${bandLabel(item)}` : null].filter(Boolean).join(' · ')}
                          </em>
                        )}
                      </strong>
                      <p>{item.error || item.message || 'In the bank.'}</p>
                    </div>
                    <div className={styles.queueActions}>
                      {item.hasDraft && (
                        <button type="button" className={styles.tiny} onClick={() => setReaderId(item.id)}>Read</button>
                      )}
                      {(item.status === 'ready' || item.status === 'failed') && (
                        <button type="button" className={styles.tiny} onClick={() => publishQueued(item.id)} disabled={loading || remainingToday <= 0 || !imagesReady}>
                          {remainingToday <= 0 ? 'Capped' : item.status === 'failed' ? 'Retry' : 'Publish'}
                        </button>
                      )}
                      <button type="button" className={styles.ghost} onClick={() => deleteQueued(item.id)} disabled={loading}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.emptyLane}>Nothing stocked yet. Research topics, then stock drafts.</p>}
            {(job.log && job.log.length > 0) && (
              <ol className={styles.log}>
                {job.log.slice(-12).map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
              </ol>
            )}
          </article>

          <article className={styles.panel}>
            <h2>Commands</h2>
            <p>Pick how many drafts to keep in the later queue. Ready and in-flight posts already count. Writers start only the shortfall, five at a time. Autopilot still publishes ready drafts up to today’s target — turn it off if you only want to stock.</p>
            <div className={styles.commands}>
              <div className={styles.controlRow}>
                <span>Topic bank</span>
                <button type="button" className={styles.toggle} onClick={researchTopics} disabled={topicsBusy || !job.blogCodex?.loggedIn}>
                  {topicsBusy ? 'Researching…' : readyTopicCount ? `${readyTopicCount} ready` : 'Research topics'}
                </button>
              </div>
              {topicBank?.error && <p>{topicBank.error}</p>}
              {(topicBank?.topics?.length || 0) > 0 && (
                <ul className={styles.topicList}>
                  {topicBank!.topics.slice(0, 8).map((item) => (
                    <li key={item.id} className={styles.topicRow}>
                      <strong>{item.query}</strong>
                      <span>{item.cluster || 'cluster'} · {item.competition || 'unknown'} · {item.score ?? '—'} · {item.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Optional overrides, one query per line. Blank uses the topic bank."
              />
              <div className={styles.controlRow}>
                <span>Keep in queue</span>
                <select className={styles.select} aria-label="How many drafts to keep in the later queue" value={laterCount} onChange={(event) => setLaterCount(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((count) => <option value={count} key={count}>{count} drafts</option>)}
                </select>
              </div>
              <div className={styles.stack}>
                <button type="button" className={styles.solid} onClick={start} disabled={startDisabled}>{startLabel}</button>
                <button type="button" className={styles.later} onClick={generateLater} disabled={laterDisabled}>{laterLabel}</button>
                <button type="button" className={styles.danger} onClick={stop} disabled={loading || stopping || !canStop}>
                  {stopping ? 'Stopping…' : canStop ? 'Stop every process' : 'Nothing to stop'}
                </button>
              </div>
              <div className={styles.controlRow}>
                <span>Telegram</span>
                <button type="button" className={styles.toggle} onClick={pingTelegram} disabled={pingingTelegram || !telegramReady}>
                  {pingingTelegram ? 'Sending…' : 'Send test'}
                </button>
              </div>
              {telegramPing && <p>{telegramPing}</p>}
              {!usesCodexImages && (
                <button type="button" className={styles.toggle} onClick={connectGemini} disabled={connectingGemini}>
                  {connectingGemini ? 'Opening Gemini…' : 'Re-open Gemini'}
                </button>
              )}
            </div>
          </article>
        </section>

        <section className={styles.history}>
          <div className={styles.historyHead}>
            <div>
              <h2>Live posts</h2>
              <p>{calendar.label || 'Published'}. Grouped by the public date, not the day they were written. Click a day to filter.</p>
            </div>
            <span>{liveDay ? `${readableDate(liveDay)} · click the day again to show all` : `${metrics?.totalPublished ?? 0} total`}</span>
          </div>
          <div className={styles.historyGrid}>
            <div>
              <div className={styles.calendar}>
                {WEEKDAYS.map((day) => <span className={styles.weekday} key={day}>{day}</span>)}
                {calendar.cells.map((cell, index) => cell ? (
                  <button
                    type="button"
                    className={`${styles.day} ${cell.count ? styles.dayOn : ''} ${liveDay === cell.date ? styles.dayActive : ''}`}
                    key={`${cell.day}-${index}`}
                    onClick={() => setLiveDay((current) => current === cell.date ? null : cell.date)}
                    disabled={!cell.count}
                    aria-pressed={liveDay === cell.date}
                    aria-label={cell.count ? `${readableDate(cell.date)}, ${cell.count} live` : readableDate(cell.date)}
                  >
                    <span>{cell.day}</span>{cell.count > 0 && <strong>{cell.count}</strong>}
                  </button>
                ) : <div className={styles.blank} key={`blank-${index}`} />)}
              </div>
            </div>
            <div className={styles.postList}>
              {liveGroups.length ? liveGroups.map(([date, posts]) => (
                <section key={date} className={styles.dayGroup}>
                  <h3>{readableDate(date)} · {posts.length}</h3>
                  {posts.map((post) => (
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" key={post.slug} className={styles.postRowDay}>
                      <div>
                        <strong>
                          {post.title}
                          <em className={styles.words}> {[wordsLabel(post.wordCount), liveBandLabel(post.wordCount)].filter(Boolean).join(' · ')}</em>
                        </strong>
                        <span>{post.imageCount} images · {post.readingTime} min</span>
                      </div>
                      <i>↗</i>
                    </a>
                  ))}
                </section>
              )) : <p className={styles.emptyLane}>{liveDay ? 'Nothing live on that day.' : 'Published posts land here.'}</p>}
            </div>
          </div>
        </section>

        {readerId && (
          <div className={styles.reader} role="dialog" aria-modal="true" aria-label="Draft preview" onClick={() => setReaderId(null)}>
            <div className={styles.readerSheet} onClick={(event) => event.stopPropagation()}>
              <div className={styles.readerBar}>
                <strong>Draft preview</strong>
                <button type="button" className={styles.ghost} onClick={() => setReaderId(null)}>Close</button>
              </div>
              <iframe title="Draft post" src={`/content-studio/preview/${readerId}`} />
            </div>
          </div>
        )}

        <footer className={styles.foot}>
          <span>{job.message}</span>
          <Link href="/blog" target="_blank">mariusmanolachi.com/blog</Link>
        </footer>
      </div>
    </main>
  );
}
