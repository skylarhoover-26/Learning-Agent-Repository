'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, Lightbulb, ArrowRight } from 'lucide-react';
import { pickTips, personalLine, buildProgress } from '@/lib/loading-tips';

// What fills the lesson-generation wait: a line naming what we're building it
// around, a checklist of the real pipeline stages, and a rotating AI tip.
//
// Every lesson loader in the app mounts this, so the wait reads the same way
// everywhere. The pieces it shows are all optional per surface — the narrated
// player's audio-prep step has genuine per-scene progress of its own and passes
// showSteps={false} rather than stacking two progress stories on one screen.
//
// Nothing here fetches. Tips come from lib/loading-tips.js, a pure module, so the
// one screen that must never break has no new way to break.

const ROTATE_MS = 9000;
const FADE_MS = 260;

export default function GenTips({
  profile,
  format = 'standard',
  elapsed = null,
  showSteps = true,
  className = '',
}) {
  // Picked in an effect, not during render: pickTips shuffles, and a random
  // branch taken at render time hydrates to a different tree (same reason
  // BookLoader rolls its capybara in an effect).
  const [tips, setTips] = useState(null);
  useEffect(() => {
    setTips(pickTips(profile));
  }, [profile]);

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <p className="text-center text-sm font-semibold text-brand dark:text-brand-300">
        {personalLine(profile, format)}
      </p>
      {showSteps && <BuildChecklist format={format} elapsed={elapsed} />}
      <TipCard tips={tips} />
    </div>
  );
}

// The build pipeline, ticking. Tracks its own clock when the caller has no
// elapsed value to hand down (cinematic-course doesn't keep one) — it mounts
// when the wait starts, so its own count is close enough to drive a checklist.
function BuildChecklist({ format, elapsed }) {
  const [ticks, setTicks] = useState(0);
  const owns = elapsed === null || elapsed === undefined;

  useEffect(() => {
    if (!owns) return undefined;
    const id = setInterval(() => setTicks((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [owns]);

  const steps = buildProgress(owns ? ticks : elapsed, format);

  return (
    <ul className="mt-5 space-y-2" aria-label="Build progress">
      {steps.map((step) => (
        <li
          key={step.key}
          className="flex items-center gap-2.5 text-xs transition-opacity duration-500"
          style={{ opacity: step.done ? 0.55 : step.active ? 1 : 0.3 }}
        >
          <span className="w-4 h-4 shrink-0 grid place-items-center">
            {step.done ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
            ) : step.active ? (
              <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" aria-hidden />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
            )}
          </span>
          <span
            className={
              step.active
                ? 'font-medium text-ink dark:text-slate-200'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {step.label}
          </span>
          <span className="sr-only">{step.done ? ' — done' : step.active ? ' — in progress' : ''}</span>
        </li>
      ))}
    </ul>
  );
}

// One tip at a time, crossfading. Tapping "next tip" is the whole interaction —
// enough to give someone something to do with the wait without pretending the
// loader is a game.
function TipCard({ tips }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const total = tips?.length || 0;

  const advance = useCallback(() => {
    if (!total) return;
    setFading(true);
    setTimeout(() => {
      setIdx((i) => (i + 1) % total);
      setFading(false);
    }, FADE_MS);
  }, [total]);

  // Restarts on every advance, manual ones included, so a tip you just tapped to
  // doesn't get yanked away half-read.
  useEffect(() => {
    if (total < 2) return undefined;
    const id = setTimeout(advance, ROTATE_MS);
    return () => clearTimeout(id);
  }, [idx, total, advance]);

  return (
    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <Lightbulb className="w-3.5 h-3.5" aria-hidden />
        While you wait
      </div>

      {/* Fixed minimum height so a shorter tip rotating in doesn't jump the
          layout — and so the card holds its space before the tips are picked. */}
      <p
        className="tip mt-2.5 min-h-[3.5rem] text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        style={{ opacity: fading || !tips ? 0 : 1 }}
        aria-live="polite"
      >
        {tips?.[idx]?.text || ''}
      </p>

      {total > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1" aria-hidden>
            {tips.map((tip, i) => (
              <span
                key={tip.id}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i === idx ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand dark:hover:text-brand-300 transition-colors"
          >
            Next tip <ArrowRight className="w-3 h-3" aria-hidden />
          </button>
        </div>
      )}

      <style jsx>{`
        .tip {
          transition: opacity ${FADE_MS}ms ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .tip {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
