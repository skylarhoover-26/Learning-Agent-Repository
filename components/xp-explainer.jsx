'use client';

import { useState } from 'react';
import { HelpCircle, X, BookOpen, Trophy, MessageCircle, Flame, Gamepad2, RefreshCw } from 'lucide-react';

// Listed by label. Amounts match lib/progression.js (XP_AMOUNTS + DAILY_CAPS).
// Lessons scale with how many checkpoint questions you get right, so they show a
// range rather than a fixed number.
const XP_SOURCES = [
  { icon: RefreshCw, label: 'Answer a review card', amount: 'up to +5 XP' },
  { icon: MessageCircle, label: 'Chat with the AI coach', amount: '+2 XP (5/day)' },
  { icon: BookOpen, label: 'Finish a quick lesson or deep dive', amount: 'up to +40–100 XP' },
  { icon: Trophy, label: 'Complete a project quest', amount: '+200 XP' },
  { icon: Flame, label: 'Keep your streak going', amount: '+10 XP/day' },
  { icon: Gamepad2, label: 'Play a learning game', amount: '+25 XP (3/day)' },
];

export default function XpExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        How do you earn experience points?
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-ink dark:text-slate-200">How do you earn experience points</h4>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {XP_SOURCES.map(source => (
                <div key={source.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <source.icon className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink dark:text-slate-200">{source.label}</p>
                  </div>
                  <span className="text-xs font-semibold text-cta-600 shrink-0">{source.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
