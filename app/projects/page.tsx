'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';

export default function Projects() {
  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-1">Projects</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500">My latest work</p>
              </header>

              <section className="space-y-12">
                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900 dark:text-gray-100">SharkTankStartups</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">A directory website for shark tank india startups. I recently found out that these are called directory websites and you would want to search keywork volume and difficutly before building one. Anyways this required a lot of operational work and I&apos;m not sure if it&apos;s worth it.</p>
                    <a 
                      href="https://sharktankstartups.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 group"
                    >
                      Visit SharkTankStartups
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900 dark:text-gray-100">Personal Website</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400"> This website. It&apos;s forked from https://www.mariusmanolachi.com/ (with permission). </p>
                    <a 
                      href="https://mariusmanolachi.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 group"
                    >
                      Visit Marius Manolachi&apos;s Website
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>
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