import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Link from 'next/link';
import { getAllEssays } from '@/lib/server/essays.server';
import Copyright from '../components/Copyright';

export default async function EssaysPage() {
  const essays = await getAllEssays();

  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">Thoughts</h1>
                <p className="page-subtitle">essays, notes, and ideas</p>
              </header>

              <section>
                {essays.map((essay, index) => (
                  <Link key={essay.id} href={`/essays/${essay.id}`} className="block group">
                    <article className={`list-row ${index !== essays.length - 1 ? 'section-divider' : ''}`}>
                      <div className="flex justify-between items-baseline">
                        <h2 className="text-[1.03rem] font-normal leading-relaxed group-hover:text-[hsl(var(--muted-foreground))] transition-colors">
                          {essay.metadata.title}
                        </h2>
                        <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] ml-4 flex-shrink-0">
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
