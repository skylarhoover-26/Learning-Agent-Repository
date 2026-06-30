'use client';

import { useState, useMemo } from 'react';
import { Users, Activity, BookOpen, Zap, ArrowUpDown } from 'lucide-react';

export function relTime(iso) {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Never';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function weekday(iso) {
  try { return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }); } catch { return ''; }
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Team' },
  { key: 'manager', label: 'Manager' },
  { key: 'lessonsCompleted', label: 'Lessons', num: true },
  { key: 'totalXp', label: 'XP', num: true },
  { key: 'level', label: 'Level', num: true },
  { key: 'lastActive', label: 'Last active' },
];

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <span className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-slate-700 flex items-center justify-center text-brand"><Icon className="w-4 h-4" /></span>
      </div>
      <p className="text-3xl font-extrabold text-ink dark:text-slate-100 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// A compact vertical bar chart for categorical counts (e.g. activity by type,
// learners by team). Value on top, branded bar, wrapped label below.
function VBarChart({ items }) {
  if (!items?.length) return null;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-48">
      {items.map((it, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0 h-full" title={`${it.label}: ${it.value}`}>
          <span className="text-xs font-bold text-ink dark:text-slate-200 mb-1 tabular-nums">{it.value}</span>
          <div className="w-full flex items-end justify-center" style={{ height: `${Math.max(2, (it.value / max) * 100)}%` }}>
            <div className="w-full max-w-[44px] h-full bg-gradient-to-t from-brand to-[#3b82f6] rounded-t-md" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 text-center leading-tight line-clamp-2 break-words w-full">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// Engagement combo chart: gradient bars for active learners + an orange line
// with a soft area fill for lessons completed. Each day is clickable to drill
// into who was active (grouped by team).
function EngagementChart({ engagement, rangeLabel }) {
  const [sel, setSel] = useState(null);
  const usersMax = Math.max(1, ...engagement.map((d) => d.activeUsers));
  const lessonMax = Math.max(1, ...engagement.map((d) => d.lessons));
  const n = engagement.length;
  const pts = engagement.map((d, i) => ({ x: ((i + 0.5) / n) * 100, y: 100 - (d.lessons / lessonMax) * 100 }));
  const linePts = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPts = `${pts[0].x},100 ${linePts} ${pts[n - 1].x},100`;
  const selected = sel != null ? engagement[sel] : null;

  const byTeam = useMemo(() => {
    if (!selected) return [];
    const m = new Map();
    for (const a of selected.active || []) {
      if (!m.has(a.department)) m.set(a.department, []);
      m.get(a.department).push(a.name);
    }
    return [...m.entries()].map(([team, names]) => ({ team, names })).sort((a, b) => b.names.length - a.names.length);
  }, [selected]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-ink dark:text-slate-200">Engagement</h2>
        <span className="text-xs text-slate-400">{rangeLabel || 'last 14 days'}</span>
      </div>
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-t from-brand to-[#3b82f6] inline-block" /> Active learners</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cta inline-block" /> Lessons completed</span>
      </div>
      <div className="relative flex items-end gap-1.5 h-32">
        {engagement.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSel(sel === i ? null : i)}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 z-10 group h-full justify-end"
            title={`${weekday(d.date)} ${d.date}: ${d.activeUsers} active · ${d.lessons} lessons`}
          >
            <div className="w-full flex items-end justify-center h-full">
              <div
                className={`w-full max-w-[24px] rounded-t bg-gradient-to-t from-brand to-[#3b82f6] transition-all group-hover:opacity-80 ${sel === i ? 'ring-2 ring-brand-300 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                style={{ height: d.activeUsers ? `${Math.max(8, Math.round((d.activeUsers / usersMax) * 100))}%` : '0%' }}
              />
            </div>
            <span className={`text-[9px] leading-none ${sel === i ? 'text-brand font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>{weekday(d.date)}</span>
            <span className={`text-[9px] tabular-nums leading-none ${sel === i ? 'text-brand font-semibold' : 'text-slate-400'}`}>{d.date.slice(5)}</span>
          </button>
        ))}
        {/* Lessons line + soft area fill (currentColor = cta via text-cta). */}
        <svg className="absolute inset-x-0 top-0 w-full pointer-events-none text-cta" style={{ height: 'calc(100% - 1.6rem)' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={areaPts} fill="currentColor" fillOpacity="0.14" />
          <polyline points={linePts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <p className="text-xs text-slate-400 mt-2.5">Tap a day to see who was active</p>
      {selected && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-warm/60 dark:bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-ink dark:text-slate-200">
            {weekday(selected.date)} {selected.date} — {selected.activeUsers} active · {selected.lessons} lessons
          </p>
          {byTeam.length === 0 ? (
            <p className="text-xs text-slate-400 mt-1">No active learners this day.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {byTeam.map((t) => (
                <div key={t.team} className="text-sm leading-snug">
                  <span className="font-semibold text-brand">{t.team}</span>
                  <span className="text-slate-400"> ({t.names.length}) · </span>
                  <span className="text-ink dark:text-slate-200">{t.names.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Presentational report body: overview cards, engagement chart, learners-by-team
// and activity charts, a sortable people table, and top topics. Shared by the
// authed /reporting page and the public token-shared view so both look identical.
export default function ReportView({
  people = [],
  overview,
  engagement = null,
  activityByType = null,
  showActiveStatus = false, // show the "Active in range" status column + toggle
  hideTeamChart = false,    // hide "Learners by team" (e.g. when filtering to one person)
  rangeLabel,               // e.g. "Jun 16 – Jun 30", shown on the engagement chart
  activeLabel = 'Active this week',
  activeSub,                // sub-label for the Active card (defaults to % of group)
  lessonsSub,               // sub-label for the Lessons card
  learnersSub,              // sub-label for the Registered learners card (e.g. coverage %)
}) {
  const [sort, setSort] = useState({ key: 'totalXp', dir: 'desc' });
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive

  // Most-taken topics, computed from whatever slice of people is shown (so it's
  // correct for a filtered view or a scoped share link, not just globally).
  const topTopics = useMemo(() => {
    const counts = new Map();
    for (const p of people) {
      for (const t of (p.topics || [])) {
        const k = (t || '').trim();
        if (k) counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    return [...counts.entries()].map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
  }, [people]);

  // Learners per team (top 8) for the "by team" chart — scope-aware.
  const teamStats = useMemo(() => {
    const counts = new Map();
    for (const p of people) {
      const t = p.department || 'Unassigned';
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [people]);

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    return [...people].sort((a, b) => {
      const va = a[key], vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      return String(va || '').localeCompare(String(vb || '')) * mult;
    });
  }, [people, sort]);

  function toggleSort(key) {
    setSort((s) => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: COLUMNS.find((c) => c.key === key)?.num ? 'desc' : 'asc' });
  }

  // Active in the range / has-an-account-but-inactive / never signed in.
  const statusOf = (p) => (!p.registered ? 'never' : (p.activeInRange ? 'active' : 'inactive'));

  // The rows actually rendered: sorted, then narrowed by the status toggle (only
  // when status is being shown — i.e. a date range is in play).
  const visible = useMemo(() => {
    if (!showActiveStatus || statusFilter === 'all') return sorted;
    return sorted.filter((p) => statusOf(p) === statusFilter);
  }, [sorted, showActiveStatus, statusFilter]);

  const counts = useMemo(() => {
    const c = { active: 0, inactive: 0, never: 0 };
    if (showActiveStatus) for (const p of people) c[statusOf(p)] += 1;
    return c;
  }, [people, showActiveStatus]);

  const colCount = COLUMNS.length + (showActiveStatus ? 1 : 0);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Registered learners" value={overview.learners} sub={learnersSub ?? (overview.avgLevel != null ? `avg level ${overview.avgLevel.toFixed(1)}` : undefined)} />
        <StatCard icon={Activity} label={activeLabel} value={overview.active} sub={activeSub ?? (overview.learners ? `${Math.round((overview.active / overview.learners) * 100)}% of group` : '—')} />
        <StatCard icon={BookOpen} label="Lessons completed" value={overview.lessons} sub={lessonsSub} />
        <StatCard icon={Zap} label="Total XP" value={(overview.xp || 0).toLocaleString()} />
      </div>

      {/* People table — moved above the engagement chart so the names are the
          first thing you see. When a date range is active it also carries the
          Active/Inactive status column + toggle. */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden mb-8">
        {showActiveStatus && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              {counts.active} active · {counts.inactive} inactive · {counts.never} never accessed
            </p>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
                { key: 'never', label: 'Never accessed' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-3 py-1.5 transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-brand text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`py-3 px-4 font-semibold ${c.num ? 'text-right' : ''}`}>
                    <button onClick={() => toggleSort(c.key)} className={`inline-flex items-center gap-1 hover:text-ink dark:hover:text-slate-200 ${sort.key === c.key ? 'text-ink dark:text-slate-200' : ''}`}>
                      {c.label}<ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
                {showActiveStatus && <th className="py-3 px-4 font-semibold">Status</th>}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={colCount} className="py-10 text-center text-slate-400">No learners to show.</td></tr>
              ) : visible.map((p) => (
                <tr key={p.learnerId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="py-2.5 px-4">
                    <span className="font-medium text-ink dark:text-slate-200">{p.name}</span>
                    {p.title && <span className="block text-xs text-slate-400">{p.title}</span>}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.department}{p.subTeam && p.subTeam !== p.department ? ` · ${p.subTeam}` : ''}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.manager || '—'}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{p.lessonsCompleted}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{p.totalXp.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{p.level}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{relTime(p.lastActive)}</td>
                  {showActiveStatus && (
                    <td className="py-2.5 px-4">
                      {statusOf(p) === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : statusOf(p) === 'inactive' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                          <span className="w-2 h-2 rounded-full border border-slate-300 dark:border-slate-600" /> Never accessed
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {engagement?.length > 0 && <EngagementChart engagement={engagement} rangeLabel={rangeLabel} />}

      {!hideTeamChart && teamStats.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-8">
          <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">Learners by team</h2>
          <p className="text-xs text-slate-400 mb-5">people with activity, by department</p>
          <VBarChart items={teamStats} />
        </div>
      )}

      {activityByType?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-8">
          <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">What people are doing</h2>
          <p className="text-xs text-slate-400 mb-5">actions across the app · last 14 days</p>
          <VBarChart items={activityByType.map((a) => ({ label: a.label, value: a.count }))} />
        </div>
      )}

      {topTopics.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
          <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">Most-taken topics</h2>
          <p className="text-xs text-slate-400 mb-4">top 8 by learners who took them</p>
          <div className="space-y-3.5">
            {topTopics.map((t, i) => (
              <div key={t.topic}>
                <div className="flex items-start gap-2 mb-1">
                  <span className="w-4 text-xs text-slate-400 tabular-nums text-right shrink-0 mt-0.5">{i + 1}</span>
                  <span className="flex-1 text-sm text-ink dark:text-slate-200 leading-snug line-clamp-2" title={t.topic}>{t.topic}</span>
                  <span className="text-sm font-bold text-brand tabular-nums shrink-0 mt-0.5">{t.count}</span>
                </div>
                <div className="ml-6 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand to-[#3b82f6] rounded-full" style={{ width: `${(t.count / topTopics[0].count) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
