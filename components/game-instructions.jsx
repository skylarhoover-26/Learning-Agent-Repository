'use client';

import { useState } from 'react';
import { ListChecks, ChevronDown } from 'lucide-react';

// Shared "How to play" card for the games. Used two ways:
//  - On a game's start screen: static, always expanded.
//  - On the play screen: pass `collapsible` (and usually defaultOpen={false}) so
//    it sits minimized and the player can click "How to play" to review it.
// `steps` is an array of short strings.
export default function GameInstructions({ steps = [], collapsible = false, defaultOpen = true, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!steps.length) return null;

  const showSteps = collapsible ? open : true;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 ${collapsible ? 'p-4' : 'p-5'} ${className}`}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-brand" />
            <span className="text-base font-bold text-ink dark:text-slate-200">How to play</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </button>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-brand" />
          <h3 className="text-base font-bold text-ink dark:text-slate-200">How to play</h3>
        </div>
      )}

      {showSteps && (
        <ol className={`space-y-2 ${collapsible ? 'mt-3' : ''}`}>
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="w-6 h-6 rounded-full bg-brand-50 dark:bg-slate-700 text-brand dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
