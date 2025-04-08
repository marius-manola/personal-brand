'use client';

import { useRef, useState } from 'react';
import Navigation from '@/components/Navigation';

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Subscribing email:', email);
    setEmail('');
  };

  return (
    <>
      <Navigation />
      <main className="md:ml-64 max-w-xl mx-auto px-4 py-12" ref={containerRef}>
        <div className="space-y-12">
          {/* Header */}
          <header className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-gray-900">Marius Manolachi</h1>
            <p className="text-gray-500 text-sm">building the future of education</p>
          </header>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          {/* Main Content */}
          <section className="space-y-8">
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed text-lg">
                I&apos;m 18 years old, and instead of going to university, I&apos;m building an alternative to higher education.
              </p>
              <p className="text-gray-500 text-sm">
                This is my journey of reimagining how we learn and grow.
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors duration-200">
                <p className="text-sm text-gray-500 mb-2">What I&apos;m currently making</p>
                <a 
                  href="https://notclass.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 inline-flex items-center group"
                >
                  notclass.com
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
              
              <div className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors duration-200">
                <p className="text-sm text-gray-500 mb-3">Join me on this journey</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your email"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-colors duration-200"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors duration-200"
                  >
                    subscribe to my journey
                  </button>
                </form>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          <footer className="text-center text-sm text-gray-500">
            <p>© 2024 Marius Manolachi</p>
          </footer>
        </div>
      </main>
    </>
  );
}
