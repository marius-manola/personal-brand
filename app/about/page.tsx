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

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">
                  {title}
                </h1>
                <p className="page-subtitle">
                  {subtitle}
                </p>
              </header>

              <section className="space-y-14">
                <div className="max-w-none">
                  <p className="page-body text-[1.08rem]">
                    {contentPrefix}<Age />{contentSuffix}
                  </p>
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
