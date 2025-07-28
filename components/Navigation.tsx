'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
  { path: '/', label: 'home' },
  { path: '/essays', label: 'essays' },
  { path: '/projects', label: 'projects' },
  { path: '/books', label: 'books' },
  { path: '/about', label: 'about' },
];

// Shared NavLinks component
const NavLinks = ({ onClick }: { onClick?: () => void }) => {
  const pathname = usePathname();
  return (
    <div className="flex flex-col space-y-6">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className="group relative"
          onClick={onClick}
        >
          <div className="flex items-center relative">
            <motion.div
              className="absolute -left-3 w-px h-4 bg-gray-900"
              initial={false}
              animate={{ 
                scaleY: pathname === item.path ? 1 : 0,
                opacity: pathname === item.path ? 1 : 0 
              }}
              transition={{ duration: 0.2 }}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
            <span className={`text-sm tracking-wide transition-all duration-200 ${
              pathname === item.path 
                ? 'text-gray-900 font-medium' 
                : 'text-gray-400 group-hover:text-gray-800'
            }`}>
              /{item.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

// Desktop Navigation
export function DesktopNavigation() {
  return (
    <nav className="w-64 hidden md:block">
      <div className="h-full flex flex-col p-12 pt-32"> 
        <NavLinks />
      </div>
    </nav>
  );
}

// Mobile Navigation
export default function MobileNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <nav className="w-full bg-white/90 backdrop-blur-md">
          <div className="px-6 py-6 flex justify-between items-center">
            <div className="text-xs text-gray-400 tracking-wide">menu</div>
            <button
              onClick={toggleMobileMenu}
              className="text-gray-400 hover:text-gray-900 transition-colors duration-200 focus:outline-none"
              aria-label="Toggle menu"
            >
              <motion.div
                animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </motion.div>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-[72px] left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100"
            >
              <div className="px-6 py-8">
                <NavLinks onClick={toggleMobileMenu} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}