'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { content } from '@/app/data/about';
import Age from '@/app/components/Age';
import Copyright from '@/app/components/Copyright';

export default function About() {
  const { title, subtitle, contentPrefix, contentSuffix } = content.about;

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-lg w-full px-8 py-28 sm:py-32">
            <div className="space-y-20">
              <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-medium text-black tracking-tight leading-tight">
                  {title}
                </h1>
                <p className="text-base text-gray-500 font-medium tracking-wide">
                  {subtitle}
                </p>
              </header>

              <section className="space-y-16">
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed font-light">
                    {contentPrefix}<Age />{contentSuffix}
                  </p>
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