'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/page-header';
import { BarChart3, Users, Activity, BookOpen, Zap, Link2, Check, Loader2, ArrowUpDown } from 'lucide-react';

function relTime(iso) {
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

export default function ReportingPage() {
  const [state, setState] = useState({ status: 'loading' }); // loading | forbidden | error | ok
  const [data, setData] = useState(null);
  const [team, setTeam] = useState('');
  const [manager, setManager] = useState('');
  const [person, setPerson] = useState('');
  const [sort, setSort] = useState({ key: 'totalXp', dir: 'desc' });
  const [copied, setCopied] = useState(false);

  // Seed filters from the URL (so a shared link lands pre-filtered).
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setTeam(q.get('team') || '');
      setManager(q.get('manager') || '');
      setPerson(q.get('person') || '');
    } catch { /* defaults */ }
  }, []);

  useEffect(() => {
    fetch('/api/reporting', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 403) { setState({ status: 'forbidden' }); return; }
        if (!r.ok) { setState({ status: 'error' }); return; }
        setData(await r.json());
        setState({ status: 'ok' });
      })
      .catch(() => setState({ status: 'error' }));
  }, []);

  // Keep the URL in sync with the filters so the current view is shareable.
  useEffect(() => {
    if (state.status !== 'ok') return;
    try {
      const q = new URLSearchParams();
      if (team) q.set('team', team);
      if (manager) q.set('manager', manager);
      if (person) q.set('person', person);
      const qs = q.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    } catch { /* ignore */ }
  }, [team, manager, person, state.status]);

  const filtered = useMemo(() => {
    if (!data?.people) return [];
    const pq = person.trim().toLowerCase();
    let list = data.people.filter((p) =>
      (!team || p.department === team) &&
      (!manager || p.manager === manager) &&
      (!pq || p.name.toLowerCase().includes(pq) || (p.email || '').toLowerCase().includes(pq))
    );
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const va = a[key], vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      return String(va || '').localeCompare(String(vb || '')) * mult;
    });
    return list;
  }, [data, team, manager, person, sort]);

  const overview = useMemo(() => {
    const now = Date.now();
    const active = filtered.filter((p) => p.lastActive && (now - new Date(p.lastActive).getTime()) / 86400000 <= 7).length;
    const lessons = filtered.reduce((s, p) => s + (p.lessonsCompleted || 0), 0);
    const xp = filtered.reduce((s, p) => s + (p.totalXp || 0), 0);
    const avgLevel = filtered.length ? (filtered.reduce((s, p) => s + (p.level || 0), 0) / filtered.length) : 0;
    return { learners: filtered.length, active, lessons, xp, avgLevel };
  }, [filtered]);

  const copyLink = useCallback(() => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, []);

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: COLUMNS.find((c) => c.key === key)?.num ? 'desc' : 'asc' });
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={BarChart3} title="Reporting" subtitle="Team learning activity and progress" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Building the report…
          </div>
        )}

        {state.status === 'forbidden' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 text-center max-w-md mx-auto">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Reporting is for admins &amp; managers</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ask an admin if you think you should have access.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">Couldn&apos;t load the report. Please try again.</div>
        )}

        {state.status === 'ok' && data && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Team</span>
                <select value={team} onChange={(e) => setTeam(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200">
                  <option value="">All teams</option>
                  {data.teams.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Manager</span>
                <select value={manager} onChange={(e) => setManager(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200">
                  <option value="">All managers</option>
                  {data.managers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Person</span>
                <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Search by name or email…" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200" />
              </label>
              {(team || manager || person) && (
                <button onClick={() => { setTeam(''); setManager(''); setPerson(''); }} className="px-3 py-2 text-sm text-slate-500 hover:text-ink dark:hover:text-slate-200">Clear</button>
              )}
              <button onClick={copyLink} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-colors">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Link2 className="w-4 h-4" /> Copy share link</>}
              </button>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Learners" value={overview.learners} sub={`avg level ${overview.avgLevel.toFixed(1)}`} />
              <StatCard icon={Activity} label="Active this week" value={overview.active} sub={overview.learners ? `${Math.round((overview.active / overview.learners) * 100)}% of group` : '—'} />
              <StatCard icon={BookOpen} label="Lessons completed" value={overview.lessons} />
              <StatCard icon={Zap} label="Total XP" value={overview.xp.toLocaleString()} />
            </div>

            {/* People table */}
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
                  {filtered.length === 0 ? (
                    <tr><td colSpan={COLUMNS.length} className="py-10 text-center text-slate-400">No learners match these filters.</td></tr>
                  ) : filtered.map((p) => (
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

            {/* Top topics */}
            {data.topTopics.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
                <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-4">Most-taken topics</h2>
                <div className="space-y-2">
                  {data.topTopics.map((t) => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-ink dark:text-slate-200 truncate">{t.topic}</span>
                      <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{t.count}</span>
                      <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${(t.count / data.topTopics[0].count) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-6">
              Generated {new Date(data.generatedAt).toLocaleString()} · {data.people.length} learners with activity
            </p>
          </>
        )}
      </main>
    </div>
  );
}
