'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
  { path: '/', label: 'home', description: 'Welcome to my digital space' },
  { path: '/essays', label: 'essays', description: 'Thoughts and insights' },
  { path: '/projects', label: 'projects', description: 'My latest work' },
  { path: '/books', label: 'books', description: 'Reading recommendations' },
  { path: '/about', label: 'about', description: 'Get to know me' },
];

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const NavLinks = () => (
    <div className="flex flex-col space-y-4">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className="group relative"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <motion.div
            className="absolute -left-1 top-0 bottom-0 w-px bg-gray-900"
            initial={false}
            animate={{ scaleY: pathname === item.path ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <span className={`text-sm transition-colors duration-200 ${
            pathname === item.path ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'
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
      <nav className="fixed top-0 left-0 bottom-0 w-64 px-8 py-12 hidden md:block">
        <div className="h-full flex flex-col">
          <NavLinks />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <nav className="w-full bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="px-4 py-4 flex justify-between items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
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
              className="absolute top-16 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <div className="px-4 py-6">
                <div className="flex flex-col space-y-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="group relative"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className={`text-sm transition-colors duration-200 ${
                        pathname === item.path ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'
                      }`}>
                        /{item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}