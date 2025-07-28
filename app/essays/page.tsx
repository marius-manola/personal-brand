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
                    <article className="space-y-2">
                      <h2 className="text-base font-light text-gray-900">
                        {essay.metadata.title}
                      </h2>
                      <p className="text-sm text-gray-500">{essay.metadata.excerpt}</p>
                      <div className="text-xs text-gray-400">
                        {new Date(essay.metadata.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </article>
                  </Link>
                ))}
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