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

// Presentational report body: overview cards, optional engagement chart, a
// sortable people table, and top topics. Shared by the authed /reporting page
// and the public token-shared view so both look identical.
export default function ReportView({ people = [], overview, topTopics = [], engagement = null }) {
  const [sort, setSort] = useState({ key: 'totalXp', dir: 'desc' });

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

  const engMax = engagement?.length ? Math.max(1, ...engagement.map((d) => d.activeUsers)) : 1;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Learners" value={overview.learners} sub={overview.avgLevel != null ? `avg level ${overview.avgLevel.toFixed(1)}` : undefined} />
        <StatCard icon={Activity} label="Active this week" value={overview.active} sub={overview.learners ? `${Math.round((overview.active / overview.learners) * 100)}% of group` : '—'} />
        <StatCard icon={BookOpen} label="Lessons completed" value={overview.lessons} />
        <StatCard icon={Zap} label="Total XP" value={(overview.xp || 0).toLocaleString()} />
      </div>

      {engagement?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink dark:text-slate-200">Engagement — last 14 days</h2>
            <span className="text-xs text-slate-400">active learners / day (app-wide)</span>
          </div>
          <div className="flex items-end gap-1.5 h-32">
            {engagement.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date}: ${d.activeUsers} active · ${d.lessons} lessons · ${d.events} events`}>
                <div className="w-full flex items-end justify-center h-full">
                  <div className="w-full max-w-[24px] bg-brand rounded-t transition-all hover:bg-brand-600" style={{ height: `${Math.max(4, Math.round((d.activeUsers / engMax) * 100))}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 tabular-nums">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-x-auto mb-8">
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
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} className="py-10 text-center text-slate-400">No learners to show.</td></tr>
            ) : sorted.map((p) => (
              <tr key={p.learnerId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td className="py-2.5 px-4">
                  <span className="font-medium text-ink dark:text-slate-200">{p.name}</span>
                  {p.title && <span className="block text-xs text-slate-400">{p.title}</span>}
                </td>
                <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.department}{p.subTeam ? ` · ${p.subTeam}` : ''}</td>
                <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{p.manager || '—'}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">{p.lessonsCompleted}</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{p.totalXp.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">{p.level}</td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{relTime(p.lastActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {topTopics.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
          <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-4">Most-taken topics</h2>
          <div className="space-y-2">
            {topTopics.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-ink dark:text-slate-200 truncate">{t.topic}</span>
                <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{t.count}</span>
                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${(t.count / topTopics[0].count) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
