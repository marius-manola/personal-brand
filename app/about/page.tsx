'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { content } from '@/app/data/about';
import Age from '@/app/components/Age';

export default function About() {
  const { title, subtitle, contentPrefix, contentSuffix } = content.about;

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1">
                  {title}
                </h1>
                <p className="text-sm text-gray-400">
                  {subtitle}
                </p>
              </header>

              <section className="space-y-12">
                <p className="text-base text-gray-600 leading-relaxed">
                  {contentPrefix}<Age />{contentSuffix}
                </p>
              </section>

              <footer className="text-xs text-gray-400">
                <p>
                  © {new Date().getFullYear()} Marius Manolachi
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