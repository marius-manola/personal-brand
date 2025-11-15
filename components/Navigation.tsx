'use client';

import Link from 'next/link';
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
          onClick={onClick}
          className="group relative"
        >
          <span className={`text-base font-light tracking-wide transition-colors duration-200 relative ${
            pathname === item.path 
              ? 'text-black font-medium' 
              : 'text-gray-600 hover:text-black'
          }`}>
            /{item.label}
            {pathname !== item.path && (
              <span className="absolute bottom-0 left-0 w-0 h-px bg-black transition-all duration-300 group-hover:w-full"></span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
};

// Desktop Navigation
export function DesktopNavigation() {
  return (
    <nav className="w-64 hidden lg:block">
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <nav className="w-full bg-white border-b border-gray-100">
          <div className="px-6 py-6 flex justify-between items-center">
            <div className="text-sm text-gray-600 font-light tracking-wide"></div>
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-black focus:outline-none focus:ring-2 focus:ring-gray-200 rounded-sm p-1 transition-colors duration-200"
              aria-label="Toggle menu"
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
            </button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className="absolute top-[72px] left-0 right-0 bg-white border-t border-gray-100 shadow-sm">
            <div className="px-6 py-8">
              <NavLinks onClick={toggleMobileMenu} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}