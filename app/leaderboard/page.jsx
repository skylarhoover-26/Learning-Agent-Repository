'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { getProfileClient } from '@/lib/profile-client';
import {
  Trophy, TrendingUp, ArrowUp, Sparkles, AlertCircle,
  BookOpen, Shield, Clock, Users,
} from 'lucide-react';

const DEPARTMENTS = [
  { rank: 1, name: 'Customer Success', learners: 12, totalXp: 14820, avgLevel: 2.8, topPerformer: 'Sarah M.' },
  { rank: 2, name: 'Sales', learners: 8, totalXp: 12840, avgLevel: 2.1, topPerformer: 'Jake T.' },
  { rank: 3, name: 'Engineering', learners: 7, totalXp: 11560, avgLevel: 3.5, topPerformer: 'Chen W.' },
  { rank: 4, name: 'Analytics', learners: 4, totalXp: 10240, avgLevel: 3.1, topPerformer: 'Priya K.' },
  { rank: 5, name: 'Enablement', learners: 5, totalXp: 8740, avgLevel: 3.1, topPerformer: 'Skylar H.' },
  { rank: 6, name: 'Marketing', learners: 6, totalXp: 7650, avgLevel: 2.3, topPerformer: 'Lisa P.' },
  { rank: 7, name: 'Product', learners: 3, totalXp: 6200, avgLevel: 2.5, topPerformer: 'Amanda R.' },
  { rank: 8, name: 'People', learners: 4, totalXp: 5100, avgLevel: 1.8, topPerformer: 'Maria L.' },
  { rank: 9, name: 'Finance', learners: 3, totalXp: 4300, avgLevel: 1.5, topPerformer: 'David K.' },
  { rank: 10, name: 'Strategy & Ops', learners: 2, totalXp: 3800, avgLevel: 2.0, topPerformer: 'Tom B.' },
  { rank: 11, name: 'Executive', learners: 2, totalXp: 2100, avgLevel: 1.2, topPerformer: 'Devon K.' },
];

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

const UPDATES = [
  {
    tag: 'DIRECT IMPACT',
    tagColor: 'bg-red-100 text-red-700',
    borderColor: 'border-red-400',
    icon: AlertCircle,
    title: 'GPT-5 reasoning controls change customer reply tone',
    description: 'Sales reps using AI drafts saw 18% better reply rates after switching to reasoning_effort: low for short messages.',
    affects: 'Customer Communications',
    readTime: 4,
    topic: 'gpt5-reasoning-controls',
  },
  {
    tag: 'UPDATED FOR YOU',
    tagColor: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-400',
    icon: BookOpen,
    title: "Anthropic's agent SDK replaces our old tool-call patterns",
    description: "The 'build a tool' lesson you started 2 weeks ago has been rewritten — your progress carried over.",
    affects: 'AI Agents & Tools',
    readTime: 6,
    topic: 'anthropic-agent-sdk',
  },
  {
    tag: 'HEADS UP',
    tagColor: 'bg-amber-100 text-amber-700',
    borderColor: 'border-amber-400',
    icon: Shield,
    title: 'New PII detection rules from NIST affect AI compliance',
    description: 'We added 1 question to your next drill so your score reflects the new one.',
    affects: 'Data Privacy & PII',
    readTime: 3,
    topic: 'nist-pii-detection',
  },
];

function getRankMedal(rank) {
  return MEDAL[rank] || `${rank}`;
}

export default function LeaderboardPage() {
  const [userDept, setUserDept] = useState(null);

  useEffect(() => {
    try {
      const profile = getProfileClient();
      if (profile?.department) {
        setUserDept(profile.department);
      }
    } catch {
      // cookie not set — no highlight
    }
  }, []);

  const userRow = DEPARTMENTS.find((d) => d.name === userDept);
  const userRank = userRow?.rank ?? null;

  return (
    <div className="min-h-screen bg-bg-warm">
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
            <h2 className="text-lg font-bold text-ink">Department Leaderboard</h2>
          </div>

          <div className="bg-white rounded-xl shadow-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-bg-subtle text-left text-xs text-ink/50 uppercase tracking-wide">
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
                      ? 'bg-bg-warm'
                      : 'bg-white';

                  return (
                    <tr key={dept.rank} className={`${rowBg} transition-colors`}>
                      <td className="px-4 py-3 text-center text-base">
                        {isTop3 ? getRankMedal(dept.rank) : dept.rank}
                      </td>
                      <td className={`px-4 py-3 ${isTop3 ? 'font-bold' : 'font-medium'} text-ink`}>
                        <span className="flex items-center gap-2">
                          {dept.name}
                          {isUser && (
                            <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide">
                              Your Team
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink/70">{dept.learners}</td>
                      <td className={`px-4 py-3 text-right ${isTop3 ? 'font-bold text-ink' : 'text-ink/70'}`}>
                        {dept.totalXp.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-ink/70">{dept.avgLevel.toFixed(1)}</td>
                      <td className="px-4 py-3 text-ink/70">{dept.topPerformer}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary below table */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {userRank && (
              <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-4 py-2.5">
                <Trophy className="w-4 h-4 text-brand" />
                <span className="text-sm font-medium text-ink">
                  Your team is ranked <span className="font-bold">#{userRank}</span> of 11
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
              <ArrowUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Up 2 ranks this month</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: What Changed This Week ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-ink">What Changed This Week</h2>
          </div>

          <div className="space-y-4">
            {UPDATES.map((update) => {
              const CardIcon = update.icon;
              return (
                <div
                  key={update.topic}
                  className={`bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow border-l-4 ${update.borderColor} p-5`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-pill mb-2 ${update.tagColor}`}>
                        {update.tag}
                      </span>
                      <h3 className="font-bold text-ink text-[15px] leading-snug mb-1">
                        {update.title}
                      </h3>
                      <p className="text-sm text-ink/60 leading-relaxed mb-3">
                        {update.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-brand font-medium">
                          <CardIcon className="w-3.5 h-3.5" />
                          Affects: {update.affects}
                        </span>
                        <span className="flex items-center gap-1 text-ink/40">
                          <Clock className="w-3.5 h-3.5" />
                          {update.readTime} min read
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/lesson?topic=${update.topic}`}
                      className="shrink-0 text-xs font-semibold text-brand hover:text-brand-600 flex items-center gap-1 mt-1"
                    >
                      Read more
                      <TrendingUp className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto-refreshed badge */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-white border border-bg-subtle rounded-pill px-4 py-2 text-xs text-ink/50">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Auto-refreshed weekly
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
