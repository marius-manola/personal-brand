'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';

export default function Projects() {
  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1">Projects</h1>
                <p className="text-sm text-gray-400">My latest work</p>
              </header>

              <section className="space-y-12">
                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900">NotClass</h2>
                    <p className="text-sm text-gray-500">A modern platform for online education and course creation.</p>
                    <a 
                      href="https://notclass.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 group"
                    >
                      Visit NotClass
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900">startuping.io</h2>
                    <p className="text-sm text-gray-500">An app that helps you build a team at hackathons.</p>
                    <a 
                      href="https://startuping.io" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 group"
                    >
                      Visit Startuping
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900">AI Courses</h2>
                    <p className="text-sm text-gray-500">Teaching AI and prompt engineering to thousands of students.</p>
                    <a 
                      href="https://www.udemy.com/user/marius-manola/" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 group"
                    >
                      View Courses
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-2">
                    <h2 className="text-base font-light text-gray-900">PromptEasy</h2>
                    <p className="text-sm text-gray-500">A platform revolutionizing AI dataset creation.</p>
                    <a 
                      href="https://www.producthunt.com/products/prompteasy-ai#prompteasy-ai" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 group"
                    >
                      View on Product Hunt
                      <svg className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </article>
              </section>

              <footer className="text-xs text-gray-400">
                <p>© {new Date().getFullYear()} Marius Manolachi</p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
} 