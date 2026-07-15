import Link from 'next/link';
import type { Essay } from '@/lib/server/essays.server';
import EssayRow from './EssayRow';

// "writing" section: renders the newest essays as .list-row rows via the shared
// EssayRow component (same markup as app/essays/page.tsx). Server-safe (no hooks).
// Essays are passed in (already newest-first from getAllEssays()).
export default function RecentEssays({ essays }: { essays: Essay[] }) {
  return (
    <section className="section-block">
      <div className="section-head">
        <span className="section-label">writing</span>
        <Link href="/essays" className="section-more">
          all essays &rarr;
        </Link>
      </div>

      {essays.length > 0 && (
        <div>
          {essays.map((essay, index) => (
            <EssayRow
              key={essay.id}
              essay={essay}
              showDivider={index !== essays.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}
