'use client';

import Navigation from '@/components/Navigation';

export default function Projects() {
  return (
    <>
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 py-12 ml-64">
        <div className="space-y-16">
          <header className="space-y-1">
            <h1 className="text-4xl font-normal tracking-tight">Projects</h1>
            <p className="text-gray-500">My latest work and creations</p>
          </header>

          <div className="border-t border-gray-100" />

          <section className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-normal text-gray-900">PromptEasy</h2>
              <p className="text-gray-600">
                A platform revolutionizing AI dataset creation. Making it easier for developers and researchers to create high-quality training data.
              </p>
              <a 
                href="https://prompteasy.ai" 
                className="text-gray-900 hover:text-gray-600 transition-colors duration-200 inline-block"
              >
                Visit PromptEasy →
              </a>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-normal text-gray-900">AI Courses</h2>
              <p className="text-gray-600">
                Comprehensive courses teaching AI and prompt engineering to thousands of students worldwide.
              </p>
              <a 
                href="https://udemy.com" 
                className="text-gray-900 hover:text-gray-600 transition-colors duration-200 inline-block"
              >
                View Courses →
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
} 