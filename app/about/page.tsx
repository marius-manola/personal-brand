'use client';

import Navigation from '@/components/Navigation';

export default function About() {
  return (
    <>
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-12 md:ml-64">
        <div className="space-y-16">
          <header className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-normal tracking-tight">About</h1>
            <p className="text-gray-500">The future of education</p>
          </header>

          <div className="border-t border-gray-100" />

          <section className="space-y-8">
            <p className="text-gray-600 leading-relaxed text-lg">
              I&apos;m 18 years old, and instead of going to university, I&apos;m building an alternative to higher education.
            </p>
          </section>
        </div>
      </main>
    </>
  );
} 