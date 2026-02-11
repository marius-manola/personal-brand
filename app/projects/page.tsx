'use client';

import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Copyright from '@/app/components/Copyright';

export default function Projects() {
  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">Projects</h1>
                <p className="page-subtitle">My latest work</p>
              </header>

              <section className="space-y-14">
                <article className="group">
                  <div className="space-y-4">
                    <h2 className="text-[1.45rem] font-medium tracking-tight">NotClass</h2>
                    <p className="page-body text-[1.02rem]">A modern platform for online education and course creation.</p>
                    <div className="pt-2">
                      <a 
                        href="https://notclass.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-link group"
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
                    <h2 className="text-[1.45rem] font-medium tracking-tight">startuping.io</h2>
                    <p className="page-body text-[1.02rem]">An app that helps you build a team at hackathons.</p>
                    <div className="pt-2">
                      <a 
                        href="https://startuping.io" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-link group"
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
                    <h2 className="text-[1.45rem] font-medium tracking-tight">AI Courses</h2>
                    <p className="page-body text-[1.02rem]">Teaching AI and prompt engineering to thousands of students.</p>
                    <div className="pt-2">
                      <a 
                        href="https://www.udemy.com/user/marius-manola/" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-link group"
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
                    <h2 className="text-[1.45rem] font-medium tracking-tight">PromptEasy</h2>
                    <p className="page-body text-[1.02rem]">A platform revolutionizing AI dataset creation.</p>
                    <div className="pt-2">
                      <a 
                        href="https://www.producthunt.com/products/prompteasy-ai#prompteasy-ai" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-link group"
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

              <footer className="page-footer">
                <p>
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
