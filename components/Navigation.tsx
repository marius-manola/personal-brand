'use client';

import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <nav className="flex justify-between items-center py-6">
        <div className="flex items-center space-x-1">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white mr-12">
            MM
          </Link>
          <a 
            href="#startup" 
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Startup
          </a>
          <a 
            href="#speaking" 
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Speaking
          </a>
          <a 
            href="#engineering" 
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Engineering
          </a>
          <a 
            href="#content" 
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Content
          </a>
        </div>
        
        <div className="flex items-center space-x-6">
          <a 
            href="#contact"
            className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Contact
          </a>
          <button
            className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Toggle theme"
          >
            <MoonIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex justify-between items-center py-6">
      <div className="flex items-center space-x-1">
        <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white mr-12">
          MM
        </Link>
        <a 
          href="#startup" 
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Startup
        </a>
        <a 
          href="#speaking" 
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Speaking
        </a>
        <a 
          href="#engineering" 
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Engineering
        </a>
        <a 
          href="#content" 
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Content
        </a>
      </div>
      
      <div className="flex items-center space-x-6">
        <a 
          href="#contact"
          className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          Contact
        </a>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          ) : (
            <MoonIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          )}
        </button>
      </div>
    </nav>
  );
} 