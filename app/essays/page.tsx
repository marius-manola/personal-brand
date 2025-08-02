import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Link from 'next/link';
import { getAllEssays } from '@/lib/server/essays.server';
import Copyright from '../components/Copyright';

export default async function EssaysPage() {
  const essays = await getAllEssays();

  return (
    <>
      <MobileNavigation />

      <div className="min-h-screen bg-white overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="max-w-lg w-full px-8 py-28 sm:py-32">
            <div className="space-y-20">
              <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-medium text-black tracking-tight leading-tight">
                  <span className="line-through font-light">Essays</span> Thoughts
                </h1>
                <p className="text-base text-gray-500 font-medium tracking-wide">Not your usual essays...</p>
              </header>

              <section className="space-y-1">
                {essays.map((essay, index) => (
                  <Link key={essay.id} href={`/essays/${essay.id}`} className="block group">
                    <article className={`py-4 hover:bg-gray-50 -mx-8 px-8 transition-colors duration-200 ${
                      index !== essays.length - 1 ? 'border-b border-gray-100' : ''
                    }`}>
                      <div className="flex justify-between items-baseline">
                        <h2 className="text-base text-black font-normal leading-relaxed group-hover:text-gray-600 transition-colors">
                          {essay.metadata.title}
                        </h2>
                        <div className="text-xs text-gray-400 font-extralight ml-4 flex-shrink-0">
                          {new Date(essay.metadata.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
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