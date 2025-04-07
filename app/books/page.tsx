'use client';

import Navigation from '@/components/Navigation';

export default function Books() {
  return (
    <>
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-12 ml-64">
        <div className="space-y-16">
          <header className="space-y-1">
            <h1 className="text-4xl font-normal tracking-tight">Books</h1>
            <p className="text-gray-500">Reading recommendations and reviews</p>
          </header>

          <div className="border-t border-gray-100" />

          <section className="space-y-8">
            <p className="text-gray-600">Coming soon...</p>
          </section>
        </div>
      </main>
    </>
  );
} 