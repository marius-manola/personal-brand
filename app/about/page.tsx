'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { content } from '@/app/data/about';

export default function About() {
  const { title, subtitle, content: paragraphs } = content.about;

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1">
                  {title}
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {subtitle}
                </p>
              </header>

              <section className="space-y-12">
                {paragraphs.map((paragraph, index) => (
                  <p 
                    key={index} 
                    className="text-base text-gray-600 dark:text-gray-300 leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>

              <footer className="text-xs text-gray-400 dark:text-gray-500">
                <p>
                  © 2025 Aakash Chawla
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