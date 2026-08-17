'use client';

import { useProgression } from './progression-provider';
import { Flame } from 'lucide-react';
import EggCapybara from '@/components/egg-capybara';

// Streak milestones earn a capybara in the card's corner: the hot spring at a
// week, the crown at a month. Checked highest-first so day 30 doesn't also match
// the 7-day rule. Below a week there is no capybara — a 2-day streak is not a
// milestone, and rewarding it would spend the surprise on nothing.
// See lib/easter-eggs.js: streak-hot-spring, streak-crown.
function streakEgg(streak) {
  if (streak >= 30) return { eggId: 'streak-crown', variant: 'crown' };
  if (streak >= 7) return { eggId: 'streak-hot-spring', variant: 'hotspring' };
  return null;
}

export default function LiveStreakCard() {
  const prog = useProgression();
  if (!prog?.isLoaded) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 animate-pulse h-36" />
    );
  }

  const egg = streakEgg(prog.streak);

  return (
    <div data-tour="home-streak" className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      {egg && (
        <EggCapybara
          eggId={egg.eggId}
          variant={egg.variant}
          size={78}
          className="absolute -right-1 -bottom-2 pointer-events-none"
        />
      )}
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-cta-600" />
        <h3 className="font-semibold text-ink dark:text-slate-200">Current Streak</h3>
      </div>
      <div className="text-5xl font-bold text-ink dark:text-slate-200 mb-1">{prog.streak}</div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {prog.streak > 0 ? `Day${prog.streak > 1 ? 's' : ''} in a row` : 'Learn something today to start one!'}
      </p>
    </div>
  );
}
