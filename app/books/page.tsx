'use client';

import { useRef, useState } from 'react';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { books, categories } from '@/app/data/books';

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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transform transition-all duration-300 scale-100 opacity-100" 
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
                <h2 className="text-3xl font-medium text-gray-900">{book.title}</h2>
                <p className="text-lg text-gray-600 mt-1">by {book.author}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {book.category}
                </span>
                {book.yearRead && (
                  <span className="text-sm text-gray-500">Read in {book.yearRead}</span>
                )}
              </div>
              <p className="text-gray-600 leading-relaxed">{book.description}</p>
              {book.link && (
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors group"
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
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6 text-gray-500"
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

      <div className="min-h-screen">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24" ref={containerRef}>
            <div className="space-y-16">
              <header className="space-y-4">
                <div>
                  <h1 className="text-2xl font-light text-gray-900 mb-1">Book Recommendations</h1>
                  <p className="text-sm text-gray-400">A curated collection of books that shaped my thinking</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                      selectedCategory === null
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                        selectedCategory === category
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </header>

              <section>
                <div className="grid grid-cols-2 gap-6">
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
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{book.author}</p>
                      </div>
                    </article>
                  ))}
                </div>
                {filteredBooks.length === 0 && (
                  <p className="text-center text-gray-500 py-12">
                    No books found in this category.
                  </p>
                )}
              </section>

              <footer className="text-xs text-gray-400">
                <p>© 2025 Marius Manolachi</p>
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