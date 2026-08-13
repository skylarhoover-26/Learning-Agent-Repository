'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { Activity, Loader2, Download, Search, TrendingUp, TrendingDown } from 'lucide-react';

// Program health — is the org using this, and is that going up or down.
//
// Adoption leads because that is the question leadership actually asks. Scores
// and levels come after it, and named individuals sit behind a tab: a leadership
// report that opens on a roster of people reads as a ranking of who is behind,
// which is not what it is for. The enablement side still needs the names, so
// they're one click away rather than gone.
//
// Distinct from /manager (a manager's own team) and /reporting (roster snapshot
// including who has never signed in). Three questions, three views.

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
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return '—'; }
}

function toCsv(headers, rows) {
  // Quote everything and double embedded quotes — topics and department names
  // are free text and will contain commas.
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
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/reporting/data?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok && !d) throw new Error('Could not load reporting.');
        if (!r.ok) throw new Error(d.reason || d.error || 'Could not load reporting.');
        return d;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [days]);

  const people = useMemo(() => {
    const all = data?.rows || [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => r.name.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q)
      || r.department.toLowerCase().includes(q));
  }, [data, query]);

  function exportCsv() {
    if (tab === 'people') {
      download(`learning-people-${days || 'all'}d.csv`, toCsv(
        ['Name', 'Email', 'Department', 'Declared level', 'Earned level', 'Moved', 'Lessons', 'Games', 'Avg score', 'Failures', 'Last active'],
        people.map((r) => [r.name, r.email, r.department, tierLabel(r.declared), tierLabel(r.earned), r.moved === 'none' ? '' : r.moved, r.lessons, r.games, r.avgScore, r.failures, r.lastActive ? fmtDate(r.lastActive) : '']),
      ));
      return;
    }
    download(`learning-departments-${days || 'all'}d.csv`, toCsv(
      ['Department', 'Headcount', 'Onboarded', 'Active', 'Active %', 'Lessons', 'Games', 'Avg score'],
      (data?.departments || []).map((d) => [d.department, d.headcount, d.onboarded, d.active, d.activePct, d.lessons, d.games, d.avgScore]),
    ));
  }

  if (error) return <Shell days={days} setDays={setDays}><Notice title="Reporting unavailable">{error}</Notice></Shell>;
  if (!data) return <Shell days={days} setDays={setDays}><Center><Loader2 className="w-5 h-5 animate-spin inline" /> Loading…</Center></Shell>;
  if (!data.available) return <Shell days={days} setDays={setDays}><Notice title="No data source">{data.reason}</Notice></Shell>;

  const s = data.summary;

  return (
    <Shell days={days} setDays={setDays}>
      <div className="flex items-center gap-2 flex-wrap">
        {[['overview', 'Adoption'], ['people', 'People']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all ${
              tab === id ? 'bg-brand text-white'
                : 'border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <Download className="w-4 h-4" /> Download CSV
        </button>
      </div>

      {tab === 'overview' ? (
        <>
          {/* The two adoption numbers, given the most room on the page. */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            <BigStat
              label="Onboarded"
              value={s.onboarded}
              of={s.headcount}
              pct={s.onboardedPct}
              caption={data.headcountKnown ? 'of everyone on the roster' : 'people have set up a profile'}
            />
            <BigStat
              label={`Active in the last ${days || 'year'}${days ? ' days' : ''}`}
              value={s.active}
              of={s.headcount ?? s.onboarded}
              pct={s.activePct}
              caption={`${s.neverActive} onboarded but not active in this window`}
            />
          </div>

          <WeeklyChart weekly={data.weekly} trend={s.trend} />

          <Section title="By department">
            {data.departments.length ? (
              <div className="space-y-2.5">
                {data.departments.map((d) => (
                  <div key={d.department}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-sm font-semibold text-ink dark:text-slate-200 truncate">{d.department}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                        {d.activePct === null ? '—' : `${d.activePct}% active`}
                        {' · '}{d.active} of {d.headcount ?? d.onboarded}
                        {d.avgScore !== null && ` · ${d.avgScore}% avg`}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, d.activePct ?? 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : <Center>No departments yet.</Center>}
          </Section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Lessons" value={s.lessons} />
            <Stat label="Games" value={s.games} />
            <Stat label="Average score" value={s.avgScore === null ? '—' : `${s.avgScore}%`} />
            <Stat label="Level changes" value={`${s.movedUp} up · ${s.movedDown} down`} />
          </div>

          <Section title="Where the org sits">
            <div className="space-y-2">
              {Object.entries(s.levelSpread).map(([tier, n]) => {
                const total = Object.values(s.levelSpread).reduce((a, b) => a + b, 0) || 1;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="text-sm text-ink dark:text-slate-200 w-32 shrink-0">{tierLabel(tier)}</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand/70 rounded-full" style={{ width: `${(n / total) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      ) : (
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
          {people.length ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {['Person', 'Level', 'Lessons', 'Games', 'Avg', 'Failed', 'Last active'].map((h) => (
                      <th key={h} className="text-left font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {people.map((r) => (
                    <tr key={r.email} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-ink dark:text-slate-200 truncate">{r.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.department}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-ink dark:text-slate-300">
                        {tierLabel(r.declared)}
                        {r.moved !== 'none' && (
                          <>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className={r.moved === 'down' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>
                              {tierLabel(r.earned)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink dark:text-slate-300 tabular-nums">{r.lessons}</td>
                      <td className="px-4 py-2.5 text-ink dark:text-slate-300 tabular-nums">{r.games}</td>
                      <td className="px-4 py-2.5 text-ink dark:text-slate-300 tabular-nums">{r.avgScore === null ? '—' : `${r.avgScore}%`}</td>
                      <td className="px-4 py-2.5 tabular-nums text-amber-600 dark:text-amber-400">{r.failures || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(r.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Center>Nobody matches that search.</Center>}
        </>
      )}
    </Shell>
  );
}

// Weekly actives. A bar per week rather than a line — eight points is too few
// for a line to mean anything, and bars read honestly when a week is empty.
function WeeklyChart({ weekly, trend }) {
  if (!weekly?.length) return null;
  const max = Math.max(...weekly.map((w) => w.people), 1);
  const up = trend.delta > 0;
  const flat = trend.delta === 0;

  return (
    <Section title="Weekly active learners">
      <div className="flex items-end gap-1.5 h-24 mb-2">
        {weekly.map((w) => (
          <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-full bg-brand/80 rounded-t hover:bg-brand transition-colors"
              style={{ height: `${Math.max(2, (w.people / max) * 100)}%` }}
              title={`Week of ${fmtDate(w.weekStart)} — ${w.people} people, ${w.lessons} lessons, ${w.games} games`}
            />
            <span className="text-[10px] text-slate-400 truncate w-full text-center">{fmtDate(w.weekStart)}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
        {flat ? null : up
          ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          : <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        {/* Stated as a count, not a percentage: a percentage off a base of three
            people is noise dressed up as a finding. */}
        {flat
          ? `${trend.last} active this week, level with last week.`
          : `${trend.last} active this week, ${up ? 'up' : 'down'} ${Math.abs(trend.delta)} from last week.`}
      </p>
    </Section>
  );
}

function BigStat({ label, value, of, pct, caption }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-bold text-ink dark:text-slate-100 tabular-nums">{value}</span>
        {of ? <span className="text-lg text-slate-400 tabular-nums">of {of}</span> : null}
        {pct !== null && pct !== undefined && (
          <span className="text-lg font-semibold text-brand tabular-nums">{pct}%</span>
        )}
      </div>
      <p className="text-sm font-semibold text-ink dark:text-slate-200 mt-0.5">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{caption}</p>
      {pct !== null && pct !== undefined && (
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 className="text-sm font-bold text-ink dark:text-slate-200 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
      <p className="text-lg font-bold text-ink dark:text-slate-200 tabular-nums">{value}</p>
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
      <PageHeader icon={Activity} title="Program Health" subtitle="Adoption, engagement, and how the org is progressing" />
      <main className="max-w-4xl mx-auto px-6 pt-6 pb-10 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-pill text-sm font-medium transition-all ${
                days === r.days ? 'bg-brand text-white'
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
