import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A link that wears Magic UI's shimmer-button treatment.
//
// The registry's <ShimmerButton /> renders a <button>, and the page's only action
// is navigating to an external calendar — nesting a button inside an anchor is
// invalid HTML, and an onClick-driven button would lose middle-click, "copy link"
// and crawlability. So the shimmer layers are reproduced here on an <a> instead of
// editing the registry component. Visual layers, in paint order:
//   1. the element background (.cta-button)
//   2. the rotating conic spark, at negative z so it paints above that background
//   3. the backdrop, inset by --cut, which masks the spark down to a glowing rim
//   4. the label and the inset highlight
// Animation is pure CSS (animate-shimmer-slide / animate-spin-around, declared in
// tailwind.config.ts), so this stays a server component and ships no JS.
interface ShimmerLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Color of the travelling spark. */
  shimmerColor?: string;
  /** Thickness of the visible rim. */
  shimmerSize?: string;
  /** One full sweep. */
  shimmerDuration?: string;
  background?: string;
  borderRadius?: string;
  /** Off for same-page anchors, which must not open a tab. */
  newTab?: boolean;
}

export default function ShimmerLink({
  href,
  children,
  className,
  shimmerColor = '#ffffff',
  shimmerSize = '0.05em',
  shimmerDuration = '3s',
  background = 'hsl(var(--brand))',
  borderRadius = '9999px',
  newTab = true,
}: ShimmerLinkProps) {
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      style={
        {
          '--spread': '90deg',
          '--shimmer-color': shimmerColor,
          '--cta-radius': borderRadius,
          '--speed': shimmerDuration,
          '--cut': shimmerSize,
          '--bg': background,
        } as CSSProperties
      }
      className={cn(
        'cta-button group relative z-0 inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border',
        'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--card))]',
        className,
      )}
    >
      {/* spark container */}
      <span className="absolute inset-0 -z-30 overflow-visible blur-[2px] [container-type:size]">
        <span className="animate-shimmer-slide absolute inset-0 block aspect-[1] h-[100cqh] [mask:none]">
          <span className="animate-spin-around absolute -inset-full block w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
        </span>
      </span>

      <span className="relative z-10">{children}</span>

      {/* inset highlight */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full [border-radius:var(--cta-radius)]',
          'shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out',
          'group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]',
        )}
      />

      {/* backdrop — trims the spark to a rim */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[var(--cut)] -z-20 [background:var(--bg)] [border-radius:var(--cta-radius)]"
      />
    </a>
  );
}
