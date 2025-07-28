'use client';

import { useRef } from 'react';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import AgeCounter from './components/AgeCounter';

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);

  return (
    <>
      <MobileNavigation />
      
      <div className="min-h-screen overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24" ref={containerRef}>
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1">Marius Manolachi</h1>
                <p className="text-sm text-gray-400">building cool shit I care about</p>
              </header>

              <section className="space-y-12">
                <p className="text-base text-gray-600 leading-relaxed">
                  I&apos;m <AgeCounter /> years old, born and raised in Moldova.<br></br>I love humanity, hiking, technology and solving problems.
                </p>

                <div>
                  <a 
                    href="https://notclass.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 group"
                  >
                    notclass.com
                    <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </section>

              <footer className="text-xs text-gray-400">
                <p>© {new Date().getFullYear()} Marius Manolachi</p>
              </footer>
            </div>
          </main>

          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
