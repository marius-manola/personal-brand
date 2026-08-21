'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const DISMISSED_KEY = 'mobile-consulting-offer-dismissed';

export default function MobileConsultingPopup() {
  const pathname = usePathname();
  const [shouldShow, setShouldShow] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const [removed, setRemoved] = useState(false);
  const onLearnPage = pathname === '/learn-ai';
  const visible = shouldShow && !formInView && !removed;

  const dismiss = useCallback(() => {
    setShouldShow(false);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // The offer can still be dismissed when session storage is unavailable.
    }
    window.setTimeout(() => setRemoved(true), 420);
  }, []);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === '1') {
        setRemoved(true);
        return;
      }
    } catch {
      // Continue without persistence when storage access is blocked.
    }

    const reveal = () => setShouldShow(true);
    const timer = window.setTimeout(reveal, 4800);
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.55) reveal();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dismiss]);

  useEffect(() => {
    if (!onLearnPage) return;
    const application = document.querySelector('#mobile-apply');
    if (!application) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFormInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(application);
    return () => observer.disconnect();
  }, [onLearnPage]);

  if (removed) return null;

  return (
    <aside
      className={`mobile-consult-pop${visible ? ' mobile-consult-pop-visible' : ''}`}
      aria-label="One-to-one AI consulting"
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="mobile-consult-close"
        onClick={dismiss}
        aria-label="Dismiss consulting offer"
        tabIndex={visible ? 0 : -1}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="mobile-consult-mark" aria-hidden="true">1:1</div>
      <div className="mobile-consult-copy">
        <p>One-to-one AI consulting</p>
        <h2>Bring the work you are stuck on.</h2>
        <span>We build it together, on your screen, until you can do it without me.</span>
      </div>
      <Link
        href={onLearnPage ? '#mobile-apply' : '/learn-ai'}
        className="mobile-consult-link"
        onClick={() => setShouldShow(false)}
        tabIndex={visible ? 0 : -1}
      >
        See if it fits <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
