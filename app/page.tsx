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
      
      <div className="min-h-screen bg-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-lg w-full px-8 py-28 sm:py-32" ref={containerRef}>
            <div className="space-y-20">
              <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-medium text-black tracking-tight leading-tight">
                  Marius Manolachi
                </h1>
                <p className="text-base text-gray-500 font-medium tracking-wide">
                  building cool shit I care about 
                </p>
              </header>

              <section className="space-y-16">
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed font-light">
                    I&apos;m <AgeCounter /> years old, born and raised in Moldova. I love humanity, hiking, technology and solving problems.
                  </p>
                </div>

                <div className="pt-4">
                  <a 
                    href="https://notclass.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-base font-medium text-black hover:text-gray-600 transition-all duration-300 group border-b border-gray-200 hover:border-gray-400 pb-1"
                  >
                    notclass.com
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </section>

              <footer className="pt-8">
                <p className="text-sm text-gray-400 font-thin">
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
