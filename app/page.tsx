'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Counter from '@/components/Counter';
import ThemeToggle from '@/components/ThemeToggle';
import { books, categories } from '@/app/data/books';
import { quotes } from '@/app/data/quotes';

interface BookModalProps {
  book: typeof books[0] | null;
  onClose: () => void;
}

function BookModal({ book, onClose }: BookModalProps) {
  if (!book) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 dark:bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 md:p-12 space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="relative group flex-shrink-0">
              <img
                src={book.coverImage}
                alt={`Cover of ${book.title}`}
                className="w-48 h-72 object-cover rounded-2xl shadow-2xl transform transition duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-gray-200 dark:ring-white/10" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h2 className="text-3xl md:text-4xl font-light text-gray-900 dark:text-white mb-2">{book.title}</h2>
                <p className="text-lg text-gray-600 dark:text-white/60">by {book.author}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white/80 rounded-full text-sm backdrop-blur-xl border border-gray-200 dark:border-white/10">
                  {book.category}
                </span>
                {book.yearRead && (
                  <span className="text-sm text-gray-500 dark:text-white/40">Read in {book.yearRead}</span>
                )}
              </div>
              <p className="text-gray-700 dark:text-white/70 leading-relaxed">{book.description}</p>
              {book.link && (
                <a
                  href={book.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-full transition-all duration-300 border border-gray-200 dark:border-white/10 group"
                >
                  Learn More
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors border border-gray-200 dark:border-white/10"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-white/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedBook, setSelectedBook] = useState<typeof books[0] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cursorX, cursorY]);

  const filteredBooks = selectedCategory
    ? books.filter(book => book.category === selectedCategory)
    : books;

  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white overflow-x-hidden transition-colors duration-300">
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Custom Cursor */}
      <motion.div
        className="fixed w-8 h-8 border border-gray-400/30 dark:border-white/30 rounded-full pointer-events-none z-50 mix-blend-difference hidden md:block"
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      {/* Grain Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]" />

      {/* Navigation */}
      <motion.nav
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="fixed left-12 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-8"
      >
        {['Intro', 'Quotes', 'Mentors', 'About', 'Contact'].map((item, i) => (
          <motion.a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="group relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <span className="text-xs text-gray-400 dark:text-white/40 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300 tracking-widest uppercase">
              {item}
            </span>
            <motion.div
              className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-gray-900/0 dark:bg-white/0 group-hover:bg-gray-900/50 dark:group-hover:bg-white/50 transition-all duration-300"
            />
          </motion.a>
        ))}
      </motion.nav>

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section - Split Screen */}
        <section id="intro" className="min-h-screen flex items-center justify-center px-6 lg:px-32 xl:px-40">
          <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Side - Text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-6xl md:text-7xl lg:text-8xl font-light tracking-tight"
                >
                  Aakash
                  <br />
                  <span className="text-gray-400 dark:text-white/30">Chawla</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="text-lg md:text-xl text-gray-600 dark:text-white/60 max-w-lg leading-relaxed font-light"
                >
                  Software engineer at Google. Building experiences that matter.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex gap-6 pt-4"
              >
                <a
                  href="#quotes"
                  className="group relative px-8 py-4 overflow-hidden"
                >
                  <span className="relative z-10 text-sm tracking-wider uppercase">Explore</span>
                  <motion.div
                    className="absolute inset-0 bg-gray-900/10 dark:bg-white/10"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="absolute inset-0 border border-gray-900/20 dark:border-white/20" />
                </a>
              </motion.div>
            </motion.div>

            {/* Right Side - Bento Grid Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Large Card - Age */}
              <motion.div
                whileHover={{ scale: 1.02, rotate: -1 }}
                className="col-span-2 p-8 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl"
              >
                <div className="text-5xl font-light mb-2">
                  <Counter startDate={new Date('1997-04-09')} afterDecimals={8} />
                </div>
                <div className="text-gray-700 dark:text-white/60">trips around the sun</div>
              </motion.div>

              {/* Small Card - Experience */}
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-500/10 dark:to-purple-500/10 backdrop-blur-xl border border-blue-200 dark:border-white/10 rounded-2xl"
              >
                <div className="text-3xl font-light mb-1">
                  <Counter startDate={new Date('2021-03-15')} afterDecimals={1} />
                </div>
                <div className="text-xs text-gray-600 dark:text-white/60 tracking-wider">YEARS SHIPPING</div>
              </motion.div>

              {/* Small Card - Passion */}
              <motion.div
                whileHover={{ scale: 1.05, rotate: -1 }}
                className="p-6 bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-500/10 dark:to-orange-500/10 backdrop-blur-xl border border-pink-200 dark:border-white/10 rounded-2xl"
              >
                <div className="text-2xl font-light mb-1">Always</div>
                <div className="text-xs text-gray-600 dark:text-white/60 tracking-wider">BUILDING</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Work Section - Featured Projects */}
        <section id="work" className="hidden min-h-screen py-32 px-6 lg:px-32 xl:px-40">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light mb-4">
                Selected <span className="text-gray-400 dark:text-white/30">Work</span>
              </h2>
              <p className="text-gray-600 dark:text-white/60 text-lg">Nights & weekends creations</p>
            </motion.div>

            <div className="space-y-12">
              {/* Project 1 - Large */}
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="group"
              >
                <a
                  href="https://sharktankstartups.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative overflow-hidden rounded-3xl">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.6 }}
                      className="relative h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border border-gray-200 dark:border-white/10 p-12 flex flex-col justify-between"
                    >
                      {/* Animated Background */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-700"
                      />

                      <div className="relative z-10">
                        <div className="inline-block px-4 py-2 bg-gray-900/5 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-full text-xs tracking-widest uppercase text-gray-600 dark:text-white/60 mb-6">
                          Directory
                        </div>

                        <h3 className="text-4xl md:text-5xl font-light mb-4">SharkTankStartups</h3>
                        <p className="text-gray-700 dark:text-white/60 max-w-2xl text-lg leading-relaxed">
                          A comprehensive directory website for Shark Tank India startups. Built to explore keyword volume and SEO strategies in the wild.
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center gap-3 text-gray-800 dark:text-white/80 group-hover:gap-5 transition-all duration-300">
                        <span className="text-sm tracking-wider uppercase">View Project</span>
                        <motion.svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </motion.svg>
                      </div>
                    </motion.div>
                  </div>
                </a>
              </motion.div>

              {/* More Projects Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    title: 'Coming Soon',
                    description: 'Always building. Check back soon for more.',
                    gradient: 'from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30',
                    hoverGradient: 'group-hover:from-emerald-500/10 group-hover:via-teal-500/10 group-hover:to-cyan-500/10'
                  },
                  {
                    title: 'Next Project',
                    description: 'Something exciting in the works.',
                    gradient: 'from-orange-100 via-red-100 to-pink-100 dark:from-orange-900/30 dark:via-red-900/30 dark:to-pink-900/30',
                    hoverGradient: 'group-hover:from-orange-500/10 group-hover:via-red-500/10 group-hover:to-pink-500/10'
                  }
                ].map((project, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.2 }}
                    className="group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02, rotate: i % 2 === 0 ? -1 : 1 }}
                      transition={{ duration: 0.4 }}
                      className={`relative h-80 bg-gradient-to-br ${project.gradient} border border-gray-200 dark:border-white/10 rounded-3xl p-8 flex flex-col justify-between overflow-hidden`}
                    >
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${project.hoverGradient} transition-all duration-700`}
                      />

                      <div className="relative z-10">
                        <h3 className="text-3xl font-light mb-3">{project.title}</h3>
                        <p className="text-gray-700 dark:text-white/60">{project.description}</p>
                      </div>

                      <div className="relative z-10 text-gray-500 dark:text-white/40 text-sm tracking-wider uppercase">
                        In Progress
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Books Section */}
        <section id="books" className="hidden min-h-screen py-32 px-6 lg:px-32 xl:px-40">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light mb-4">
                Book <span className="text-white/30">Recommendations</span>
              </h2>
              <p className="text-white/60 text-lg mb-8">Books that shaped my thinking</p>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm tracking-wider transition-all duration-300 ${
                    selectedCategory === null
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm tracking-wider transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Books Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedBook(book)}
                >
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3">
                    <img
                      src={book.coverImage}
                      alt={`Cover of ${book.title}`}
                      className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" />
                  </div>
                  <div>
                    <h3 className="text-sm font-light text-white/90 group-hover:text-white transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-xs text-white/40 mt-1">{book.author}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Quotes Section */}
        <section id="quotes" className="min-h-screen py-32 px-6 lg:px-32 xl:px-40 flex items-center">
          <div className="max-w-5xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light mb-4">
                Words <span className="text-gray-400 dark:text-white/30">That Inspire</span>
              </h2>
              <p className="text-gray-600 dark:text-white/60 text-lg">Quotes that resonate</p>
            </motion.div>

            <div className="relative">
              <motion.div
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5 }}
                className="group relative min-h-[300px] flex flex-col justify-center"
              >
                <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-gray-300 via-gray-200 to-gray-100/0 dark:from-white/20 dark:via-white/10 dark:to-white/0 rounded-full" />

                <div className="pl-12">
                  <p className="text-2xl md:text-3xl lg:text-4xl font-light text-gray-900 dark:text-white/90 leading-relaxed mb-8">
                    &ldquo;{quotes[currentQuoteIndex].text}&rdquo;
                  </p>

                  {quotes[currentQuoteIndex].author && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-white/40 text-sm md:text-base mb-12">
                      <span>—</span>
                      <span>{quotes[currentQuoteIndex].author}</span>
                      {quotes[currentQuoteIndex].sourceText && (
                        <>
                          {quotes[currentQuoteIndex].sourceLink ? (
                            <>
                              <span>,</span>
                              <a
                                href={quotes[currentQuoteIndex].sourceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors underline decoration-gray-300 dark:decoration-white/20 hover:decoration-gray-900 dark:hover:decoration-white/60"
                              >
                                {quotes[currentQuoteIndex].sourceText}
                              </a>
                            </>
                          ) : (
                            <span>, {quotes[currentQuoteIndex].sourceText}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pl-12">
                <motion.button
                  onClick={() => setCurrentQuoteIndex((prev) => (prev === 0 ? quotes.length - 1 : prev - 1))}
                  className="p-3 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Previous quote"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
                <motion.button
                  onClick={() => setCurrentQuoteIndex((prev) => (prev === quotes.length - 1 ? 0 : prev + 1))}
                  className="p-3 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Next quote"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* Mentors Section */}
        <section id="mentors" className="min-h-screen py-32 px-6 lg:px-32 xl:px-40 flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-light mb-4">
                Tribe of <span className="text-gray-400 dark:text-white/30">Mentors</span>
              </h2>
              <p className="text-gray-600 dark:text-white/60 text-lg">People I learn from, look up to and get inspired from.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  name: 'Naval Ravikant',
                  image: 'https://unavatar.io/twitter/naval',
                  website: 'https://nav.al/',
                  gradient: 'from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10',
                  hoverGradient: 'group-hover:from-blue-500/20 group-hover:via-indigo-500/20 group-hover:to-purple-500/20'
                },
                {
                  name: 'Tim Ferriss',
                  image: 'https://unavatar.io/twitter/tferriss',
                  website: 'https://tim.blog/',
                  gradient: 'from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10',
                  hoverGradient: 'group-hover:from-emerald-500/20 group-hover:via-teal-500/20 group-hover:to-cyan-500/20'
                },
                {
                  name: 'Farza',
                  image: 'https://unavatar.io/twitter/farzatv',
                  website: 'https://farza.com',
                  gradient: 'from-orange-100 via-amber-100 to-yellow-100 dark:from-orange-500/10 dark:via-amber-500/10 dark:to-yellow-500/10',
                  hoverGradient: 'group-hover:from-orange-500/20 group-hover:via-amber-500/20 group-hover:to-yellow-500/20'
                },
                {
                  name: 'Shaan Puri',
                  image: 'https://unavatar.io/twitter/ShaanVP',
                  website: 'https://shaanpuri.com',
                  gradient: 'from-pink-100 via-rose-100 to-red-100 dark:from-pink-500/10 dark:via-rose-500/10 dark:to-red-500/10',
                  hoverGradient: 'group-hover:from-pink-500/20 group-hover:via-rose-500/20 group-hover:to-red-500/20'
                }
              ].map((mentor, i) => (
                <motion.a
                  key={mentor.name}
                  href={mentor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -8, rotate: i % 2 === 0 ? -1 : 1 }}
                  className="group block"
                >
                  <div className={`relative h-64 bg-gradient-to-br ${mentor.gradient} border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden transition-all duration-500`}>
                    {/* Hover gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent ${mentor.hoverGradient} transition-all duration-500`} />

                    {/* Content */}
                    <div className="relative h-full p-8 flex flex-col">
                      {/* Profile Image - Top */}
                      <div className="flex justify-between items-start">
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white/20 dark:ring-white/10 shadow-2xl">
                          <img
                            src={mentor.image}
                            alt={mentor.name}
                            className="w-full h-full object-cover transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                          />
                        </div>

                        {/* Arrow Icon */}
                        <motion.div
                          className="p-3 bg-white/30 dark:bg-white/10 backdrop-blur-xl rounded-full border border-white/40 dark:border-white/20"
                          whileHover={{ scale: 1.1, rotate: 45 }}
                          transition={{ duration: 0.3 }}
                        >
                          <svg
                            className="w-5 h-5 text-gray-900 dark:text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" />
                          </svg>
                        </motion.div>
                      </div>

                      {/* Name - Bottom */}
                      <div className="mt-auto">
                        <h3 className="text-3xl font-light text-gray-900 dark:text-white mb-2 group-hover:tracking-wide transition-all duration-300">
                          {mentor.name}
                        </h3>
                        <div className="w-12 h-1 bg-gray-900/20 dark:bg-white/20 rounded-full group-hover:w-24 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* About Section - Minimal */}
        <section id="about" className="min-h-screen py-32 px-6 lg:px-32 xl:px-40 flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="grid lg:grid-cols-5 gap-16"
            >
              <div className="lg:col-span-2">
                <h2 className="text-5xl md:text-6xl font-light mb-8">
                  About <span className="text-gray-400 dark:text-white/30">Me</span>
                </h2>
              </div>

              <div className="lg:col-span-3 space-y-8">
                <p className="text-2xl md:text-3xl font-light leading-relaxed text-gray-900 dark:text-white/90">
                  Born in India. Building at Google. Creating on the side.
                </p>

                <div className="space-y-6 text-lg text-gray-600 dark:text-white/60 leading-relaxed">
                  <p>
                    I spend my days building smart systems at scale. My nights and weekends are reserved for exploring new ideas and building products that solve real problems.
                  </p>

                  <p>
                    I believe in the power of minimalism, thoughtful design, and code that tells a story. Every project is an opportunity to learn something new and push the boundaries of what&apos;s possible.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section - Minimal CTA */}
        <section id="contact" className="min-h-screen py-32 px-6 lg:px-32 xl:px-40 flex items-center">
          <div className="max-w-7xl mx-auto w-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-12"
            >
              <h2 className="text-6xl md:text-7xl lg:text-8xl font-light">
                Let&apos;s <span className="text-gray-400 dark:text-white/30">Talk</span>
              </h2>

              <p className="text-xl text-gray-600 dark:text-white/60 max-w-2xl mx-auto">
                Have a project in mind or just want to connect? I&apos;m always open to interesting conversations.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="pt-8"
              >
                <a
                  href="mailto:chawla.aakash97@gmail.com"
                  className="group inline-block relative px-12 py-5 overflow-hidden"
                >
                  <span className="relative z-10 text-sm tracking-widest uppercase">Get In Touch</span>
                  <motion.div
                    className="absolute inset-0 bg-gray-900/10 dark:bg-white/10"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="absolute inset-0 border border-gray-900/20 dark:border-white/20" />
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 lg:px-32 xl:px-40 border-t border-gray-200 dark:border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-white/40">© 2025 Aakash Chawla</p>
            <div className="flex gap-8 text-sm text-gray-500 dark:text-white/40">
              <a href="https://x.com/whychawla" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">X</a>
              <a href="https://www.linkedin.com/in/aakash947/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">LinkedIn</a>
              <a href="https://github.com/akyouwh0" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Book Modal */}
      {selectedBook && (
        <BookModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}
