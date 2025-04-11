'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';

export default function Essays() {
  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1"><span className="line-through">Essays</span> Thoughts</h1>
                <p className="text-sm text-gray-400">Not your usual school essays...</p>
              </header>

              <section className="space-y-12">
                <p className="text-base text-gray-600">Coming soon...</p>
              </section>

              <footer className="text-xs text-gray-400">
                <p>© 2025 Marius Manolachi</p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
} 