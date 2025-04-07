'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
  { path: '/', label: 'home', description: 'Welcome to my digital space' },
  { path: '/essays', label: 'essays', description: 'Thoughts and insights' },
  { path: '/projects', label: 'projects', description: 'My latest work' },
  { path: '/books', label: 'books', description: 'Reading recommendations' },
  { path: '/about', label: 'about', description: 'Get to know me' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleScroll = useCallback(() => {
    const isScrolled = window.scrollY > 20;
    if (isScrolled !== scrolled) {
      setScrolled(isScrolled);
    }
  }, [scrolled]);

  useEffect(() => {
    // Set initial scroll state
    handleScroll();
    
    // Add scroll listener with debounce
    let timeoutId: NodeJS.Timeout;
    const scrollListener = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 50);
    };

    window.addEventListener('scroll', scrollListener);
    return () => {
      window.removeEventListener('scroll', scrollListener);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const NavLinks = () => (
    <div className="space-y-6">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className="group relative flex items-center"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <motion.div
            className="absolute -left-8 w-1 h-4 bg-black"
            initial={false}
            animate={{ scaleY: pathname === item.path ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <span className={`text-sm font-mono transition-colors duration-200 ${
            pathname === item.path ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'
          }`}>
            /{item.label}
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden md:block fixed left-0 top-0 h-screen w-64 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/50 backdrop-blur-sm'
          : 'bg-transparent'
      }`}>
        <div className="h-full flex flex-col justify-center px-8">
          <NavLinks />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <nav className={`w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/50 backdrop-blur-sm'
            : 'bg-transparent'
        }`}>
          <div className="px-4 py-4 flex justify-between items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg"
            >
              <div className="px-4 py-6">
                <NavLinks />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}