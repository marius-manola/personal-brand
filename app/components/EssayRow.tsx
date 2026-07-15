import Link from 'next/link';
import type { Essay } from '@/lib/server/essays.server';

// Shared server-safe essay list-row, used by both app/essays/page.tsx and
// app/components/RecentEssays.tsx so the markup can't drift. Renders a Link to
// the essay with its title + formatted date, and an optional bottom divider.
export default function EssayRow({
  essay,
  showDivider = true,
}: {
  essay: Essay;
  showDivider?: boolean;
}) {
  return (
    <Link href={`/essays/${essay.id}`} className="block group">
      <article className={`list-row ${showDivider ? 'section-divider' : ''}`}>
        <div className="flex justify-between items-baseline">
          <h2 className="text-[1.03rem] font-normal leading-relaxed group-hover:text-[hsl(var(--muted-foreground))] transition-colors">
            {essay.metadata.title}
          </h2>
          <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] ml-4 flex-shrink-0">
            {new Date(essay.metadata.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
      </article>
    </Link>
  );
}
