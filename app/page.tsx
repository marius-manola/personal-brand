'use client';

import { useRef } from 'react';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import AgeCounter from './components/AgeCounter';
import Copyright from './components/Copyright';

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);

  return (
    <>
      <MobileNavigation />
      
      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main" ref={containerRef}>
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">
                  Marius Manolachi
                </h1>
                <p className="page-subtitle">
                  perpetual learner
                </p>
              </header>

              <section className="space-y-14">
                <div className="max-w-none">
                  <p className="page-body text-[1.08rem]">
                    I&apos;m <AgeCounter /> years old, born and raised in Moldova. I love humanity, hiking, technology and solving problems.
                  </p>
                </div>

                <div className="pt-4">
                  <a 
                    href="https://notclass.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-link group"
                  >
                    notclass.com
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </section>

              <footer className="page-footer">
                <p>
                  © <Copyright /> Marius Manolachi
                </p>
              </footer>
            </div>
          </main>

          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
