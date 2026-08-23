'use client';

import { useEffect, useRef } from 'react';
import { hideTip, showTip } from './tip';

type WorldFeature = {
  type: string;
  a2: string | null;
  bounds: [[number, number], [number, number]];
  properties: { name: string };
};

declare global {
  interface Window {
    d3?: {
      geoOrthographic: () => any;
      geoPath: (projection: unknown, ctx: CanvasRenderingContext2D) => (obj: unknown) => unknown;
      geoGraticule10: () => unknown;
      geoBounds: (f: unknown) => [[number, number], [number, number]];
      geoContains: (f: unknown, ll: [number, number]) => boolean;
    };
    topojson?: { feature: (topo: unknown, obj: unknown) => { features: WorldFeature[] } };
  }
}

const GLOBE_RAMP = ['#245261', '#31707e', '#428d9b', '#57abb9', '#75c8d6', '#a1e3ef'];
const GLOBE_LAND = '#222226';
const GLOBE_SEA = '#0d0d0f';
const SIZE = 340;

const world: { status: 'idle' | 'loading' | 'ready' | 'error'; features: WorldFeature[]; ready: Promise<void> | null } = {
  status: 'idle',
  features: [],
  ready: null,
};

let globeRot = [-30, -24];
let globeRaf = 0;
let scriptsReady = false;

function rampColor(v: number, max: number) {
  if (v <= 0) return GLOBE_LAND;
  const step = Math.min(GLOBE_RAMP.length - 1, Math.floor((GLOBE_RAMP.length * Math.log(v + 1)) / Math.log(max + 1.000001)));
  return GLOBE_RAMP[step];
}

function flagEmoji(cc: string | null) {
  return cc && /^[A-Za-z]{2}$/.test(cc)
    ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🌐';
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(src));
    document.head.append(script);
  });
}

async function ensureScripts() {
  if (scriptsReady && window.d3 && window.topojson) return;
  await loadScript('/analytics-world/d3-array.min.js');
  await loadScript('/analytics-world/d3-geo.min.js');
  await loadScript('/analytics-world/topojson-client.min.js');
  scriptsReady = true;
}

async function loadWorld() {
  if (world.ready) return world.ready;
  world.status = 'loading';
  world.ready = (async () => {
    try {
      await ensureScripts();
      const [topo, numToA2] = await Promise.all([
        fetch('/analytics-world/countries-110m.json').then((r) => r.json()),
        fetch('/analytics-world/iso-num-to-a2.json').then((r) => r.json() as Promise<Record<string, string>>),
      ]);
      const BY_NAME: Record<string, string> = { Kosovo: 'XK' };
      world.features = window.topojson!.feature(topo, topo.objects.countries).features;
      for (const feature of world.features) {
        feature.a2 = numToA2[String((feature as unknown as { id?: string }).id)] || BY_NAME[feature.properties.name] || null;
        feature.bounds = window.d3!.geoBounds(feature);
      }
      world.status = 'ready';
    } catch {
      world.status = 'error';
      world.ready = null;
    }
  })();
  return world.ready;
}

export const GLOBE_RAMP_COLORS = GLOBE_RAMP;

export function GlobeCanvas({
  counts,
  excluded,
  onToggle,
}: {
  counts: Map<string, number>;
  excluded: Set<string>;
  onToggle: (cc: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef(counts);
  const excludedRef = useRef(excluded);
  const toggleRef = useRef(onToggle);
  countsRef.current = counts;
  excludedRef.current = excluded;
  toggleRef.current = onToggle;

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return undefined;

    const start = async () => {
      host.replaceChildren();
      const fallback = document.createElement('div');
      fallback.className = 'globe-fallback muted';
      fallback.textContent = 'loading the world…';
      host.append(fallback);
      await loadWorld();
      if (cancelled || !hostRef.current) return;
      if (world.status !== 'ready' || !window.d3) {
        fallback.textContent = 'world map failed to load — check /analytics-world/countries-110m.json';
        return;
      }

      const d3 = window.d3;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.className = 'globe-canvas';
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      canvas.style.width = `${SIZE}px`;
      canvas.style.height = `${SIZE}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const projection = d3.geoOrthographic().scale(SIZE / 2 - 8).translate([SIZE / 2, SIZE / 2]);
      const geopath = d3.geoPath(projection, ctx) as (obj: unknown) => void;
      const graticule = d3.geoGraticule10();

      const pat = document.createElement('canvas');
      pat.width = pat.height = 6;
      const pctx = pat.getContext('2d');
      if (pctx) {
        pctx.strokeStyle = 'rgba(10,10,11,0.9)';
        pctx.lineWidth = 1.8;
        pctx.beginPath();
        pctx.moveTo(-1, 7);
        pctx.lineTo(7, -1);
        pctx.stroke();
      }
      const hatch = ctx.createPattern(pat, 'repeat');

      let hoverF: WorldFeature | null = null;
      let drag: { x: number; y: number; rot: number[]; moved: boolean } | null = null;
      const maxN = () => Math.max(1, ...[...countsRef.current.entries()].filter(([cc]) => !excludedRef.current.has(cc)).map(([, n]) => n));

      const draw = () => {
        projection.rotate(globeRot);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.beginPath();
        geopath({ type: 'Sphere' });
        ctx.fillStyle = GLOBE_SEA;
        ctx.fill();
        ctx.beginPath();
        geopath(graticule);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        const peak = maxN();
        for (const feature of world.features) {
          const off = Boolean(feature.a2 && excludedRef.current.has(feature.a2));
          ctx.beginPath();
          geopath(feature);
          ctx.fillStyle = off ? GLOBE_LAND : rampColor(countsRef.current.get(feature.a2 || '') || 0, peak);
          ctx.fill();
          if (off && hatch) {
            ctx.fillStyle = hatch;
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(10,10,11,0.6)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        if (hoverF) {
          ctx.beginPath();
          geopath(hoverF);
          ctx.strokeStyle = '#f4f4f5';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        ctx.beginPath();
        geopath({ type: 'Sphere' });
        ctx.strokeStyle = '#2c2c31';
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      const countryAt = (x: number, y: number) => {
        const dx = x - SIZE / 2;
        const dy = y - SIZE / 2;
        if (dx * dx + dy * dy > (SIZE / 2 - 8) ** 2) return null;
        const ll = projection.invert([x, y]);
        if (!ll || !Number.isFinite(ll[0])) return null;
        const [lon, lat] = ll;
        for (const feature of world.features) {
          const [[w, s], [e, n]] = feature.bounds;
          if (lat < s - 0.5 || lat > n + 0.5) continue;
          const inLon = w <= e ? lon >= w - 0.5 && lon <= e + 0.5 : lon >= w - 0.5 || lon <= e + 0.5;
          if (inLon && d3.geoContains(feature, ll)) return feature;
        }
        return null;
      };

      const pos = (ev: PointerEvent): [number, number] => {
        const r = canvas.getBoundingClientRect();
        return [ev.clientX - r.left, ev.clientY - r.top];
      };

      canvas.addEventListener('pointerdown', (ev) => {
        canvas.setPointerCapture(ev.pointerId);
        const [x, y] = pos(ev);
        drag = { x, y, rot: [...globeRot], moved: false };
      });
      canvas.addEventListener('pointermove', (ev) => {
        const [x, y] = pos(ev);
        if (drag) {
          const dx = x - drag.x;
          const dy = y - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
          globeRot = [drag.rot[0] + dx * 0.4, Math.max(-90, Math.min(90, drag.rot[1] - dy * 0.4))];
          hideTip();
          draw();
          return;
        }
        hoverF = countryAt(x, y);
        canvas.style.cursor = hoverF ? 'pointer' : 'grab';
        if (hoverF) {
          const cc = hoverF.a2;
          const n = (cc && countsRef.current.get(cc)) || 0;
          const off = Boolean(cc && excludedRef.current.has(cc));
          showTip(ev, `<b>${flagEmoji(cc)} ${hoverF.properties.name}</b><br>${n} visitor${n === 1 ? '' : 's'} in this window${off ? ' · <i>hidden</i>' : ''}${cc ? `<br><span class="muted">click to ${off ? 'count it again' : 'hide it from every number'}</span>` : ''}`);
        } else hideTip();
        draw();
      });
      canvas.addEventListener('pointerup', (ev) => {
        const wasDrag = drag?.moved;
        drag = null;
        if (wasDrag) return;
        const feature = countryAt(...pos(ev));
        if (feature?.a2) toggleRef.current(feature.a2);
      });
      canvas.addEventListener('pointerleave', () => {
        hoverF = null;
        drag = null;
        hideTip();
        draw();
      });

      cancelAnimationFrame(globeRaf);
      const spin = () => {
        if (!canvas.isConnected) return;
        if (!drag && !hoverF) {
          globeRot[0] += 0.05;
          draw();
        }
        globeRaf = requestAnimationFrame(spin);
      };
      globeRaf = requestAnimationFrame(spin);
      host.replaceChildren(canvas);
      draw();
    };

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(globeRaf);
      hideTip();
    };
  }, []);

  return <div ref={hostRef} />;
}
