'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllData } from '@/lib/learner-store';
import { getTotalXp, getLevel, getLevelProgress, calculateStreak, activityTimestamps, awardFirstLoginXp } from '@/lib/progression';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { onXp } from '@/lib/xp-bus';
import { hydrate, saveToBlob } from '@/lib/sync-store';

const ProgressionContext = createContext(null);

export function useProgression() {
  return useContext(ProgressionContext);
}

function buildStats(learnerId) {
  const { xpEvents, badgesEarned, lessonHistory } = getAllData(learnerId);
  const totalXp = getTotalXp(xpEvents);
  const level = getLevel(totalXp);

  return {
    learnerId,
    xpEvents,
    badgesEarned,
    lessonHistory: lessonHistory.sort(
      (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
    ),
    totalXp,
    level,
    levelProgress: getLevelProgress(totalXp),
    streak: calculateStreak(activityTimestamps(xpEvents, lessonHistory)),
  };
}

const EMPTY = {
  learnerId: null,
  xpEvents: [],
  badgesEarned: [],
  lessonHistory: [],
  totalXp: 0,
  level: 1,
  levelProgress: { level: 1, totalXp: 0, percent: 0, xpToNext: 100 },
  streak: 0,
  isLoaded: false,
  refresh: () => {},
};

export function ProgressionProvider({ children }) {
  const { profile } = useProfile();
  const [data, setData] = useState(EMPTY);
  // Holds a one-time welcome-bonus result so the global XP popup can celebrate
  // it. Cleared once shown.
  const [welcomeBonus, setWelcomeBonus] = useState(null);
  const bootstrapRef = useRef(null);

  const load = useCallback(() => {
    if (profile) {
      setData({ ...buildStats(resolveLearnerId(profile)), isLoaded: true, refresh: load });
    } else {
      setData({ ...EMPTY, isLoaded: true, refresh: load });
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-read progress whenever XP is awarded anywhere in the app (chat, game,
  // lesson, welcome bonus, admin grant). Without this, the hero/stats/Recent-XP
  // stay stale until a full reload while the (separately-fetched) leaderboard
  // already reflects the new total — which looks like XP went missing.
  useEffect(() => onXp(() => load()), [load]);

  // One-time per learner: restore progress from the blob backup when local is
  // empty, THEN award the one-time first-login bonus.
  //
  // Order is critical and is the fix for the "logout/new device reset my
  // progress" data-loss bug: awarding the bonus BEFORE hydrating reads an empty
  // local XP log, so the idempotent check misses and it re-grants 25 XP — then
  // that fresh, 25-XP-only history is synced back to the blob, permanently
  // destroying the learner's real progress. Hydrating first restores their data
  // (so the bonus is correctly skipped) and is also what brings progress back on
  // a new device or after a cleared cache.
  useEffect(() => {
    if (!profile) return;
    const learnerId = resolveLearnerId(profile);
    if (bootstrapRef.current === learnerId) return;
    bootstrapRef.current = learnerId;
    (async () => {
      // 0. Apply any pending admin reset FIRST — before hydrate/backup. This is
      //    load-bearing: otherwise the backup below re-uploads stale local data to
      //    the blob before the wipe runs, and the next hydrate restores it, which
      //    silently undoes the reset (why old badges/XP kept reappearing).
      let resetApplied = false;
      try {
        const res = await fetch('/api/xp-reset-epoch', { cache: 'no-store' });
        const { resetAt } = await res.json();
        const seen = Number(localStorage.getItem('lp_reset_seen') || 0);
        if (resetAt && resetAt > seen) {
          [
            `lp_xp_${learnerId}`, `lp_badges_${learnerId}`, `lp_lessons_${learnerId}`,
            'lp_paused_lessons', 'lp_notifications', 'lp_notifications_read_at',
            'learner_goals', 'learner_game_state', 'learner_chat_history',
            'learner_library_usage', 'learner_module_state',
            'calibration_profile', 'ai_impact_scores', 'ai_impact_snooze_until',
            'curriculum_findings', 'curriculum_proposals', 'curriculum_patches',
            'learner_lesson_state', 'lp_plan_lesson',
          ].forEach((k) => localStorage.removeItem(k));
          localStorage.setItem('lp_reset_seen', String(resetAt));
          // Force the blob backup empty too, so a blob dirtied by an earlier
          // pre-fix backup can't re-hydrate the wiped progress.
          try {
            saveToBlob(`lp_xp_${learnerId}`, []);
            saveToBlob(`lp_badges_${learnerId}`, []);
            saveToBlob(`lp_lessons_${learnerId}`, []);
          } catch { /* best-effort */ }
          resetApplied = true;
        }
      } catch { /* best-effort */ }

      // 1. Hydrate from the blob — skipped right after a reset (just cleared it).
      if (!resetApplied) {
        try {
          await Promise.all([
            hydrate(`lp_xp_${learnerId}`),
            hydrate(`lp_badges_${learnerId}`),
            hydrate(`lp_lessons_${learnerId}`),
          ]);
        } catch {
          // best-effort — fall through to whatever is in local storage
        }
      }
      load();
      const result = awardFirstLoginXp(learnerId);
      if (result) {
        load();
        setWelcomeBonus(result);
      }
      // Back the (now-hydrated) local progress up to the blob so the server-side
      // leaderboard reflects this learner's real total. `hydrate` above guarantees
      // local >= the blob backup, so this only ever brings the backup UP to date
      // — it can't wipe it — and it heals a backup that fell behind because an
      // earlier debounced sync was cancelled by navigation.
      try {
        const all = getAllData(learnerId);
        if (all.xpEvents.length) saveToBlob(`lp_xp_${learnerId}`, all.xpEvents);
        if (all.badgesEarned.length) saveToBlob(`lp_badges_${learnerId}`, all.badgesEarned);
        if (all.lessonHistory.length) saveToBlob(`lp_lessons_${learnerId}`, all.lessonHistory);
      } catch { /* best-effort backup */ }
    })();
  }, [profile, load]);

  // (The admin "Reset all progress" is now applied inside the bootstrap effect
  // above, before hydrate/backup, so a reset can't be undone by a stale backup.)

  const clearWelcomeBonus = useCallback(() => setWelcomeBonus(null), []);

  const value = { ...data, refresh: load, welcomeBonus, clearWelcomeBonus };

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
}
