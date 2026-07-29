'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useProgression } from '@/components/progression-provider';

const FILL_GRADIENT = 'linear-gradient(90deg, #3B94FF, #FFB706)';
const TRACK_BG = 'rgba(255,255,255,.18)';
const COUNT_MS = 700;

// A jump bigger than this isn't a reward — it's the blob hydrate landing, or the
// first paint after progress loads. Snap to it instead of crawling through
// hundreds of numbers.
const SNAP_THRESHOLD = 500;

// Eases the XP number up to its new value so an award reads as a gain rather
// than a silent swap. Returns the number to display right now.
function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (from === 0 || Math.abs(target - from) > SNAP_THRESHOLD) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    let frame = null;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);

  return shown;
}

// Always-on XP readout for the top bar, sitting just left of the Home link. It
// reads from the progression provider, which already re-reads on every XP award
// (see its onXp subscription) — so the bar and the number move on their own the
// moment XP lands, in step with the XP popup.
//
// Deliberately not a link: it sits inches from Home and the profile menu, and a
// third click target there reads as clutter.
export default function XpMeter() {
  const prog = useProgression();
  const shown = useCountUp(prog?.totalXp || 0);

  // Hidden until progress is real, so it can never flash "LV 1 · 0 XP" during
  // load or on a page reached without a profile.
  if (!prog?.isLoaded || !prog.learnerId) return null;

  const { level, percent, xpToNext } = prog.levelProgress;
  const label = `Level ${level} · ${shown.toLocaleString()} XP total · ${xpToNext.toLocaleString()} XP to Level ${level + 1}`;

  return (
    <>
      {/* Full meter — matches the breakpoint where the "Home" label appears. */}
      <div
        data-tour="xp-meter"
        className="hidden sm:flex items-center gap-2 pl-1 pr-2"
        title={label}
        aria-label={label}
        role="img"
      >
        <span className="text-[11px] font-bold tracking-wide text-white/70 tabular-nums">
          LV {level}
        </span>
        <span
          className="relative block h-[2px] w-20 lg:w-28 rounded-full overflow-hidden"
          style={{ background: TRACK_BG }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%`, background: FILL_GRADIENT }}
          />
        </span>
        <span className="text-[11px] font-semibold text-white/70 tabular-nums">
          {shown.toLocaleString()} XP
        </span>
      </div>

      {/* Small screens: a compact chip so nothing wraps or pushes the avatar off. */}
      <div
        className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-semibold text-white/80 tabular-nums"
        style={{ background: 'rgba(255,255,255,.10)' }}
        title={label}
        aria-label={label}
        role="img"
      >
        <Zap className="w-3 h-3" />
        {level}
        <span className="text-white/40">·</span>
        {shown.toLocaleString()}
      </div>
    </>
  );
}
