'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const REVEAL_PROGRESS = 0.05;

export default function MobileConsultingPopup() {
  const [shouldShow, setShouldShow] = useState(false);
  const [removed, setRemoved] = useState(false);
  const visible = shouldShow && !removed;

  const dismiss = useCallback(() => {
    setShouldShow(false);
    window.setTimeout(() => setRemoved(true), 420);
  }, []);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    const article = document.querySelector<HTMLElement>('[data-blog-article]');
    if (!article) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const articleTop = window.scrollY + article.getBoundingClientRect().top;
      const scrollableLength = Math.max(article.offsetHeight - window.innerHeight, 1);
      const progress = (window.scrollY - articleTop) / scrollableLength;
      if (progress >= REVEAL_PROGRESS) setShouldShow(true);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('keydown', onKeyDown);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [dismiss]);

  if (removed) return null;

  return (
    <aside
      className={`mobile-consult-pop${visible ? ' mobile-consult-pop-visible' : ''}`}
      aria-label="AI Workflow Sprint"
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="mobile-consult-close"
        onClick={dismiss}
        aria-label="Dismiss workflow sprint offer"
        tabIndex={visible ? 0 : -1}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="mobile-consult-mark" aria-hidden="true">1:1</div>
      <div className="mobile-consult-copy">
        <p>AI Workflow Sprint</p>
        <h2>Turn one repeated task into a working AI system.</h2>
        <span>Seven days. Built with your team. US$1,000.</span>
      </div>
      <Link
        href="/learn-ai"
        className="mobile-consult-link"
        tabIndex={visible ? 0 : -1}
      >
        See how it works <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
