'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/avatar';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { Crown } from 'lucide-react';

const MEDAL = { 1: '\u{1F947}', 2: '\u{1F948}', 3: '\u{1F949}' };

// Top 5 individual learners on the homepage card, with the crown on the overall
// #1. Reuses the shared /api/leaderboard data.
export default function HomeLeaderboard() {
  const { profile } = useProfile();
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

  const people = (data?.people || []).slice(0, 5);
  const champ = new Set(data?.championIds || []);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 italic">Loading rankings…</p>;
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
        <li
          key={p.learnerId}
          className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${p.learnerId === myId ? 'bg-brand-50 dark:bg-slate-700/50' : ''}`}
        >
          <span className="w-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {MEDAL[i + 1] || i + 1}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
            <Avatar avatar={p.avatar} size={30} crown={champ.has(p.learnerId)} title={p.name} />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="text-sm font-medium text-ink dark:text-slate-200 truncate">{p.name}</span>
            {champ.has(p.learnerId) && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            {p.learnerId === myId && (
              <span className="text-[10px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-pill uppercase tracking-wide shrink-0">You</span>
            )}
          </div>
          <span className="text-sm font-bold text-ink dark:text-slate-200 shrink-0">{p.totalXp.toLocaleString()} XP</span>
        </li>
      ))}
    </ul>
  );
}
