'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Copyright from '@/app/components/Copyright';

export default function Projects() {
  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-lg w-full px-8 py-28 sm:py-32">
            <div className="space-y-20">
              <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-medium text-black tracking-tight leading-tight">Projects</h1>
                <p className="text-base text-gray-500 font-medium tracking-wide">My latest work</p>
              </header>

              <section className="space-y-16">
                <article className="group">
                  <div className="space-y-4">
                    <h2 className="text-lg text-black font-light leading-relaxed">NotClass</h2>
                    <p className="text-base text-gray-600">A modern platform for online education and course creation.</p>
                    <div className="pt-2">
                      <a 
                        href="https://notclass.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-base font-medium text-black hover:text-gray-600 transition-all duration-300 group border-b border-gray-200 hover:border-gray-400 pb-1"
                      >
                        Visit NotClass
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-4">
                    <h2 className="text-lg text-black font-light leading-relaxed">startuping.io</h2>
                    <p className="text-base text-gray-600">An app that helps you build a team at hackathons.</p>
                    <div className="pt-2">
                      <a 
                        href="https://startuping.io" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-base font-medium text-black hover:text-gray-600 transition-all duration-300 group border-b border-gray-200 hover:border-gray-400 pb-1"
                      >
                        Visit Startuping
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-4">
                    <h2 className="text-lg text-black font-light leading-relaxed">AI Courses</h2>
                    <p className="text-base text-gray-600">Teaching AI and prompt engineering to thousands of students.</p>
                    <div className="pt-2">
                      <a 
                        href="https://www.udemy.com/user/marius-manola/" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-base font-medium text-black hover:text-gray-600 transition-all duration-300 group border-b border-gray-200 hover:border-gray-400 pb-1"
                      >
                        View Courses
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>

                <article className="group">
                  <div className="space-y-4">
                    <h2 className="text-lg text-black font-light leading-relaxed">PromptEasy</h2>
                    <p className="text-base text-gray-600">A platform revolutionizing AI dataset creation.</p>
                    <div className="pt-2">
                      <a 
                        href="https://www.producthunt.com/products/prompteasy-ai#prompteasy-ai" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-base font-medium text-black hover:text-gray-600 transition-all duration-300 group border-b border-gray-200 hover:border-gray-400 pb-1"
                      >
                        View on Product Hunt
                        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </article>
              </section>

              <footer className="pt-8">
                <p className="text-sm text-gray-400 font-thin">
                  © <Copyright /> Marius Manolachi
                </p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
} 