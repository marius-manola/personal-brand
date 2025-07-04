'use client';

import { useRef, useState } from 'react';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import AgeCounter from './components/AgeCounter';
import Counter from '@/components/Counter';

export default function Home() {
  const containerRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setStatus('success');
      setMessage('Thank you for subscribing!');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to subscribe');
    }
  };

  return (
    <>
      <MobileNavigation />
      
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24" ref={containerRef}>
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1">Aakash Chawla</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">just a guy on the internet</p>
              </header>

              <section className="space-y-12">
                <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  I&apos;m <Counter startDate={new Date('1997-09-09')}/> years old, born and raised in India.<br></br>
                  I have been working at Google for the past <Counter startDate={new Date('2021-03-15')} afterDecimals={1} /> years. I like it here.<br></br>
                  <br></br>
                  I keep building mini projects on my nights & weekends. Hoping to bump into something I love to do.
                </p>

                {/* <div>
                  <a 
                    href="https://notclass.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 group"
                  >
                    notclass.com
                    <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div> */}

                {/* <div className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your email"
                        className="w-full px-0 py-2 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors duration-200 disabled:opacity-50"
                        required
                        disabled={status === 'loading'}
                      />
                      {message && (
                        <p className={`absolute -bottom-6 left-0 text-xs ${status === 'error' ? 'text-red-500' : 'text-green-500'} transition-opacity duration-200`}>
                          {message}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full py-2 text-sm text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 text-left disabled:opacity-50"
                    >
                      {status === 'loading' ? 'subscribing...' : 'subscribe to my journey →'}
                    </button>
                  </form>
                </div> */}
              </section>

              <footer className="text-xs text-gray-400 dark:text-gray-500">
                <p>© 2025 Aakash Chawla</p>
              </footer>
            </div>
          </main>

          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
