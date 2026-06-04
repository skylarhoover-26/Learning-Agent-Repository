'use client';

import { useProgression } from './progression-provider';
import { Flame } from 'lucide-react';

export default function LiveStreakCard() {
  const prog = useProgression();
  if (!prog?.isLoaded) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 animate-pulse h-36" />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-cta-600" />
        <h3 className="font-semibold text-ink dark:text-slate-200">Current Streak</h3>
      </div>
      <div className="text-5xl font-bold text-ink dark:text-slate-200 mb-1">{prog.streak}</div>
      <p className="text-sm text-slate-500">
        {prog.streak > 0 ? `Day${prog.streak > 1 ? 's' : ''} in a row` : 'Start a lesson today!'}
      </p>
    </div>
  );
}
