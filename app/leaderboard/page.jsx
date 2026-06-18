'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { useProfile } from '@/components/profile-provider';
import Avatar from '@/components/avatar';
import { getLevelTitle } from '@/lib/level-titles';
import { resolveLearnerId } from '@/lib/learner-id';
import { Trophy, Sparkles, Users, Crown, Loader2 } from 'lucide-react';

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

export default function LeaderboardPage() {
  const { profile } = useProfile();
  const userDept = profile?.department || null;
  const myId = profile ? resolveLearnerId(profile) : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const people = data?.people || [];
  const departments = data?.departments || [];
  const championSet = new Set(data?.championIds || []);

  // Show the top 25, but always include the current user's row.
  const topPeople = people.slice(0, 25);
  const myRankIndex = people.findIndex((p) => p.learnerId === myId);
  const showMyRow = myRankIndex >= 25;

  return (
    <div data-tour="page-leaderboard" className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader icon={Trophy} title="Leaderboard" subtitle="Who's leveling up — and who wears the crown" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ── Individual leaderboard ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-ink dark:text-slate-200">Top Learners</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Top of each department wears the crown 👑
            </span>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card p-10 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading rankings…
            </div>
          ) : people.length === 0 ? (
            <EmptyCard
              icon={Trophy}
              title="No rankings yet"
              sub="Rankings appear as people complete lessons and earn XP."
            />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card divide-y divide-slate-100 dark:divide-slate-700">
              {topPeople.map((p, i) => (
                <PersonRow
                  key={p.learnerId}
                  person={p}
                  rank={i + 1}
                  isChampion={championSet.has(p.learnerId)}
                  isMe={p.learnerId === myId}
                />
              ))}
              {showMyRow && (
                <>
                  <div className="px-4 py-1 text-center text-xs text-slate-400">···</div>
                  <PersonRow
                    person={people[myRankIndex]}
                    rank={myRankIndex + 1}
                    isChampion={championSet.has(myId)}
                    isMe
                  />
                </>
              )}
            </div>
          )}
        </section>

        {/* ── Department leaderboard ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-ink dark:text-slate-200">Department Leaderboard</h2>
          </div>

          {!loading && departments.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-bg-subtle text-left text-xs text-ink/50 dark:text-slate-300/50 uppercase tracking-wide">
                    <th className="px-4 py-3 w-16">Rank</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-center">Learners</th>
                    <th className="px-4 py-3 text-right">Total XP</th>
                    <th className="px-4 py-3 text-center">Avg Level</th>
                    <th className="px-4 py-3">Champion 👑</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => {
                    const isUser = dept.name === userDept;
                    const isTop3 = dept.rank <= 3;
                    const rowBg = isUser
                      ? 'bg-brand-50 dark:bg-slate-700/50 border-l-4 border-brand'
                      : dept.rank % 2 === 0 ? 'bg-bg-warm dark:bg-slate-900' : 'bg-white dark:bg-slate-800';
                    return (
                      <tr key={dept.name} className={`${rowBg} transition-colors`}>
                        <td className="px-4 py-3 text-center text-base">{isTop3 ? MEDAL[dept.rank] : dept.rank}</td>
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
          ) : !loading ? (
            <EmptyCard icon={Users} title="No department data yet" sub="Departments appear as teammates earn XP." />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function PersonRow({ person, rank, isChampion, isMe }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-brand-50 dark:bg-slate-700/50' : ''}`}>
      <div className="w-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {MEDAL[rank] || rank}
      </div>
      <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
        <Avatar avatar={person.avatar} size={40} crown={isChampion} title={person.name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink dark:text-slate-200 truncate">{person.name}</span>
          {isMe && (
            <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide">You</span>
          )}
          {isChampion && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {getLevelTitle(person.level)} · Level {person.level} · {person.department}
        </div>
      </div>
      <div className="text-sm font-bold text-ink dark:text-slate-200 shrink-0">
        {person.totalXp.toLocaleString()} XP
      </div>
    </div>
  );
}

function EmptyCard({ icon: Icon, title, sub }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card p-10 text-center">
      <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-ink dark:text-slate-200 mb-1">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  );
}
