import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Azeret_Mono, Familjen_Grotesk } from 'next/font/google';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import StudioClient from './StudioClient';

const desk = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-desk',
  display: 'swap',
});

const deskMono = Azeret_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-desk-mono',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Content Desk',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function ContentStudioPage() {
  if (!(await isLocalRequest())) notFound();
  return (
    <div className={`${desk.variable} ${deskMono.variable}`}>
      {/*
        THESIS: A print-shop production floor for one person's GEO/SEO wire, not a stacked settings page.
        OWN-WORLD: Sage zinc floor, cool job slips, cyan registration tape, stamp red. Familjen Grotesk + Onest + Azeret Mono.
        STORY: Open the desk, see today's fill, which jobs are writing vs imaging vs live, and whether Telegram can reach you.
        FIRST VIEWPORT: Status lamps, today's fill as a job ticket, three parallel lanes, then the queue.
        FORM: Operate / production lanes. FINISH: unreviewed and undocumented is unfinished.
      */}
      <StudioClient />
    </div>
  );
}
