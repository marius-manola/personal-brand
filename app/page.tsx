'use client';

import { useRef, useState } from 'react';
import Navigation from '@/components/Navigation';

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the email to your backend
    console.log('Subscribing email:', email);
    setEmail('');
  };

  return (
    <>
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-12 md:ml-64" ref={containerRef}>
        <div className="space-y-16">
          {/* Header */}
          <header className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-normal tracking-tight">Marius Manolachi</h1>
            <p className="text-gray-500">Building the future of education</p>
          </header>

          <div className="border-t border-gray-100" />

          {/* Main Content */}
          <section className="space-y-8">
            <p className="text-gray-600 leading-relaxed text-lg">
              I&apos;m 18 years old, and instead of going to university, I&apos;m building an alternative to higher education.
            </p>

            <div className="space-y-8">
              <div>
                <p className="text-sm font-mono text-gray-500 mb-2">What I&apos;m currently making</p>
                <a 
                  href="https://notclass.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-gray-500 hover:text-gray-700 transition-colors duration-200 inline-flex items-center"
                >
                  notclass.com
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-sm font-mono text-gray-900 mb-3">Want to get updated on what I&apos;m building?</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your email"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-black text-white rounded-md hover:bg-gray-800 transition-colors duration-200"
                  >
                    subscribe to newsletter
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
