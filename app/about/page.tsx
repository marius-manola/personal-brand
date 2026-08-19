import type { Metadata } from 'next';
import Link from 'next/link';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { about, facts, personJsonLd, description } from '@/app/data/about';
import Age from '@/app/components/Age';
import Copyright from '@/app/components/Copyright';

const SITE_URL = 'https://mariusmanolachi.com';

export const metadata: Metadata = {
  title: 'About Marius Manolachi',
  description,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Marius Manolachi',
    description,
    url: `${SITE_URL}/about`,
    type: 'profile',
    images: [{ url: `${SITE_URL}/marius.jpg`, alt: 'Marius Manolachi' }],
  },
};

export default function About() {
  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c') }}
            />
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">{about.title}</h1>
                <p className="page-subtitle">{about.subtitle}</p>
              </header>

              <section className="space-y-8">
                <p className="page-body text-[1.08rem]">
                  {about.leadPrefix}
                  <Age />
                  {about.leadSuffix}
                </p>

                <ul className="space-y-4 list-none pl-0">
                  {facts.map((fact) => (
                    <li key={fact.text} className="page-body">
                      {fact.text}
                      {fact.href && fact.label ? (
                        <>
                          {' '}
                          <a
                            href={fact.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-link"
                          >
                            {fact.label}
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <p className="page-body">
                  If you want to work together, start at{' '}
                  <Link href="/learn-ai" className="inline-link">
                    consulting
                  </Link>
                  . Bring one real workflow.
                </p>
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
