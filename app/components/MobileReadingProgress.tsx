'use client';

import { useEffect, useState } from 'react';

export default function MobileReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const article = document.querySelector<HTMLElement>('[data-blog-article]');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const start = window.scrollY + rect.top;
      const distance = Math.max(article.offsetHeight - window.innerHeight, 1);
      setProgress(Math.max(0, Math.min(1, (window.scrollY - start) / distance)));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span className="m-blog-progress" aria-hidden="true">
      <i style={{ transform: `scaleX(${progress})` }} />
    </span>
  );
}
