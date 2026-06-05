'use client';

import Link from 'next/link';
import { useProgression } from './progression-provider';
import { ArrowLeft, Award, Sparkles } from 'lucide-react';

const ALL_BADGES = [
  { id: 'first_lesson', name: 'First Steps', emoji: '🎓', description: 'Complete your first lesson' },
  { id: 'three_lessons', name: 'Getting Going', emoji: '📚', description: 'Complete 3 lessons' },
  { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓', description: 'Complete 10 lessons' },
  { id: 'three_day_streak', name: 'On Fire', emoji: '🔥', description: 'Learn 3 days in a row' },
  { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡', description: 'Learn 7 days in a row' },
  { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️', description: 'Answer your first quiz question' },
  { id: 'quiz_master', name: 'Quiz Master', emoji: '💯', description: 'Get 10 quiz answers correct' },
  { id: 'first_quest', name: 'Quest Champion', emoji: '🏆', description: 'Complete your first project quest' },
  { id: 'first_project', name: 'Goal Getter', emoji: '🎯', description: 'Add your first work project' },
  { id: 'first_goal', name: 'Aim High', emoji: '⭐', description: 'Set your first learning goal' },
  { id: 'level_5', name: 'Power Learner', emoji: '🚀', description: 'Reach Level 5' },
];

export default function AchievementsLive() {
  const prog = useProgression();

  if (!prog?.isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { levelProgress, totalXp, badgesEarned, lessonHistory } = prog;
  const earnedIds = new Set(badgesEarned.map(b => b.badge_id));

  const badgesWithStatus = ALL_BADGES.map(b => ({
    ...b,
    earned: earnedIds.has(b.id),
    earned_at: badgesEarned.find(e => e.badge_id === b.id)?.earned_at,
  }));

  return (
    <div className="min-h-screen">
      <header className="bg-ink sticky top-0 z-10 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Award className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-[17px] leading-tight">Achievements</h1>
              <p className="text-xs text-white/60">Your progress and badges</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-br from-cta-400 to-cta-600 rounded-2xl p-8 mb-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/20 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl font-bold text-ink dark:text-slate-200">{levelProgress.level}</span>
          </div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1">Level {levelProgress.level}</h2>
          <p className="text-ink/70 dark:text-slate-300/70 mb-4">{totalXp.toLocaleString()} XP total</p>
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white dark:bg-slate-800 transition-all duration-500 rounded-full"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-ink dark:text-slate-200">{levelProgress.xpToNext} XP to go</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink dark:text-slate-200">Badges</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {badgesEarned.length} / {ALL_BADGES.length} earned
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lessonHistory.length} lesson{lessonHistory.length !== 1 ? 's' : ''} completed
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badgesWithStatus.map(badge => (
            <div
              key={badge.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 text-center transition-all ${
                badge.earned
                  ? 'border-cta-200 shadow-card'
                  : 'border-slate-200 dark:border-slate-700 opacity-50 grayscale'
              }`}
            >
              <div className="text-4xl mb-2">{badge.emoji}</div>
              <h4 className="font-bold text-ink dark:text-slate-200 text-sm mb-1">{badge.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
              {badge.earned && (
                <div className="mt-2">
                  <div className="inline-flex items-center gap-1 text-xs text-cta-700 dark:text-cta-300 font-medium">
                    <Sparkles className="w-3 h-3" />
                    Earned
                  </div>
                  {badge.earned_at && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(badge.earned_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
