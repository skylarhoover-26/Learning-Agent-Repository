'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import EggCapybara from '@/components/egg-capybara';
import { useProfile } from '@/components/profile-provider';
import { FINDABLE_EGG_COUNT } from '@/lib/easter-eggs';
import { findProgress } from '@/lib/egg-finds';
import { resolveLearnerId } from '@/lib/learner-id';

// Shown once, right after the guided tour finishes: the capybara that explains
// the hunt exists.
//
// It has to exist because the rule is now "click to collect", and a rule nobody
// is told is just a capybara people walk past. So this is the one capybara that
// introduces itself, and clicking it is both the explanation and the first find.
// See lib/easter-eggs.js: tour-complete.
export default function TourCapybara({ onDismiss }) {
  const { profile } = useProfile() || {};
  const learnerId = profile ? resolveLearnerId(profile) : null;
  const [progress, setProgress] = useState(null);

  // Read after mount — the count comes from the learner's ledger.
  useEffect(() => {
    if (learnerId) setProgress(findProgress(learnerId));
  }, [learnerId]);

  const collected = progress ? progress.found > 0 : false;

  return (
    <div
      className="fixed bottom-5 right-5 z-[90] w-[320px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-4"
      role="dialog"
      aria-label="About the hidden capybaras"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <EggCapybara
          eggId="tour-complete"
          variant="scholar"
          size={78}
          className="shrink-0 -mt-1"
          onCollect={() => learnerId && setProgress(findProgress(learnerId))}
        />
        <div className="min-w-0 pr-4">
          <h3 className="text-sm font-bold text-ink dark:text-slate-100">
            One more thing
          </h3>
          {collected ? (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              That&apos;s one. There are <strong>{FINDABLE_EGG_COUNT - 1}</strong> more of us hidden
              around the app. Find every one and I&apos;ll join your avatar as a sidekick.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              There are <strong>{FINDABLE_EGG_COUNT}</strong> capybaras hidden around the app. Click
              one when you spot it to collect it and earn 5 XP.{' '}
              <span className="font-bold text-brand-600 dark:text-brand-300">Click me to start.</span>
            </p>
          )}
          {progress && progress.found > 0 && (
            <p className="mt-2 text-xs font-bold text-brand-600 dark:text-brand-300 tabular-nums">
              {progress.found} of {progress.total} collected
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        {collected ? 'Got it' : 'Maybe later'}
      </button>
    </div>
  );
}
