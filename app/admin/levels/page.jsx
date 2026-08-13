'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { Gauge, Loader2, ArrowUp, ArrowDown, Minus, Search } from 'lucide-react';

// Declared vs. earned level, per learner.
//
// The level someone picked at onboarding is a self-assessment; the level their
// lessons are actually pitched at moves with how they perform. When those two
// disagree, someone should be able to see it — and see the run of activity that
// caused it — rather than finding out because a learner says their lessons feel
// wrong.

const TIER_LABELS = {
  beginner: 'Beginner',
  practitioner: 'Practitioner',
  power_user: 'Power User',
  builder: 'Builder',
  developer: 'Developer',
};

const BAND_LABELS = {
  reinforce: 'Struggling',
  steady: 'On level',
  stretch: 'Ahead',
};

const REASON_LABELS = {
  repeated_fail: 'failed twice in a row',
  sustained_low: 'sustained low scores',
  sustained_high: 'sustained high scores',
};

const tierLabel = (t) => TIER_LABELS[t] || t || '—';

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
}

export default function AdminLevelsPage() {
  return <CinematicFrame><AdminLevelsPageInner /></CinematicFrame>;
}

function AdminLevelsPageInner() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [openEmail, setOpenEmail] = useState(null);
  const [activity, setActivity] = useState({}); // email -> rows | 'loading'

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/admin/levels', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { available: false, rows: [] }))
      .then(setData)
      .catch(() => setData({ available: false, rows: [] }));
  }, [allowed]);

  function toggle(email) {
    const next = openEmail === email ? null : email;
    setOpenEmail(next);
    if (!next || activity[next]) return;
    setActivity((prev) => ({ ...prev, [next]: 'loading' }));
    fetch(`/api/admin/levels?email=${encodeURIComponent(next)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { activity: [] }))
      .then((d) => setActivity((prev) => ({ ...prev, [next]: d.activity || [] })))
      .catch(() => setActivity((prev) => ({ ...prev, [next]: [] })));
  }

  if (allowed === null) return <Shell><Center>Checking…</Center></Shell>;
  if (!allowed) return <Shell><Center>Admins only.</Center></Shell>;
  if (!data) return <Shell><Center><Loader2 className="w-5 h-5 animate-spin inline" /> Loading levels…</Center></Shell>;

  if (!data.available) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Supabase isn&apos;t answering</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This page reads the <code>learner_levels</code> and <code>profiles</code> tables. If the
            schema hasn&apos;t been run yet, run <code>docs/supabase-schema.sql</code> in the SQL editor.
            Levelling itself still works — it just can&apos;t be reported on until those tables exist.
          </p>
        </div>
      </Shell>
    );
  }

  const q = query.trim().toLowerCase();
  const rows = q
    ? data.rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
    : data.rows;

  const s = data.summary || {};

  return (
    <Shell>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>Declared</strong> is what someone picked during onboarding. <strong>Earned</strong> is
          the level their lessons are actually generated at, which moves with how they perform. Anyone
          who has been moved is listed first.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Levels only move on sustained evidence, or on failing the same thing twice. Nobody is promoted
          past Power User on lesson performance alone &mdash; Builder and Developer are only reached by
          declaring them, or by climbing back to one after being moved down.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Stat label="People" value={s.total ?? 0} />
        <Stat label="Moved" value={s.moved ?? 0} />
        <Stat label="Moved down" value={s.down ?? 0} tone="down" />
        <Stat label="Moved up" value={s.up ?? 0} tone="up" />
        <Stat label="No activity yet" value={s.noActivity ?? 0} />
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200"
        />
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.email} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(r.email)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <DriftIcon drift={r.drift} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink dark:text-slate-200 truncate">{r.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {r.email}{r.department ? ` · ${r.department}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-ink dark:text-slate-200">
                  {tierLabel(r.declared)}
                  {r.drift !== 'none' && (
                    <>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className={r.drift === 'down' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
                        {tierLabel(r.earned)}
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {r.samples
                    ? `${r.samples} activit${r.samples === 1 ? 'y' : 'ies'}${r.band ? ` · ${BAND_LABELS[r.band] || r.band}` : ''}${typeof r.score === 'number' ? ` · ${r.score}` : ''}`
                    : 'No activity yet'}
                </p>
              </div>
            </button>

            {openEmail === r.email && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/40">
                {r.lastChange && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Last move: {tierLabel(r.lastChange.from)} → {tierLabel(r.lastChange.to)}
                    {r.lastChange.reason ? ` — ${REASON_LABELS[r.lastChange.reason] || r.lastChange.reason}` : ''}
                    {r.lastChange.at ? ` · ${fmtDate(r.lastChange.at)}` : ''}
                  </p>
                )}
                <ActivityList rows={activity[r.email]} />
              </div>
            )}
          </div>
        ))}
        {!rows.length && <Center>Nobody matches that search.</Center>}
      </div>
    </Shell>
  );
}

function ActivityList({ rows }) {
  if (rows === 'loading') {
    return <p className="text-xs text-slate-500 dark:text-slate-400"><Loader2 className="w-3 h-3 animate-spin inline" /> Loading activity…</p>;
  }
  if (!rows || !rows.length) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">No graded activity recorded yet.</p>;
  }
  return (
    <ul className="space-y-1">
      {rows.map((e) => {
        const i = e.input || {};
        const what = i.topic || i.game || (e.type === 'level_change' ? `${tierLabel(i.from)} → ${tierLabel(i.to)}` : '—');
        const score = typeof i.scorePercent === 'number' ? `${i.scorePercent}%` : null;
        return (
          <li key={e.id} className="text-xs text-slate-600 dark:text-slate-400 flex items-baseline gap-2">
            <span className="text-slate-400 shrink-0 w-20">{fmtDate(e.created_at)}</span>
            <span className="font-medium text-ink dark:text-slate-300 shrink-0 w-24">
              {e.type === 'lesson_complete' ? 'Lesson' : e.type === 'game_complete' ? 'Game' : 'Level change'}
            </span>
            <span className="truncate flex-1">{what}</span>
            {score && (
              <span className={`shrink-0 font-semibold ${i.passed === false ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {score}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DriftIcon({ drift }) {
  if (drift === 'up') return <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />;
  if (drift === 'down') return <ArrowDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
  return <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />;
}

function Stat({ label, value, tone }) {
  const color = tone === 'down'
    ? 'text-amber-600 dark:text-amber-400'
    : tone === 'up'
      ? 'text-green-600 dark:text-green-400'
      : 'text-ink dark:text-slate-200';
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Center({ children }) {
  return <p className="text-center text-slate-500 dark:text-slate-400">{children}</p>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={Gauge} title="Learner Levels" subtitle="Declared vs. earned, and what moved them" />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-5">{children}</main>
    </div>
  );
}
