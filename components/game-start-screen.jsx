'use client';

import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import GameInstructions from '@/components/game-instructions';

// The pre-game gate for the generated games (Jeopardy, Family Feud, Millionaire,
// Two Truths, Wheel of Fortune). The four hand-built games each hand-rolled this
// same card; these five had nothing at all and dropped the player from a spinner
// straight into play — feedback #185 and #188.
//
// It renders WHILE the round is still generating, so reading the rules covers the
// wait instead of a spinner followed by another gate. `ready` is the generated
// payload: until it lands, the button stays disabled and says so.
export default function GameStartScreen({
  icon: Icon,
  title,
  subtitle,
  steps,
  loading,
  ready,
  onStart,
  loadingLabel = 'Building your round…',
}) {
  const waiting = loading || !ready;

  return (
    <main className="max-w-2xl mx-auto px-6 pt-6 pb-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
        {Icon && (
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1">{title}</h2>
        {subtitle && <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>{subtitle}</p>}

        <GameInstructions className="text-left mb-5" steps={steps} />

        <button
          onClick={onStart}
          disabled={waiting}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {waiting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {loadingLabel}</>
            : <>Start Game <ChevronRight className="w-4 h-4" /></>}
        </button>

        <div className="mt-6">
          <Link href="/games" className="text-sm text-brand font-medium hover:underline">Back to all games</Link>
        </div>
      </div>
    </main>
  );
}
