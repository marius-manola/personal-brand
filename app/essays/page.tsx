import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { getAllEssays } from '@/lib/server/essays.server';
import Copyright from '../components/Copyright';
import EssayRow from '../components/EssayRow';

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
                <h1 className="page-title">
                  <span className="line-through">Essays</span> 1am thoughts
                </h1>
                <p className="page-subtitle">essays, notes, and ideas</p>
              </header>

              <section>
                {essays.map((essay, index) => (
                  <EssayRow
                    key={essay.id}
                    essay={essay}
                    showDivider={index !== essays.length - 1}
                  />
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
