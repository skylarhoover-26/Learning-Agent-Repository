'use client';

import { useProgression } from './progression-provider';
import { Flame, Zap } from 'lucide-react';

export default function LiveStatsPills() {
  const prog = useProgression();
  if (!prog?.isLoaded) return null;

  return (
    <div className="flex items-center gap-2">
      {prog.streak > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-cta-50 text-cta-700 ring-1 ring-cta-200">
          <Flame className="w-3.5 h-3.5" />
          {prog.streak} day streak
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-brand-50 text-brand-700 ring-1 ring-brand-200">
        <Zap className="w-3.5 h-3.5" />
        {prog.totalXp.toLocaleString()} XP
      </span>
    </div>
  );
}
