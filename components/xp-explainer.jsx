'use client';

import { useState } from 'react';
import { HelpCircle, X, BookOpen, Trophy, MessageCircle, Flame, Gamepad2, RefreshCw } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Listed alphabetically by label. Amounts match lib/progression.js (XP_AMOUNTS,
// DAILY_CAPS, GAME_XP_BY_DIFFICULTY). Lessons and games scale with how well you
// do, so they show a range; quick tips pay a flat amount on completion.
// `href` ties a source to the feature that earns it: if that feature is hidden
// (or coming soon) for the viewer, the line is dropped so we never advertise XP
// they can't currently earn. Streak XP has no page, so it always shows.
const XP_SOURCES = [
  { icon: RefreshCw, label: 'Answer a review card', amount: '+5 XP (20/day)', href: '/review' },
  { icon: MessageCircle, label: 'Chat with the AI coach', amount: '+2 XP (5/day)', href: '/chat' },
  { icon: Trophy, label: 'Complete a project quest', amount: 'up to +200 XP', href: '/quests' },
  { icon: BookOpen, label: 'Finish a tip, lesson, or deep dive', amount: 'up to +15–100 XP', href: '/lesson' },
  { icon: Flame, label: 'Keep your streak going', amount: '+10 XP/day', href: null },
  { icon: Gamepad2, label: 'Play a learning game', amount: '+20–50 XP each', href: '/games' },
].slice().sort((a, b) => a.label.localeCompare(b.label));

export default function XpExplainer() {
  const [open, setOpen] = useState(false);
  const { loaded, isItemHidden, isItemComingSoon } = useMenuVisibility();

  // Drop any source whose feature the viewer can't reach (hidden or coming soon).
  // Admins see everything (the provider reports nothing hidden for them).
  const sources = XP_SOURCES.filter(
    (s) => !(s.href && loaded && (isItemHidden(s.href) || isItemComingSoon(s.href)))
  );

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
              {sources.map(source => (
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
