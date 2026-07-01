'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { getLevelTitle } from '@/lib/level-titles';
import { Trophy, Crown, Loader2, Users } from 'lucide-react';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export default function CinematicLeaderboard() {
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

  const people = data?.people || [];
  const champ = new Set(data?.championIds || []);
  const top3 = people.slice(0, 3);
  const rest = people.slice(3);

  return (
    <CinematicShell>
      <section className="cine-rise">
        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-3 cine-gold">
          <Trophy className="w-3.5 h-3.5" /> LEADERBOARD
        </span>
        <h1 className="font-display font-extrabold text-4xl">Top learners</h1>
        <p className="mt-2 text-base" style={{ color: 'var(--ink-dim)' }}>How the team ranks by total XP. Keep learning to climb.</p>
      </section>

      {loading ? (
        <div className="cine-glass rounded-3xl p-12 grid place-items-center cine-rise">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent2)' }} />
        </div>
      ) : people.length === 0 ? (
        <div className="cine-glass rounded-3xl p-10 text-center cine-rise" style={{ color: 'var(--ink-dim)' }}>
          <Users className="w-8 h-8 mx-auto mb-3" />
          Rankings appear as the team completes lessons and earns XP.
        </div>
      ) : (
        <>
          {/* Podium for the top 3 */}
          {top3.length > 0 && (
            <section className="cine-rise grid grid-cols-3 gap-3 sm:gap-5 items-end">
              {[1, 0, 2].map((slot) => {
                const p = top3[slot];
                if (!p) return <div key={slot} />;
                const rank = slot + 1;
                const isMe = p.learnerId === myId;
                const h = rank === 1 ? 'h-40' : rank === 2 ? 'h-32' : 'h-28';
                return (
                  <div key={p.learnerId} className="flex flex-col items-center">
                    <span className="w-12 h-12 rounded-full grid place-items-center font-display font-bold mb-2" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', color: '#0A2443', boxShadow: rank === 1 ? '0 0 26px -4px var(--gold)' : 'none' }}>
                      {initials(p.name)}
                    </span>
                    <p className="text-sm font-semibold text-center truncate max-w-full flex items-center gap-1">
                      {p.name?.split(' ')[0]}
                      {champ.has(p.learnerId) && <Crown className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--ink-dim)' }}>{(p.totalXp || 0).toLocaleString()} XP</p>
                    <div className={`w-full ${h} rounded-t-2xl cine-glass flex items-start justify-center pt-3`} style={isMe ? { borderColor: 'var(--accent)', boxShadow: '0 0 20px -6px var(--accent)' } : undefined}>
                      <span className="text-3xl">{MEDAL[rank]}</span>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* The rest of the table */}
          {rest.length > 0 && (
            <section className="cine-rise cine-glass rounded-3xl overflow-hidden">
              <ul>
                {rest.map((p, i) => {
                  const rank = i + 4;
                  const isMe = p.learnerId === myId;
                  return (
                    <li key={p.learnerId} className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--line)', background: isMe ? 'rgba(59,148,255,.12)' : 'transparent' }}>
                      <span className="w-7 text-center text-sm font-bold" style={{ color: 'var(--ink-dim)' }}>{rank}</span>
                      <span className="w-9 h-9 rounded-full grid place-items-center font-display font-bold text-[12px] shrink-0" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', color: '#0A2443' }}>
                        {initials(p.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {p.name}
                          {champ.has(p.learnerId) && <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gold)' }} />}
                          {isMe && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'var(--accent)', color: '#fff' }}>You</span>}
                        </p>
                        {Number.isFinite(p.level) && <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{getLevelTitle(p.level)}</p>}
                      </div>
                      <span className="text-sm font-bold shrink-0">{(p.totalXp || 0).toLocaleString()} XP</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="pb-6" />
    </CinematicShell>
  );
}
