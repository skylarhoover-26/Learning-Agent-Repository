'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/avatar';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { crownTierFromIds, CROWN_ICON_CLASS } from '@/lib/crown';
import { Crown, Loader2 } from 'lucide-react';

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

// Top 5 individual learners on the homepage card, with crowns on the top 3
// (gold/silver/bronze). Reuses the shared /api/leaderboard data.
export default function HomeLeaderboard() {
  const { profile } = useProfile();
  const myId = profile ? resolveLearnerId(profile) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const allPeople = data?.people || [];
  const people = allPeople.slice(0, 5);
  const championIds = data?.championIds || [];
  const tierOf = (id) => crownTierFromIds(id, championIds);

  // Where the current user sits in the full ranking. If they're outside the
  // top 5 we append their own row below, so they can always see where they are.
  const myRankIndex = myId ? allPeople.findIndex((p) => p.learnerId === myId) : -1;
  const showMyRow = myRankIndex >= 5;

  if (loading) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2 italic">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading rankings… {elapsed}s
        </span>
        <span className="block text-xs text-slate-400 mt-1">Gathering the whole team — usually a few seconds.</span>
      </div>
    );
  }
  if (!people.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        Leaderboard data will appear as team members complete lessons and earn XP.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {people.map((p, i) => (
        <Row key={p.learnerId} person={p} rank={i + 1} tierOf={tierOf} myId={myId} />
      ))}
      {showMyRow && (
        <>
          <li className="text-center text-xs text-slate-400 leading-none py-0.5">···</li>
          <Row person={allPeople[myRankIndex]} rank={myRankIndex + 1} tierOf={tierOf} myId={myId} />
        </>
      )}
    </ul>
  );
}

function Row({ person: p, rank, tierOf, myId }) {
  const isMe = p.learnerId === myId;
  const tier = tierOf(p.learnerId);
  return (
    <li
      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${isMe ? 'bg-brand-50 dark:bg-slate-700/50' : ''}`}
    >
      <span className="w-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {MEDAL[rank] || rank}
      </span>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
        <Avatar avatar={p.avatar} size={30} crown={tier} title={p.name} />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-medium text-ink dark:text-slate-200 truncate">{p.name}</span>
        {tier > 0 && <Crown className={`w-3.5 h-3.5 shrink-0 ${CROWN_ICON_CLASS[tier]}`} />}
        {isMe && (
          <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide shrink-0">You</span>
        )}
      </div>
      <span className="text-sm font-bold text-ink dark:text-slate-200 shrink-0">{p.totalXp.toLocaleString()} XP</span>
    </li>
  );
}
