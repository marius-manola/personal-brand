'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

type Props = {
  slug: string;
};

function sessionId() {
  const key = 'mm_sid';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `anon-${Date.now()}`;
  }
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

export default function BlogAnalytics({ slug }: Props) {
  useEffect(() => {
    const sid = sessionId();
    const path = window.location.pathname;
    const ref = document.referrer || '';
    let last = Date.now();
    let visible = document.visibilityState === 'visible';
    let left = false;

    send({ type: 'view', slug, path, ms: 0, ref, sid });
    track('article_view', { slug });

    const flush = (type: 'tick' | 'leave') => {
      if (type === 'leave' && left) return;
      const now = Date.now();
      const ms = visible ? Math.max(0, now - last) : 0;
      last = now;
      if (type === 'leave') left = true;
      if (ms < 400 && type === 'tick') return;
      send({ type, slug, path, ms, ref, sid });
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
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      flush('leave');
    };
  }, [slug]);

  return null;
}
