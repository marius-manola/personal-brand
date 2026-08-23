'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';

function storedId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID().replace(/-/g, '');
    storage.setItem(key, next);
    return next;
  } catch {
    return `anon-${Date.now()}`;
  }
}

function visitorId() {
  try {
    return storedId(window.localStorage, 'mm_vid');
  } catch {
    return `anon-${Date.now()}`;
  }
}

function sessionId() {
  try {
    return storedId(window.sessionStorage, 'mm_sid');
  } catch {
    return `anon-${Date.now()}`;
  }
}

function landingSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source');
    if (utm) return utm.slice(0, 80);
  } catch { /* ignore */ }
  return '';
}

function pageSlug(pathname: string) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/blog/')) return pathname.split('/')[2] || 'blog';
  return pathname.replace(/^\//, '').replace(/\//g, '-').slice(0, 80) || 'home';
}

function scrollDepth() {
  const root = document.documentElement;
  const max = root.scrollHeight - root.clientHeight;
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((root.scrollTop / max) * 100)));
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/collect', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

function rememberLanding(pathname: string, src: string) {
  try {
    if (!window.sessionStorage.getItem('mm_landing_slug')) {
      window.sessionStorage.setItem('mm_landing_slug', pageSlug(pathname));
      window.sessionStorage.setItem('mm_landing_src', src);
    }
  } catch { /* storage is optional */ }
}

export default function SiteAnalytics() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname.startsWith('/content-studio') || pathname.startsWith('/api')) return;
    const slug = pageSlug(pathname);
    const sid = sessionId();
    const vid = visitorId();
    const path = pathname;
    const ref = document.referrer || '';
    const src = landingSource();
    rememberLanding(pathname, src);
    let landingSlug = slug;
    try { landingSlug = window.sessionStorage.getItem('mm_landing_slug') || slug; } catch { /* keep current */ }
    let last = Date.now();
    let visible = document.visibilityState === 'visible';
    let left = false;
    let maxScroll = scrollDepth();

    send({ type: 'view', slug, path, ms: 0, ref, src, sid, vid, scroll: maxScroll });
    track('page_view', { slug });

    const offerLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href="/learn-ai"], a[href^="/learn-ai?"]')];
    const impressed = new Set<Element>();
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || impressed.has(entry.target)) continue;
        impressed.add(entry.target);
        send({ type: 'cta_impression', slug, path, ms: 0, ref, src, sid, vid, landingSlug, name: 'learn-ai' });
      }
    }, { threshold: 0.4 }) : null;
    offerLinks.forEach((link) => observer?.observe(link));
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href="/learn-ai"], a[href^="/learn-ai?"]');
      if (!link) return;
      send({ type: 'cta_click', slug, path, ms: 0, ref, src, sid, vid, landingSlug, name: link.textContent?.trim().slice(0, 100) || 'learn-ai' });
      track('cta_click', { slug, landingSlug });
    };
    document.addEventListener('click', onClick);

    const onScroll = () => {
      maxScroll = Math.max(maxScroll, scrollDepth());
    };

    const flush = (type: 'tick' | 'leave') => {
      if (type === 'leave' && left) return;
      const now = Date.now();
      const ms = visible ? Math.max(0, now - last) : 0;
      last = now;
      if (type === 'leave') left = true;
      if (ms < 400 && type === 'tick') return;
      send({ type, slug, path, ms, ref, src, sid, vid, scroll: maxScroll });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush('leave');
        visible = false;
      } else {
        last = Date.now();
        visible = true;
      }
    };

    const timer = window.setInterval(() => {
      if (visible) flush('tick');
    }, 15_000);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => flush('leave'));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      observer?.disconnect();
      flush('leave');
    };
  }, [pathname]);

  return null;
}
