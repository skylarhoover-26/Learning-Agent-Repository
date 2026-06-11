'use client';

import Link from 'next/link';
import { useProgression } from './progression-provider';
import XpExplainer from './xp-explainer';
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
      <div className="bg-gradient-to-br from-cta-400 to-cta-600 rounded-2xl shadow-card p-6 animate-pulse h-24 opacity-70" />
    );
  }

  const { levelProgress, badgesEarned } = prog;
  const recentBadges = badgesEarned
    .map(b => ({ ...BADGE_META[b.badge_id], earned_at: b.earned_at }))
    .filter(Boolean)
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
    .slice(0, 4);

  return (
    <div className="group relative bg-gradient-to-br from-cta-400 to-cta-600 rounded-2xl shadow-card hover:shadow-card-hover p-6 transition-all">
      <Link href="/achievements" aria-label="View achievements and badges" className="absolute inset-0 z-0 rounded-2xl" />
      <div className="relative z-10 pointer-events-none grid grid-cols-1 md:grid-cols-[1fr,auto] gap-5 items-center">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <span className="text-2xl font-bold text-ink">{levelProgress.level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              LV
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="font-bold text-ink">Level {levelProgress.level}</h3>
            </div>
            <div className="flex items-center gap-3 max-w-md">
              <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <span className="text-xs text-ink/70 shrink-0">
                {levelProgress.xpToNext} XP to L{levelProgress.level + 1}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/25 text-xs font-semibold text-ink">
                {prog.totalXp.toLocaleString()} XP
              </span>
              <span className="pointer-events-auto">
                <XpExplainer />
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
                    className="w-9 h-9 rounded-full bg-white/25 ring-2 ring-white/40 flex items-center justify-center text-lg shadow-sm"
                    title={b.name}
                  >
                    {b.emoji}
                  </div>
                ))}
              </div>
              <div className="text-sm text-ink/70 hidden sm:block">
                {badgesEarned.length} {badgesEarned.length === 1 ? 'badge' : 'badges'}
              </div>
            </>
          ) : (
            <div className="text-sm text-ink/70">
              <Award className="w-4 h-4 inline mr-1" />
              Earn your first badge
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-ink/50 group-hover:text-ink group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}
