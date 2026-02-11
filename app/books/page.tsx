'use client';

import { useRef, useState } from 'react';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { books, categories } from '@/app/data/books';
import Copyright from '@/app/components/Copyright';

interface BookModalProps {
  book: {
    title: string;
    author: string;
    description: string;
    link?: string;
    category: string;
    yearRead?: number;
    coverImage: string;
  } | null;
  onClose: () => void;
}

function BookModal({ book, onClose }: BookModalProps) {
  if (!book) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.5)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transform transition-all duration-300 scale-100 opacity-100" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-8">
          <div className="flex gap-8">
            <div className="relative group">
              <img
                src={book.coverImage}
                alt={`Cover of ${book.title}`}
                className="w-44 h-64 object-cover rounded-xl shadow-lg transform transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-black/5"></div>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h2 className="text-3xl font-medium tracking-tight">{book.title}</h2>
                <p className="text-lg text-[hsl(var(--muted-foreground))] mt-1">by {book.author}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="chip">
                  {book.category}
                </span>
                {book.yearRead && (
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Read in {book.yearRead}</span>
                )}
              </div>
              <p className="page-body">{book.description}</p>
              {book.link && (
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-link group"
                >
                  Learn More
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-[hsl(var(--muted)/0.4)] rounded-full transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6 text-[hsl(var(--muted-foreground))]"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Books() {
  const containerRef = useRef<HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<typeof books[0] | null>(null);

  const filteredBooks = selectedCategory
    ? books.filter(book => book.category === selectedCategory)
    : books;

  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main" ref={containerRef}>
            <div className="page-stack">
              <header className="space-y-6">
                <div className="page-header">
                  <h1 className="page-title">Book Recommendations</h1>
                  <p className="page-subtitle">A curated collection of books that shaped my thinking</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`chip ${
                      selectedCategory === null
                        ? 'chip-active'
                        : ''
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`chip ${
                        selectedCategory === category
                          ? 'chip-active'
                          : ''
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </header>

              <section className="space-y-16">
                <div className="grid grid-cols-2 gap-8">
                  {filteredBooks.map((book) => (
                    <article
                      key={book.title}
                      className="group cursor-pointer space-y-3"
                      onClick={() => setSelectedBook(book)}
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={book.coverImage}
                          alt={`Cover of ${book.title}`}
                          className="object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                        <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl pointer-events-none" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--muted-foreground))] transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 font-light">{book.author}</p>
                      </div>
                    </article>
                  ))}
                </div>
                {filteredBooks.length === 0 && (
                  <p className="text-center text-[hsl(var(--muted-foreground))] py-12">
                    No books found in this category.
                  </p>
                )}
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

      <BookModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </>
  );
} 
