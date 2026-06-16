'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { useProfile } from '@/components/profile-provider';
import {
  Trophy, TrendingUp, ArrowUp, Sparkles, AlertCircle,
  BookOpen, Shield, Clock, Users,
} from 'lucide-react';

const DEPARTMENTS = [];

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

const UPDATES = [];

function getRankMedal(rank) {
  return MEDAL[rank] || `${rank}`;
}

export default function LeaderboardPage() {
  const { profile } = useProfile();
  const userDept = profile?.department || null;

  const userRow = DEPARTMENTS.find((d) => d.name === userDept);
  const userRank = userRow?.rank ?? null;

  return (
    <div data-tour="page-leaderboard" className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Trophy}
        title="Leaderboard & Updates"
        subtitle="Department rankings and AI news"
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ── Section 1: Department Leaderboard ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-ink dark:text-slate-200">Department Leaderboard</h2>
          </div>

          {DEPARTMENTS.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-bg-subtle text-left text-xs text-ink/50 dark:text-slate-300/50 uppercase tracking-wide">
                    <th className="px-4 py-3 w-16">Rank</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-center">Learners</th>
                    <th className="px-4 py-3 text-right">Total XP</th>
                    <th className="px-4 py-3 text-center">Avg Level</th>
                    <th className="px-4 py-3">Top Performer</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((dept) => {
                    const isUser = dept.name === userDept;
                    const isTop3 = dept.rank <= 3;
                    const rowBg = isUser
                      ? 'bg-brand-50 border-l-4 border-brand'
                      : dept.rank % 2 === 0
                        ? 'bg-bg-warm dark:bg-slate-900'
                        : 'bg-white dark:bg-slate-800';
                    return (
                      <tr key={dept.rank} className={`${rowBg} transition-colors`}>
                        <td className="px-4 py-3 text-center text-base">
                          {isTop3 ? getRankMedal(dept.rank) : dept.rank}
                        </td>
                        <td className={`px-4 py-3 ${isTop3 ? 'font-bold' : 'font-medium'} text-ink dark:text-slate-200`}>
                          {dept.name}
                          {isUser && (
                            <span className="ml-2 text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide">
                              Your Team
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-ink/70 dark:text-slate-300/70">{dept.learners}</td>
                        <td className={`px-4 py-3 text-right ${isTop3 ? 'font-bold text-ink dark:text-slate-200' : 'text-ink/70'}`}>
                          {dept.totalXp.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-ink/70 dark:text-slate-300/70">{dept.avgLevel.toFixed(1)}</td>
                        <td className="px-4 py-3 text-ink/70 dark:text-slate-300/70">{dept.topPerformer}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card p-10 text-center">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink dark:text-slate-200 mb-1">No leaderboard data yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rankings will appear as team members complete lessons and earn XP.</p>
            </div>
          )}
        </section>

        {/* ── Section 2: What Changed This Week ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-ink dark:text-slate-200">What Changed This Week</h2>
          </div>

          {UPDATES.length > 0 ? (
            <div className="space-y-4">
              {UPDATES.map((update) => {
                const CardIcon = update.icon;
                return (
                  <div
                    key={update.topic}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-card hover:shadow-card-hover transition-shadow border-l-4 ${update.borderColor} p-5`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-pill mb-2 ${update.tagColor}`}>
                          {update.tag}
                        </span>
                        <h3 className="font-bold text-ink dark:text-slate-200 text-[15px] leading-snug mb-1">
                          {update.title}
                        </h3>
                        <p className="text-sm text-ink/60 dark:text-slate-300/60 leading-relaxed mb-3">
                          {update.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card p-10 text-center">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink dark:text-slate-200 mb-1">No updates yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Updates will appear when the curriculum pipeline detects relevant AI news.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
