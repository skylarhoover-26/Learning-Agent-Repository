'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { pickTips } from '@/lib/loading-tips';

// The "while you wait" reel on every lesson-generation loader.
//
// Scope is deliberately narrow. An earlier version of this component also drew a
// four-row build checklist and the "building this for you" line; between those,
// the loader's own status message and the progress bar, the screen announced the
// same stage three times over and read as cluttered. The bar owns progress, the
// loader's message owns who it's for, statusLine() (lib/loading-tips.js) owns the
// stage in one grey sentence, and this owns the tips. One job each.
//
// Nothing here fetches. Tips come from lib/loading-tips.js, a pure module, so the
// one screen that must never break has no new way to break.

const ROTATE_MS = 9000;
const FADE_MS = 260;

export default function GenTips({ profile, className = '' }) {
  // Picked in an effect, not during render: pickTips shuffles, and a random
  // branch taken at render time hydrates to a different tree (same reason
  // BookLoader rolls its capybara in an effect).
  const [tips, setTips] = useState(null);
  useEffect(() => {
    setTips(pickTips(profile));
  }, [profile]);

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
    <div className={`max-w-md mx-auto pt-5 border-t border-slate-200 dark:border-slate-700 ${className}`}>
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
