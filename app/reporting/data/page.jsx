'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { BarChart3, Loader2, Download, Search } from 'lucide-react';

// Live learning reporting, read from Supabase.
//
// Shareable by URL: Okta proves who someone is and the viewer allowlist
// (lib/reporting-access.js) decides whether they get in. Deliberately not a
// public token link — one existed in June and was removed the same day once the
// report started showing the full roster.
//
// The CSV buttons are the spreadsheet half of the request. Exporting happens
// when a signed-in, authorised person chooses it, rather than a file with no
// owner circulating by email.

const TIER_LABELS = {
  beginner: 'Beginner',
  practitioner: 'Practitioner',
  power_user: 'Power User',
  builder: 'Builder',
  developer: 'Developer',
};
const tierLabel = (t) => TIER_LABELS[t] || t || '—';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'All time' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return '—'; }
}

// Quote everything and double any embedded quotes — lesson topics are free text
// and will contain commas.
function toCsv(headers, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n');
}

function download(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportingDataPage() {
  return <CinematicFrame><ReportingDataPageInner /></CinematicFrame>;
}

function ReportingDataPageInner() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('people');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/reporting/data?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || 'Could not load reporting.');
        return d;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [days]);

  const rows = useMemo(() => {
    const all = data?.rows || [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q)
      || (r.department || '').toLowerCase().includes(q));
  }, [data, query]);

  function exportPeople() {
    download(`learning-people-${days || 'all'}d.csv`, toCsv(
      ['Name', 'Email', 'Department', 'Declared level', 'Earned level', 'Moved', 'Lessons', 'Games', 'Avg score', 'Failed', 'Level moves', 'Last active'],
      rows.map((r) => [r.name, r.email, r.department, tierLabel(r.declared), tierLabel(r.earned), r.moved === 'none' ? '' : r.moved, r.lessons, r.games, r.avgScore, r.failed, r.levelMoves, r.lastActive ? fmtDate(r.lastActive) : '']),
    ));
  }

  function exportActivity() {
    download(`learning-activity-${days || 'all'}d.csv`, toCsv(
      ['When', 'Person', 'Type', 'Topic or game', 'Score %', 'Passed', 'From', 'To'],
      (data?.recent || []).map((e) => [fmtDate(e.at), e.email, e.type, e.topic, e.scorePercent, e.passed, tierLabel(e.from), tierLabel(e.to)]),
    ));
  }

  if (error) return <Shell days={days} setDays={setDays}><Notice title="Reporting unavailable">{error}</Notice></Shell>;
  if (!data) return <Shell days={days} setDays={setDays}><Center><Loader2 className="w-5 h-5 animate-spin inline" /> Loading…</Center></Shell>;
  if (!data.available) {
    return (
      <Shell days={days} setDays={setDays}>
        <Notice title="No data source">
          {data.reason || 'Supabase is not answering.'} Run <code>docs/supabase-schema.sql</code> if the
          tables haven&apos;t been created yet.
        </Notice>
      </Shell>
    );
  }

  const s = data.summary;

  return (
    <Shell days={days} setDays={setDays}>
      {data.truncated && (
        <Notice title="Showing a partial window">
          This range hit the row ceiling, so the numbers below cover only the most recent events in it.
          Narrow the range for an exact picture.
        </Notice>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Active people" value={`${s.active} of ${s.people}`} />
        <Stat label="Lessons" value={s.lessons} />
        <Stat label="Games" value={s.games} />
        <Stat label="Average score" value={s.avgScore === null ? '—' : `${s.avgScore}%`} />
        <Stat label="Pass rate" value={s.passRate === null ? '—' : `${s.passRate}%`} />
        <Stat label="Levelled up" value={s.movedUp} tone="up" />
        <Stat label="Levelled down" value={s.movedDown} tone="down" />
        <Stat label="Never active" value={s.people - s.active} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['people', 'activity'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-brand text-white'
                : 'border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {t === 'people' ? 'People' : 'Recent activity'}
          </button>
        ))}
        <button
          type="button"
          onClick={tab === 'people' ? exportPeople : exportActivity}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <Download className="w-4 h-4" /> Download CSV
        </button>
      </div>

      {tab === 'people' ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or department"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200"
            />
          </div>
          <Table
            headers={['Person', 'Level', 'Lessons', 'Games', 'Avg', 'Failed', 'Last active']}
            rows={rows.map((r) => [
              <div key="p" className="min-w-0">
                <p className="font-semibold text-ink dark:text-slate-200 truncate">{r.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.department || r.email}</p>
              </div>,
              <span key="l" className="whitespace-nowrap">
                {tierLabel(r.declared)}
                {r.moved !== 'none' && (
                  <>
                    <span className="text-slate-400 mx-1">→</span>
                    <span className={r.moved === 'down' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
                      {tierLabel(r.earned)}
                    </span>
                  </>
                )}
              </span>,
              r.lessons,
              r.games,
              r.avgScore === null ? '—' : `${r.avgScore}%`,
              r.failed || '—',
              fmtDate(r.lastActive),
            ])}
          />
        </>
      ) : (
        <Table
          headers={['When', 'Person', 'What', 'Score']}
          rows={(data.recent || []).map((e) => [
            fmtDate(e.at),
            <span key="e" className="truncate block max-w-[14rem]">{e.email}</span>,
            e.type === 'level_change'
              ? `Level ${tierLabel(e.from)} → ${tierLabel(e.to)}`
              : <span key="w" className="truncate block max-w-[18rem]">{e.topic || (e.type === 'game_complete' ? 'Game' : 'Lesson')}</span>,
            e.scorePercent === null
              ? '—'
              : <span key="s" className={e.passed === false ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{e.scorePercent}%</span>,
          ])}
        />
      )}
    </Shell>
  );
}

function Table({ headers, rows }) {
  if (!rows.length) return <Center>Nothing in this range yet.</Center>;
  return (
    // Wide tables scroll inside their own container so the page never scrolls
    // sideways on a laptop.
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {headers.map((h) => (
              <th key={h} className="text-left font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
              {cells.map((c, j) => (
                <td key={j} className="px-4 py-2.5 text-ink dark:text-slate-300 align-middle">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === 'down'
    ? 'text-amber-600 dark:text-amber-400'
    : tone === 'up'
      ? 'text-green-600 dark:text-green-400'
      : 'text-ink dark:text-slate-200';
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Notice({ title, children }) {
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{title}</p>
      <p className="text-sm text-amber-700 dark:text-amber-400">{children}</p>
    </div>
  );
}

function Center({ children }) {
  return <p className="text-center text-slate-500 dark:text-slate-400 py-6">{children}</p>;
}

function Shell({ children, days, setDays }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={BarChart3} title="Learning Data" subtitle="Live activity, scores, and levels" />
      <main className="max-w-5xl mx-auto px-6 pt-6 pb-10 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-pill text-sm font-medium transition-all ${
                days === r.days
                  ? 'bg-brand text-white'
                  : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}
