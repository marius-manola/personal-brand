'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { quotes } from '@/app/data/quotes';
import { useState } from 'react';

export default function QuotesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(quotes.flatMap(quote => quote.categories)));

  const filteredQuotes = selectedCategory
    ? quotes.filter(quote => quote.categories.includes(selectedCategory))
    : quotes;

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1">Quotes</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">Inspirational quotes that resonate with me.</p>
              </header>

              <div className="flex space-x-4 mb-8">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`text-sm ${selectedCategory === null ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`text-sm ${selectedCategory === category ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <section className="space-y-8">
                {filteredQuotes.map((quote, index) => (
                  <article key={index} className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 py-2">
                    <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">{quote.text}</p>
                    {quote.author && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        — {quote.author}
                        {quote.sourceText && (
                          <span className="ml-0">
                            {quote.sourceLink ? (
                              <>
                                , <a
                                  href={quote.sourceLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                                >
                                  {quote.sourceText}
                                </a>
                              </>
                            ) : (
                              <span>, {quote.sourceText}</span>
                            )}
                          </span>
                        )}
                      </p>
                    )}
                  </article>
                ))}
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