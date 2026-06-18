'use client';

import Link from 'next/link';
import { useProgression } from './progression-provider';
import { getLevelTitle } from '@/lib/level-titles';
import { ArrowLeft, Award, Sparkles, TrendingUp } from 'lucide-react';

const XP_SOURCE_LABELS = {
  first_login: 'Welcome bonus',
  lesson_complete: 'Lesson completed',
  quick_tip: 'Quick tip finished',
  quick_lesson: 'Quick lesson completed',
  deep_dive: 'Deep dive completed',
  game_complete: 'Game completed',
  quiz_correct: 'Quiz answered',
  streak_day: 'Daily streak',
  project_milestone: 'Project milestone',
  goal_set: 'Goal set',
  quest_complete: 'Quest completed',
  chat: 'Chatted with the coach',
  chat_message: 'Chatted with the coach',
  review_correct: 'Review answered',
  admin_grant: 'Granted by an admin',
  admin_correction: 'Balance adjusted',
};

function xpSourceLabel(source) {
  if (XP_SOURCE_LABELS[source]) return XP_SOURCE_LABELS[source];
  if (!source) return 'Experience earned';
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ALL_BADGES = [
  { id: 'first_lesson', name: 'First Steps', emoji: '🎓', description: 'Complete your first lesson', href: '/lesson' },
  { id: 'three_lessons', name: 'Getting Going', emoji: '📚', description: 'Complete 3 lessons', href: '/lesson' },
  { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓', description: 'Complete 10 lessons', href: '/lesson' },
  { id: 'three_day_streak', name: 'On Fire', emoji: '🔥', description: 'Learn 3 days in a row', href: '/lesson' },
  { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡', description: 'Learn 7 days in a row', href: '/lesson' },
  { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️', description: 'Answer your first quiz question', href: '/lesson' },
  { id: 'quiz_master', name: 'Quiz Master', emoji: '💯', description: 'Get 10 quiz answers correct', href: '/lesson' },
  { id: 'first_quest', name: 'Quest Champion', emoji: '🏆', description: 'Complete your first project quest', href: '/quests' },
  { id: 'first_project', name: 'Goal Getter', emoji: '🎯', description: 'Add your first work project', href: '/projects' },
  { id: 'first_goal', name: 'Aim High', emoji: '⭐', description: 'Set your first learning goal', href: '/goals' },
  { id: 'first_game', name: 'Game On', emoji: '🎮', description: 'Play your first learning game', href: '/games' },
  { id: 'five_games', name: 'High Scorer', emoji: '🕹️', description: 'Play 5 learning games', href: '/games' },
  { id: 'level_5', name: 'Power Learner', emoji: '🚀', description: 'Reach Level 5', href: '/lesson' },
  { id: 'level_10', name: 'Double Digits', emoji: '🔟', description: 'Reach Level 10', href: '/lesson' },
  { id: 'level_25', name: 'Quarter Way', emoji: '🌟', description: 'Reach Level 25', href: '/lesson' },
  { id: 'level_50', name: 'Halfway Hero', emoji: '🏔️', description: 'Reach Level 50', href: '/lesson' },
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

  const { levelProgress, totalXp, badgesEarned, lessonHistory, xpEvents } = prog;
  const earnedIds = new Set(badgesEarned.map(b => b.badge_id));

  const recentXp = (xpEvents || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  const badgesWithStatus = ALL_BADGES.map(b => ({
    ...b,
    earned: earnedIds.has(b.id),
    earned_at: badgesEarned.find(e => e.badge_id === b.id)?.earned_at,
  }));

  return (
    <div data-tour="page-achievements" className="min-h-screen">
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8 mb-8 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cta-400 to-cta-600 mx-auto mb-4 flex items-center justify-center shadow-sm">
            <span className="text-4xl font-bold text-ink dark:text-slate-900">{levelProgress.level}</span>
          </div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1">{getLevelTitle(levelProgress.level)}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Level {levelProgress.level} · {totalXp.toLocaleString()} XP total</p>
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cta to-cta-600 transition-all duration-500 rounded-full"
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
            <Link
              key={badge.id}
              href={badge.href}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 text-center transition-all hover:scale-[1.03] hover:shadow-lg ${
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
            </Link>
          ))}
        </div>

        {/* Recent XP — at the bottom of the page */}
        {recentXp.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand" />
              <h3 className="text-lg font-bold text-ink dark:text-slate-200">Recent XP</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card divide-y divide-slate-100 dark:divide-slate-700">
              {recentXp.map((e, i) => {
                const isAdmin = e.source === 'admin_grant' || e.source === 'admin_correction';
                const reason = e.meta?.reason;
                const by = e.meta?.by;
                const negative = (e.amount || 0) < 0;
                return (
                  <div key={e.id || i} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink dark:text-slate-200">{xpSourceLabel(e.source)}</p>
                      {isAdmin && reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">“{reason}”</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {isAdmin && by ? `by ${by}` : ''}
                        {isAdmin && by && e.created_at ? ' · ' : ''}
                        {e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${negative ? 'text-red-500' : 'text-cta-600 dark:text-cta-300'}`}>
                      {negative ? '' : '+'}{e.amount} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
