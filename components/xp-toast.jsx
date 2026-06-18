'use client';

import { useState, useEffect } from 'react';
import { Zap, Award, TrendingUp, Flame } from 'lucide-react';
import { getLevelTitle } from '@/lib/level-titles';

const BADGE_META = {
  first_lesson: { name: 'First Steps', emoji: '🎓' },
  three_lessons: { name: 'Getting Going', emoji: '📚' },
  ten_lessons: { name: 'Bookworm', emoji: '🤓' },
  three_day_streak: { name: 'On Fire', emoji: '🔥' },
  seven_day_streak: { name: 'Unstoppable', emoji: '⚡' },
  first_quiz: { name: 'Pop Quiz', emoji: '✏️' },
  quiz_master: { name: 'Quiz Master', emoji: '💯' },
  first_quest: { name: 'Quest Champion', emoji: '🏆' },
  first_project: { name: 'Goal Getter', emoji: '🎯' },
  first_goal: { name: 'Aim High', emoji: '⭐' },
  first_game: { name: 'Game On', emoji: '🎮' },
  five_games: { name: 'High Scorer', emoji: '🕹️' },
  level_5: { name: 'Power Learner', emoji: '🚀' },
  level_10: { name: 'Double Digits', emoji: '🔟' },
  level_25: { name: 'Quarter Way', emoji: '🌟' },
  level_50: { name: 'Halfway Hero', emoji: '🏔️' },
};

export default function XpToast({ result, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!result) return;
    const showTimer = setTimeout(() => setVisible(true), 300);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 400);
    }, 5000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [result, onDismiss]);

  if (!result) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 transition-all duration-400 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5 min-w-[280px] max-w-[340px]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-cta-50 dark:bg-cta-900/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-cta-600" />
          </div>
          <div>
            {result.welcome && (
              <div className="text-xs font-semibold text-brand-600 dark:text-brand-300 uppercase tracking-wide">
                Welcome aboard!
              </div>
            )}
            <div className="text-2xl font-extrabold text-ink dark:text-slate-100 leading-tight">
              +{result.xpAwarded} XP
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {(result.totalXp ?? 0).toLocaleString()} XP total
            </div>
          </div>
        </div>

        {result.leveledUp && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg mb-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              Level Up! You&apos;re now {getLevelTitle(result.level)} (Level {result.level})
            </span>
          </div>
        )}

        {result.streak >= 2 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {result.streak} day streak! +10 bonus XP
            </span>
          </div>
        )}

        {result.newBadges?.length > 0 && (
          <div className="space-y-2 mt-2">
            {result.newBadges.map(badgeId => {
              const meta = BADGE_META[badgeId];
              if (!meta) return null;
              return (
                <div
                  key={badgeId}
                  className="flex items-center gap-2 px-3 py-2 bg-cta-50 dark:bg-cta-900/20 rounded-lg"
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold text-cta-700 dark:text-cta-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Badge Earned!
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{meta.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
