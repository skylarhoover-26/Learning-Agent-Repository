'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { XP_AMOUNTS, LESSON_MAX_XP, DAILY_CAPS } from '@/lib/progression';
import { xpForNextLevel } from '@/lib/level-curve';
import { getLevelTitle } from '@/lib/level-titles';
import { QUESTS } from '@/lib/quest-data';
import { Zap, TrendingUp } from 'lucide-react';

// Cumulative XP needed to *reach* a level, computed from the live curve.
function totalXpForLevel(target) {
  let acc = 0;
  for (let l = 1; l < target; l += 1) acc += xpForNextLevel(l);
  return acc;
}

export default function XpRulesPage() {
  return <CinematicFrame><XpRulesPageInner /></CinematicFrame>;
}

function XpRulesPageInner() {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <Shell><p className="text-center text-slate-500 py-10">Checking…</p></Shell>;
  if (!allowed) return <Shell><p className="text-center text-slate-500 py-10">Admins only.</p></Shell>;

  const questRewards = QUESTS.map((q) => q.xpReward).filter((n) => typeof n === 'number');
  const questMin = questRewards.length ? Math.min(...questRewards) : 0;
  const questMax = questRewards.length ? Math.max(...questRewards) : 0;

  const rows = [
    { action: 'First login (welcome bonus)', xp: `+${XP_AMOUNTS.first_login}`, note: 'Once, ever' },
    { action: 'Finish a Quick Tip', xp: `+${XP_AMOUNTS.quick_tip}`, note: 'Completion only — no quiz' },
    { action: 'Complete a Quick Lesson', xp: `up to +${LESSON_MAX_XP.standard}`, note: 'Scaled by % correct on the checkpoint quiz' },
    { action: 'Complete a Deep Dive', xp: `up to +${LESSON_MAX_XP.deep_dive}`, note: 'Scaled by % correct on the checkpoint quiz' },
    { action: 'Complete a Project Quest', xp: questMin === questMax ? `+${questMax}` : `+${questMin}–${questMax}`, note: 'Set per quest' },
    { action: 'Finish a learning Game', xp: `+${XP_AMOUNTS.game_complete}`, note: `First ${DAILY_CAPS.game_complete} per day` },
    { action: 'Chat with the AI coach', xp: `+${XP_AMOUNTS.chat_message}`, note: `First ${DAILY_CAPS.chat_message} messages per day` },
    { action: 'Answer a review card correctly', xp: '+5', note: `First ${DAILY_CAPS.review_correct} per day` },
    { action: 'Daily streak bonus', xp: `+${XP_AMOUNTS.streak_day}`, note: 'Once per day on a 2+ day streak' },
    { action: 'Repeat a lesson you already did', xp: '+0', note: 'No double XP for the same topic' },
    { action: 'Admin grant', xp: 'Any', note: 'Granted by an admin; recorded with reason' },
  ];

  const milestones = [2, 5, 10, 20, 30, 40, 50, 75, 100];

  return (
    <Shell>
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-8">
        {/* Earning XP */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink dark:text-slate-200 mb-4">
            <Zap className="w-5 h-5 text-cta-600" /> How learners earn XP
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">XP</th>
                  <th className="py-2">Cap / notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.action} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2.5 pr-4 font-medium text-ink dark:text-slate-200">{r.action}</td>
                    <td className="py-2.5 pr-4 font-semibold text-cta-700 dark:text-cta-300 whitespace-nowrap">{r.xp}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            These numbers come straight from the code (XP_AMOUNTS / DAILY_CAPS), so this page always matches what learners actually get.
          </p>
        </section>

        {/* Leveling */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink dark:text-slate-200 mb-2">
            <TrendingUp className="w-5 h-5 text-brand" /> Leveling
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Levels are infinite and get steeper after level 30, so high levels are a real badge of honor. Each level has its own playful title.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2">Total XP to reach</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((lvl) => (
                  <tr key={lvl} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2.5 pr-4 font-semibold text-ink dark:text-slate-200">{lvl}</td>
                    <td className="py-2.5 pr-4 text-ink dark:text-slate-300">{getLevelTitle(lvl)}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{totalXpForLevel(lvl).toLocaleString()} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={Zap} title="XP & Levels" subtitle="How XP and leveling work" />
      {children}
    </div>
  );
}
