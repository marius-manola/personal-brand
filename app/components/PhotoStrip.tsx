'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';

export interface ProofPhoto {
  src: string;
  alt: string;
  rotate: number;
}

// An endless band of tilted proof shots under the hero: drifting, draggable, and
// each one expandable to full size.
//
// Why this isn't motion's built-in `drag` with dragConstraints: constrained drag has
// ends, and this has none. One motion value `x` is the single source of truth, driven
// by an ambient drift each frame plus pointer drags, then wrapped modulo the width of
// one copy of the list. The list is rendered twice, so wrapping into [-copyWidth, 0]
// always leaves a full copy on screen and the seam never shows.
//
// Momentum is hand-rolled for the same reason: motion's inertia animates toward a
// target, and there is no target here.
//
// The photos are real screenshots and the strip crops them, so each is a <button>
// that opens the uncropped image. That's also why the strip is no longer aria-hidden:
// it's interactive content now, and the buttons give keyboard users the same access.
// Drift pauses on hover and on focus, so a moving target never fights the cursor or
// the focus ring.

/** Ambient leftward drift, px per second. Slow enough to feel like weather. */
const DRIFT = 26;
/** Fling ceiling, px per second — an unclamped flick can look like a glitch. */
const MAX_FLING = 2400;
/** Per-frame velocity decay. */
const FRICTION = 0.94;
/** Pointer travel beyond this is a drag, not a click. */
const CLICK_SLOP = 6;

function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export default function PhotoStrip({ photos }: { photos: ProofPhoto[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [copyWidth, setCopyWidth] = useState(0);
  const [expanded, setExpanded] = useState<ProofPhoto | null>(null);
  const [paused, setPaused] = useState(false);
  // Portals need a DOM to target, so the overlay only mounts client-side.
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const x = useMotionValue(0);
  const dragging = useRef(false);
  const travelled = useRef(0);
  const velocity = useRef(0);
  const lastPointer = useRef({ x: 0, t: 0 });
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // The row holds two copies, so one copy is exactly half its scroll width. Measured
  // rather than computed from the CSS so it survives font loading and breakpoints.
  useEffect(() => {
    const measure = () => {
      if (rowRef.current) setCopyWidth(rowRef.current.scrollWidth / 2);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [photos.length]);

  useAnimationFrame((_, delta) => {
    if (dragging.current || copyWidth === 0) return;
    const seconds = delta / 1000;
    const idle = paused || expanded !== null || reduceMotion;
    const drift = idle ? 0 : -DRIFT * seconds;
    x.set(x.get() + drift + velocity.current * seconds);
    velocity.current *= FRICTION;
    if (Math.abs(velocity.current) < 1) velocity.current = 0;
  });

  // The only thing actually applied to the DOM: x folded into one copy's width.
  const xWrapped = useTransform(x, (value) =>
    copyWidth === 0 ? 0 : wrap(-copyWidth, 0, value),
  );

  // Drag is tracked with window listeners rather than setPointerCapture: capturing
  // on the strip redirects the pointer sequence away from the photo buttons, and
  // Chrome then never fires their click — so expanding a photo silently did nothing.
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      travelled.current = 0;
      velocity.current = 0;
      lastPointer.current = { x: event.clientX, t: performance.now() };

      const onMove = (move: PointerEvent) => {
        if (!dragging.current) return;
        const now = performance.now();
        const dx = move.clientX - lastPointer.current.x;
        const dt = Math.max(now - lastPointer.current.t, 1);
        travelled.current += Math.abs(dx);
        x.set(x.get() + dx);
        velocity.current = Math.max(-MAX_FLING, Math.min(MAX_FLING, (dx / dt) * 1000));
        lastPointer.current = { x: move.clientX, t: now };
      };
      const onUp = () => {
        dragging.current = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [x],
  );

  // A drag that ends over a photo must not also open it.
  const openIfNotDragging = useCallback((photo: ProofPhoto, target: HTMLElement) => {
    if (travelled.current > CLICK_SLOP) return;
    restoreFocusTo.current = target;
    setExpanded(photo);
  }, []);

  const close = useCallback(() => {
    setExpanded(null);
    restoreFocusTo.current?.focus();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    // .page-shell is the scroll container, so locking <body> wouldn't hold it still.
    const shell = document.querySelector<HTMLElement>('.page-shell');
    const previous = shell?.style.overflow ?? '';
    if (shell) shell.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      if (shell) shell.style.overflow = previous;
    };
  }, [expanded, close]);

  // Two copies back to back — this is what makes the wrap seamless.
  const loop = [...photos, ...photos];

  return (
    <>
      <div
        className="photo-strip"
        onPointerDown={handlePointerDown}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <motion.div ref={rowRef} className="photo-row" style={{ x: xWrapped }}>
          {loop.map((photo, index) => (
            <button
              type="button"
              key={`${photo.src}-${index}`}
              className="photo-card"
              style={{ transform: `rotate(${photo.rotate}deg)` }}
              // The second copy is a visual duplicate; only the first is announced.
              aria-hidden={index >= photos.length}
              tabIndex={index >= photos.length ? -1 : 0}
              aria-label={`Expand: ${photo.alt}`}
              onClick={(event) => openIfNotDragging(photo, event.currentTarget)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading={index < 4 ? 'eager' : 'lazy'}
                decoding="async"
                // Without this the browser's native image drag hijacks the gesture.
                draggable={false}
              />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Portalled to <body> on purpose. The BlurFade wrapper around this strip is a
          motion.div carrying a `filter`, and a filtered ancestor becomes the
          containing block for position:fixed children — which sized this overlay to
          the wrapper instead of the viewport and clipped the image. */}
      {mounted &&
        expanded &&
        createPortal(
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={expanded.alt}
            onClick={close}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={close}
              aria-label="Close"
              autoFocus
            >
              <span aria-hidden="true">×</span>
            </button>

            <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
              <img src={expanded.src} alt={expanded.alt} className="lightbox-img" />
              <figcaption className="lightbox-caption">{expanded.alt}</figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
