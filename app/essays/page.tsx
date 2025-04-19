import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Link from 'next/link';
import { getAllEssays } from '@/lib/server/essays.server';

export default async function EssaysPage() {
  const essays = await getAllEssays();

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-16">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1">
                  <span className="line-through">Essays</span> Thoughts
                </h1>
                <p className="text-sm text-gray-500">Not your usual school essays...</p>
              </header>

              <section className="space-y-12">
                {essays.map((essay) => (
                  <Link key={essay.id} href={`/essays/${essay.id}`} className="block group">
                    <article className="p-4 -mx-4 rounded-lg transition-all duration-200 hover:bg-gray-50 space-y-3 border-b border-gray-100">
                      <div className="space-y-2">
                        <h2 className="text-xl font-normal text-gray-900 group-hover:text-gray-600 transition-colors">
                          {essay.metadata.title}
                        </h2>
                      </div>
                      <div className="text-xs font-medium text-gray-400 flex items-center">
                        <span className="w-2 h-2 bg-gray-200 rounded-full mr-2"></span>
                        {new Date(essay.metadata.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">{essay.metadata.excerpt}</p>
                      <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 flex items-center">
                        Read more
                        <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </article>
                  </Link>
                ))}
              </section>

              <footer className="text-xs text-gray-400">
                <p>© 2025 Marius Manolachi</p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
} 