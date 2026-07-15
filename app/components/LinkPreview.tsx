'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// LinkPreview — an adilmania-style hover wrapper that reveals a small portrait
// image near the wrapped element on hover.
//
// Missing-asset behavior (the portrait asset is PENDING):
//   - `src` defaults to `undefined`, so the preview is entirely OFF until a real
//     asset path is passed in — no hidden <img>, no network request, no broken
//     image on hover.
//   - When a `src` IS provided, the image is preloaded offscreen via a hidden
//     <img>. The popover only renders after that image successfully loads
//     (`loaded`), so a hover never shows an empty/half-loaded box.
//   - If the image fails to load, `failed` permanently disables the preview.
//
// To enable it later: drop the real image at `public/portrait.jpg` and pass
// `src="/portrait.jpg"` where LinkPreview wraps the hero name.
export default function LinkPreview({
  children,
  src,
  alt = 'Portrait of Marius Manolachi',
}: {
  children: React.ReactNode;
  src?: string;
  alt?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const preloadRef = useRef<HTMLImageElement | null>(null);

  const hasAsset = Boolean(src) && !failed;
  const canPreview = hasAsset && loaded;

  // The offscreen preload <img> is server-rendered with `src` already set, so
  // the browser can fetch/decode it (and fire the native `load` event) while
  // parsing the initial HTML — before React hydrates and attaches `onLoad`.
  // A `load` event that fires before the handler exists is missed forever, so
  // `loaded` would stay false and the hover popover would never appear. Guard
  // against this by checking `img.complete` as soon as the node mounts (via a
  // callback ref) and again on hydration (effect), treating an already-loaded
  // image the same as a fresh `onLoad`.
  const checkAlreadyLoaded = useCallback((img: HTMLImageElement | null) => {
    preloadRef.current = img;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    checkAlreadyLoaded(preloadRef.current);
  }, [checkAlreadyLoaded]);

  return (
    <span
      className="link-preview-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {/* Offscreen preload: only rendered once an asset path is set. Gates the
          popover behind a successful load and permanently disables on error. */}
      {hasAsset && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={checkAlreadyLoaded}
          src={src}
          alt=""
          aria-hidden="true"
          className="link-preview-preload"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}

      <AnimatePresence>
        {canPreview && hovered && (
          <motion.span
            className="link-preview-pop"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
