'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';

// Feeds the cursor position to a group of cards so they share one light.
//
// The coordinates are VIEWPORT coordinates (clientX/clientY) on purpose: the cards
// paint their glow with `background-attachment: fixed`, which anchors the gradient
// to the viewport. Same origin for every card means the light flows across the gaps
// between them instead of restarting inside whichever card is hovered.
//
// The variables are written straight to the DOM node rather than held in state —
// this fires on every pointer move, and re-rendering three cards each time would be
// pointless work for something CSS can absorb.
export default function SpotlightGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--pointer-x', `${event.clientX}px`);
    node.style.setProperty('--pointer-y', `${event.clientY}px`);
  }

  return (
    <div ref={ref} className={className} onPointerMove={handlePointerMove}>
      {children}
    </div>
  );
}
