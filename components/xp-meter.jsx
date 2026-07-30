'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useProgression } from '@/components/progression-provider';
import XpBar from '@/components/xp-bar';

const COUNT_MS = 700;

// A jump bigger than this isn't a reward — it's the blob hydrate landing, or the
// first paint after progress loads. Snap to it instead of crawling through
// hundreds of numbers.
const SNAP_THRESHOLD = 500;

// Eases the XP number up to its new value so an award reads as a gain rather
// than a silent swap. Returns the number to display right now, plus whether
// this change was a real gain (vs. a load-time snap) so the bar can flare.
function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const [gainId, setGainId] = useState(0);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (from === 0 || Math.abs(target - from) > SNAP_THRESHOLD) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    // A real, human-sized award — celebrate it.
    if (target > from) setGainId((n) => n + 1);
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

  return { shown, gainId };
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
  const { shown, gainId } = useCountUp(prog?.totalXp || 0);

  // Hidden until progress is real, so it can never flash "LV 1 · 0 XP" during
  // load or on a page reached without a profile.
  if (!prog?.isLoaded || !prog.learnerId) return null;

  const { level, percent, xpToNext } = prog.levelProgress;
  const label = `Level ${level} · ${shown.toLocaleString()} XP total · ${xpToNext.toLocaleString()} XP to Level ${level + 1}`;
  // `key` on the animated bits restarts their one-shot animation on each gain.
  const bump = gainId ? 'xp-bump' : '';

  return (
    <>
      {/* Full meter. It shows from md up, not sm: at the old sm breakpoint the
          now much wider bar competed with Home + the name for the same row. */}
      <div
        data-tour="xp-meter"
        className="hidden md:flex items-center gap-2.5 pl-1 pr-1"
        title={label}
        aria-label={label}
        role="img"
      >
        {/* LV chip: a solid navy pill ringed in gold, so the level reads as a
            badge you earned rather than a label floating in the bar. */}
        <span
          key={`lv-${gainId}`}
          className={`${bump} flex items-center gap-1 px-2 py-[3px] rounded-pill leading-none`}
          style={{
            background: 'linear-gradient(180deg, rgba(10,36,67,.95), rgba(4,18,38,.95))',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,198,51,.75), 0 2px 8px -2px rgba(0,0,0,.6)',
          }}
        >
          <span className="text-[9px] font-extrabold tracking-[.14em] text-cta-300/90">LV</span>
          <span className="text-[15px] font-extrabold text-white tabular-nums">{level}</span>
        </span>

        <XpBar percent={percent} size="sm" className="w-28 lg:w-44" sheenKey={gainId} />

        <span
          key={`xp-${gainId}`}
          className={`${bump} text-[13px] font-extrabold text-white tabular-nums whitespace-nowrap`}
        >
          {shown.toLocaleString()}
          <span className="ml-1 text-[10px] font-bold tracking-wide text-cta-300/80">XP</span>
        </span>
      </div>

      {/* Small screens: a compact chip so nothing wraps or pushes the avatar off.
          Still bold — same gold-ringed navy pill, just collapsed. */}
      <div
        key={`sm-${gainId}`}
        className={`${bump} md:hidden flex items-center gap-1 px-2 py-1 rounded-pill text-[12px] font-extrabold text-white tabular-nums`}
        style={{
          background: 'linear-gradient(180deg, rgba(10,36,67,.95), rgba(4,18,38,.95))',
          boxShadow: 'inset 0 0 0 1.5px rgba(255,198,51,.7)',
        }}
        title={label}
        aria-label={label}
        role="img"
      >
        <Zap className="w-3 h-3 text-cta-300" strokeWidth={3} />
        {level}
        <span className="text-white/30">·</span>
        {shown.toLocaleString()}
      </div>
    </>
  );
}
