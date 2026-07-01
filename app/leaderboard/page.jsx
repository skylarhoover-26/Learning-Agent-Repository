'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { useProfile } from '@/components/profile-provider';
import Avatar from '@/components/avatar';
import { getLevelTitle } from '@/lib/level-titles';
import { resolveLearnerId } from '@/lib/learner-id';
import { Trophy, Sparkles, Users, Crown, Loader2 } from 'lucide-react';
import { crownTierFromIds, CROWN_ICON_CLASS } from '@/lib/crown';

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

export default function LeaderboardPage() {
  const { profile } = useProfile();
  const userDept = profile?.department || null;
  const myId = profile ? resolveLearnerId(profile) : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Default to the ego-centered "Near me" view; "All" shows the full ranking.
  const [view, setView] = useState('near');

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
  const championIds = data?.championIds || [];
  const tierOf = (id) => crownTierFromIds(id, championIds);

  // Top 3 go on the podium; everyone from rank 4 down is the "rest" list below.
  const podium = people.slice(0, 3);
  const rest = people.slice(3);
  const myRankIndex = people.findIndex((p) => p.learnerId === myId);

  // The rows shown under the podium depend on the toggle. In "Near me" we show a
  // window of ±3 ranks centered on the user (clamped into the rest list); if the
  // user is on the podium or unranked, we just show the first chunk of the rest.
  let listRows;
  if (view === 'all') {
    listRows = rest.map((p, i) => ({ person: p, rank: i + 4 }));
  } else if (myRankIndex >= 3) {
    const start = Math.max(3, myRankIndex - 3);
    const end = Math.min(people.length, myRankIndex + 4);
    listRows = people.slice(start, end).map((p, i) => ({ person: p, rank: start + i + 1 }));
  } else {
    listRows = rest.slice(0, 7).map((p, i) => ({ person: p, rank: i + 4 }));
  }

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
              The top 3 wear crowns 👑 — climb the ranks to take one
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
            <div className="space-y-4">
              <Podium people={podium} tierOf={tierOf} myId={myId} />

              {rest.length > 0 && (
                <>
                  {/* Near me / All toggle */}
                  <div className="flex justify-center">
                    <div className="inline-flex rounded-pill bg-slate-100 dark:bg-slate-800 p-1">
                      <button
                        onClick={() => setView('near')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-pill transition-colors ${
                          view === 'near'
                            ? 'bg-white dark:bg-slate-700 text-ink dark:text-slate-100 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Near me
                      </button>
                      <button
                        onClick={() => setView('all')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-pill transition-colors ${
                          view === 'all'
                            ? 'bg-white dark:bg-slate-700 text-ink dark:text-slate-100 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card divide-y divide-slate-100 dark:divide-slate-700">
                    {listRows.map(({ person, rank }) => (
                      <PersonRow
                        key={person.learnerId}
                        person={person}
                        rank={rank}
                        crownTier={tierOf(person.learnerId)}
                        isMe={person.learnerId === myId}
                      />
                    ))}
                    {view === 'near' && myRankIndex === -1 && (
                      <div className="px-4 py-3 text-center text-xs text-slate-400">
                        You&rsquo;re not ranked yet — earn XP to join the board.
                      </div>
                    )}
                  </div>
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
                    <th className="px-4 py-3">Top Performer</th>
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

// Gold / silver / bronze styling for the three podium spots. `cta` is the app's
// gold. Heights, ring glow, pedestal gradient and entrance delay scale by rank.
const PODIUM_STYLE = {
  1: {
    crown: 'text-cta-500', medal: '🥇', avatar: 76, delay: '0.12s',
    ring: 'ring-cta-400 dark:ring-cta-500',
    glow: 'shadow-[0_0_30px_-4px_rgba(255,183,6,0.75)]',
    ped: 'h-28 bg-gradient-to-b from-cta-300 to-cta-500', shine: true,
  },
  2: {
    crown: 'text-slate-400', medal: '🥈', avatar: 58, delay: '0s',
    ring: 'ring-slate-300 dark:ring-slate-400', glow: '',
    ped: 'h-20 bg-gradient-to-b from-slate-200 to-slate-400', shine: false,
  },
  3: {
    crown: 'text-amber-700', medal: '🥉', avatar: 58, delay: '0.24s',
    ring: 'ring-orange-400 dark:ring-orange-500', glow: '',
    ped: 'h-14 bg-gradient-to-b from-orange-300 to-amber-700', shine: false,
  },
};

function PodiumSpot({ person, rank, tier, isMe }) {
  if (!person) return <div />;
  const s = PODIUM_STYLE[rank];
  return (
    <div className="flex flex-col items-center justify-end animate-podium-rise" style={{ animationDelay: s.delay }}>
      {/* Crown — only when they actually rank (XP > 0). #1 floats + glows. */}
      <div className="h-7 flex items-end">
        {tier > 0 && (
          <Crown
            className={`w-7 h-7 ${s.crown} fill-current ${rank === 1 ? 'animate-crown-float drop-shadow-[0_2px_6px_rgba(255,183,6,0.6)]' : ''}`}
          />
        )}
      </div>

      <div className={`mt-1 rounded-full ring-4 ${s.ring} ${s.glow} bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800`}>
        <Avatar avatar={person.avatar} size={s.avatar} crown={tier} title={person.name} />
      </div>

      <div className="mt-2 text-center max-w-[130px]">
        <div className="flex items-center justify-center gap-1">
          <span className={`font-bold text-ink dark:text-slate-200 truncate ${rank === 1 ? 'text-base' : 'text-sm'}`}>
            {person.name?.split(' ')[0]}
          </span>
          {isMe && (
            <span className="text-[9px] font-bold bg-brand text-white px-1 py-0.5 rounded-pill uppercase tracking-wide">You</span>
          )}
        </div>
        <div className={`font-semibold ${rank === 1 ? 'text-cta-700 dark:text-cta-400 text-sm' : 'text-xs text-slate-500 dark:text-slate-400'}`}>
          {(person.totalXp || 0).toLocaleString()} XP
        </div>
      </div>

      {/* Pedestal: gradient block with a big rank numeral; #1 gets a sweeping sheen. */}
      <div className={`relative overflow-hidden mt-2 w-full ${s.ped} rounded-t-xl flex items-start justify-center pt-2 shadow-inner ${s.shine ? 'podium-shine' : ''}`}>
        <span className="text-2xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">{rank}</span>
      </div>
    </div>
  );
}

// A few decorative sparkles behind the winner.
function Sparkle({ className, delay }) {
  return (
    <span
      className={`pointer-events-none absolute text-cta-400 animate-sparkle ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden
    >
      ✦
    </span>
  );
}

// Flashy 2–1–3 podium for the top three, tallest in the middle, on a gradient
// stage with a spotlight glow behind #1.
function Podium({ people, tierOf, myId }) {
  const first = people[0];
  const second = people[1];
  const third = people[2];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cta-100 dark:border-slate-700 bg-gradient-to-b from-cta-50 via-white to-brand-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 p-5 sm:p-6 shadow-card">
      {/* Spotlight glow behind the winner */}
      <div className="pointer-events-none absolute left-1/2 -top-10 -translate-x-1/2 w-64 h-64 rounded-full bg-cta-200/50 dark:bg-cta-500/10 blur-3xl" />
      <Sparkle className="top-3 left-[30%] text-lg" delay="0s" />
      <Sparkle className="top-6 right-[28%] text-sm" delay="0.6s" />
      <Sparkle className="top-2 right-[40%] text-xs" delay="1.1s" />

      <div className="relative grid grid-cols-3 gap-2 sm:gap-5 items-end max-w-lg mx-auto">
        <PodiumSpot person={second} rank={2} tier={tierOf(second?.learnerId)} isMe={second?.learnerId === myId} />
        <PodiumSpot person={first} rank={1} tier={tierOf(first?.learnerId)} isMe={first?.learnerId === myId} />
        <PodiumSpot person={third} rank={3} tier={tierOf(third?.learnerId)} isMe={third?.learnerId === myId} />
      </div>
    </div>
  );
}

function PersonRow({ person, rank, crownTier = 0, isMe }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-brand-50 dark:bg-slate-700/50' : ''}`}>
      <div className="w-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {MEDAL[rank] || rank}
      </div>
      <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
        <Avatar avatar={person.avatar} size={40} crown={crownTier} title={person.name} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink dark:text-slate-200 truncate">{person.name}</span>
          {isMe && (
            <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide">You</span>
          )}
          {crownTier > 0 && <Crown className={`w-3.5 h-3.5 shrink-0 ${CROWN_ICON_CLASS[crownTier]}`} />}
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
