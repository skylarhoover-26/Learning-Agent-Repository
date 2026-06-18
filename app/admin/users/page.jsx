'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/page-header';
import Avatar from '@/components/avatar';
import { getLevelTitle } from '@/lib/level-titles';
import { Users, Search, Zap, Loader2, Crown, Award, BookOpen, Check } from 'lucide-react';

const BADGE_META = {
  first_lesson: { name: 'First Steps', emoji: '🎓' },
  three_lessons: { name: 'Getting Going', emoji: '📚' },
  ten_lessons: { name: 'Bookworm', emoji: '🤓' },
  three_day_streak: { name: 'On Fire', emoji: '🔥' },
  seven_day_streak: { name: 'Unstoppable', emoji: '⚡' },
  level_5: { name: 'Power Learner', emoji: '🚀' },
  first_game: { name: 'Game On', emoji: '🎮' },
  five_games: { name: 'Game Master', emoji: '🕹️' },
  first_quest: { name: 'Quest Champion', emoji: '🏆' },
};

const SOURCE_LABELS = {
  first_login: 'Welcome bonus',
  lesson_complete: 'Lesson',
  quick_tip: 'Quick tip',
  game_complete: 'Game',
  streak_day: 'Streak',
  quest_complete: 'Quest',
  chat_message: 'Chat',
  review_correct: 'Review',
  admin_grant: 'Admin grant',
  admin_correction: 'Balance reset',
};

function sourceLabel(s) {
  return SOURCE_LABELS[s] || (s || 'XP').replace(/_/g, ' ');
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
}

export default function AdminUsersPage() {
  const [allowed, setAllowed] = useState(null);
  const [people, setPeople] = useState([]);
  const [championSet, setChampionSet] = useState(new Set());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Grant form
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantStatus, setGrantStatus] = useState(null);
  const [grantedTotal, setGrantedTotal] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check').then((r) => r.json()).then((d) => setAllowed(!!d.isAdmin)).catch(() => setAllowed(false));
  }, []);

  const loadPeople = useCallback(() => {
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setPeople(d.people || []);
        setChampionSet(new Set(d.championIds || []));
      })
      .catch(() => {});
  }, []);

  useEffect(() => { if (allowed) loadPeople(); }, [allowed, loadPeople]);

  const loadDetail = useCallback((learnerId) => {
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/admin/user?learnerId=${encodeURIComponent(learnerId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, []);

  function selectPerson(p) {
    setSelected(p.learnerId);
    setGrantAmount('');
    setGrantReason('');
    setGrantStatus(null);
    loadDetail(p.learnerId);
  }

  async function grantXp() {
    const amt = Math.round(Number(grantAmount));
    if (!selected || !Number.isFinite(amt) || amt === 0) return;
    setGranting(true);
    setGrantStatus(null);
    try {
      const res = await fetch('/api/admin/grant-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: selected, amount: amt, reason: grantReason }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setGrantStatus('saved');
      setGrantedTotal(result.totalXp ?? null);
      const reasonUsed = grantReason;
      setGrantAmount('');
      setGrantReason('');
      // Reflect the new total immediately from the server response, then refresh
      // from the blob in the background.
      setDetail((d) => (d ? {
        ...d,
        totalXp: result.totalXp ?? d.totalXp,
        level: result.level ?? d.level,
        xpEvents: [
          { id: `xp_admin_${Date.now()}`, source: 'admin_grant', amount: amt, meta: { by: 'you', reason: reasonUsed } },
          ...(d.xpEvents || []),
        ],
      } : d));
      loadDetail(selected);
      loadPeople();
    } catch {
      setGrantStatus('error');
    } finally {
      setGranting(false);
    }
  }

  if (allowed === null) {
    return <Shell><p className="text-center text-slate-500 py-10">Checking…</p></Shell>;
  }
  if (!allowed) {
    return <Shell><p className="text-center text-slate-500 py-10">Admins only.</p></Shell>;
  }

  const filtered = people.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q)
      || (p.learnerId || '').toLowerCase().includes(q)
      || (p.department || '').toLowerCase().includes(q);
  });

  return (
    <Shell>
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
          {/* People list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm text-ink dark:text-slate-200 outline-none"
                />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No people found.</p>
              )}
              {filtered.map((p) => (
                <button
                  key={p.learnerId}
                  onClick={() => selectPerson(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    selected === p.learnerId ? 'bg-brand-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Avatar avatar={p.avatar} size={34} crown={championSet.has(p.learnerId)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.department || '—'} · L{p.level}</p>
                  </div>
                  <span className="text-xs font-semibold text-cta-600 shrink-0">{p.totalXp.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
            {!selected ? (
              <div className="text-center text-slate-400 py-16">
                <Users className="w-10 h-10 mx-auto mb-3" />
                Select a person to see their progress and grant XP.
              </div>
            ) : detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-2 text-slate-500 py-16">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                    <Avatar avatar={detail.profile.avatar} size={56} crown={championSet.has(detail.learnerId)} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-ink dark:text-slate-200 flex items-center gap-2">
                      {detail.profile.display_name}
                      {championSet.has(detail.learnerId) && <Crown className="w-4 h-4 text-amber-500" />}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {getLevelTitle(detail.level)} · Level {detail.level} · {detail.totalXp.toLocaleString()} XP
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {detail.learnerId}{detail.profile.department ? ` · ${detail.profile.department}` : ''}
                    </p>
                  </div>
                </div>

                {/* Grant XP */}
                <div className="rounded-xl border border-cta-200 dark:border-slate-600 bg-cta-50/50 dark:bg-slate-700/40 p-4">
                  <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cta-600" /> Grant XP
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      placeholder="Amount (+/-)"
                      className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 outline-none"
                    />
                    <input
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 outline-none"
                    />
                    <button
                      onClick={grantXp}
                      disabled={granting || !grantAmount}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all"
                    >
                      {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Grant
                    </button>
                  </div>
                  {grantStatus === 'saved' && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Updated{grantedTotal != null ? ` — now at ${grantedTotal.toLocaleString()} XP` : ''}.
                    </p>
                  )}
                  {grantStatus === 'error' && <p className="text-xs text-red-600 mt-2">Couldn&apos;t grant XP. Try again.</p>}
                  <p className="text-[11px] text-slate-400 mt-2">Use a negative number to deduct. Grants are recorded with your name.</p>
                </div>

                {/* Badges */}
                <div>
                  <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-brand" /> Badges ({detail.badges.length})
                  </h3>
                  {detail.badges.length === 0 ? (
                    <p className="text-xs text-slate-400">No badges yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {detail.badges.map((b) => {
                        const m = BADGE_META[b.badge_id] || { name: b.badge_id, emoji: '🏅' };
                        return (
                          <span key={b.badge_id} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-1 text-ink dark:text-slate-200" title={fmtDate(b.earned_at)}>
                            <span>{m.emoji}</span> {m.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent lessons */}
                <div>
                  <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-brand" /> Recent lessons ({detail.lessons.length})
                  </h3>
                  {detail.lessons.length === 0 ? (
                    <p className="text-xs text-slate-400">No lessons yet.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                      {detail.lessons.slice(0, 20).map((l) => (
                        <li key={l.id} className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                          <span className="truncate">
                            {l.topic}
                            <span className="text-slate-400"> · {l.format || 'lesson'}{l.repeat ? ' · repeat' : ''}{l.correctness != null ? ` · ${Math.round(l.correctness * 100)}%` : ''}</span>
                          </span>
                          <span className="text-slate-400 shrink-0">{fmtDate(l.completed_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Recent XP */}
                <div>
                  <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cta-600" /> Recent XP
                  </h3>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detail.xpEvents.slice(0, 25).map((e) => (
                      <li key={e.id} className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-600 dark:text-slate-300">
                          {sourceLabel(e.source)}
                          {e.source === 'admin_grant' && e.meta?.by ? <span className="text-slate-400"> · by {e.meta.by}</span> : null}
                        </span>
                        <span className={`font-semibold shrink-0 ${e.amount < 0 ? 'text-red-500' : 'text-cta-600'}`}>
                          {e.amount > 0 ? '+' : ''}{e.amount} XP
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={Users} title="People & XP" subtitle="View progress and grant XP" />
      {children}
    </div>
  );
}
