'use client';

import { useState } from 'react';
import { HelpCircle, X, BookOpen, Trophy, MessageCircle, Flame } from 'lucide-react';

// Listed alphabetically by label.
const XP_SOURCES = [
  { icon: MessageCircle, label: 'Chat with the AI coach', amount: '+25 XP' },
  { icon: BookOpen, label: 'Complete a lesson', amount: '+50 XP' },
  { icon: Trophy, label: 'Finish a project milestone', amount: '+100 XP' },
  { icon: Flame, label: 'Keep your streak going', amount: '+10 XP/day' },
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
