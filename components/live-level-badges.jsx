'use client';

import Link from 'next/link';
import { useProgression } from './progression-provider';
import { Award, ChevronRight } from 'lucide-react';

const BADGE_META = {
  first_lesson: { id: 'first_lesson', name: 'First Steps', emoji: '🎓' },
  three_lessons: { id: 'three_lessons', name: 'Getting Going', emoji: '📚' },
  ten_lessons: { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓' },
  three_day_streak: { id: 'three_day_streak', name: 'On Fire', emoji: '🔥' },
  seven_day_streak: { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡' },
  first_quiz: { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️' },
  quiz_master: { id: 'quiz_master', name: 'Quiz Master', emoji: '💯' },
  first_quest: { id: 'first_quest', name: 'Quest Champion', emoji: '🏆' },
  first_project: { id: 'first_project', name: 'Goal Getter', emoji: '🎯' },
  first_goal: { id: 'first_goal', name: 'Aim High', emoji: '⭐' },
  level_5: { id: 'level_5', name: 'Power Learner', emoji: '🚀' },
};

export default function LiveLevelBadges() {
  const prog = useProgression();
  if (!prog?.isLoaded) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 animate-pulse h-24" />
    );
  }

  const { levelProgress, badgesEarned } = prog;
  const recentBadges = badgesEarned
    .map(b => ({ ...BADGE_META[b.badge_id], earned_at: b.earned_at }))
    .filter(Boolean)
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
    .slice(0, 4);

  return (
    <Link
      href="/achievements"
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-5 items-center">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cta-400 to-cta-600 flex items-center justify-center shadow-sm">
              <span className="text-2xl font-bold text-ink dark:text-slate-900">{levelProgress.level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">
              LV
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="font-bold text-ink dark:text-slate-200">Level {levelProgress.level}</h3>
              <span className="text-sm text-slate-500">&middot; {prog.totalXp.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-3 max-w-md">
              <div className="flex-1 h-2 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cta to-cta-600 transition-all duration-500"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {levelProgress.xpToNext} XP to L{levelProgress.level + 1}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recentBadges.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {recentBadges.map(b => (
                  <div
                    key={b.id}
                    className="w-9 h-9 rounded-full bg-cta-50 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-lg shadow-sm"
                    title={b.name}
                  >
                    {b.emoji}
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
                {badgesEarned.length} {badgesEarned.length === 1 ? 'badge' : 'badges'}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">
              <Award className="w-4 h-4 inline mr-1" />
              Earn your first badge
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
