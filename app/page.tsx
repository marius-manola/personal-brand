import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { getAllEssays } from '@/lib/server/essays.server';
import AgeCounter from './components/AgeCounter';
import BioList from './components/BioList';
import RecentEssays from './components/RecentEssays';
import ProjectsRow from './components/ProjectsRow';
import HomeFooter from './components/HomeFooter';
import LinkPreview from './components/LinkPreview';

export default async function Home() {
  const essays = await getAllEssays();

  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              {/* 1 · Serif hero */}
              <header className="page-header">
                <h1 className="page-title">
                  {/* LinkPreview reveals a portrait on hover from public/portrait.jpg.
                      The image is preloaded offscreen and only shown once it loads;
                      onError permanently disables it. See app/components/LinkPreview.tsx. */}
                  <LinkPreview src="/portrait.jpg">Marius Manolachi</LinkPreview>
                </h1>
                <p className="page-subtitle">perpetual learner</p>
                <p className="page-body text-[1.08rem] mt-6 max-w-[34rem]">
                  I&apos;m <AgeCounter /> years old, born and raised in Moldova. I love
                  humanity, hiking, technology, and the quiet thrill of solving hard
                  problems. Right now I&apos;m building TryUncle — an AI tutor that
                  lives on your screen and teaches DaVinci Resolve the second you get stuck.
                </p>
              </header>

              {/* 2 · me in short */}
              <BioList />

              {/* 3 · writing */}
              <RecentEssays essays={essays.slice(0, 4)} />

              {/* 4 · building */}
              <ProjectsRow />

              {/* 5 · footer */}
              <HomeFooter />
            </div>
          </main>

          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
