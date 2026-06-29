'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/page-header';
import { BarChart3, Link2, Check, Loader2, Globe } from 'lucide-react';
import ReportView from '@/components/report-view';

export default function ReportingPage() {
  const [state, setState] = useState({ status: 'loading' }); // loading | forbidden | error | ok
  const [data, setData] = useState(null);
  const [team, setTeam] = useState('');
  const [manager, setManager] = useState('');
  const [person, setPerson] = useState('');
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [publicCopied, setPublicCopied] = useState(false);
  const [minting, setMinting] = useState(false);

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
        if (r.status === 403 || r.status === 401) { setState({ status: 'forbidden' }); return; }
        if (!r.ok) { setState({ status: 'error' }); return; }
        setData(await r.json());
        setState({ status: 'ok' });
      })
      .catch(() => setState({ status: 'error' }));
  }, []);

  // Keep the URL in sync with filters so the current view is shareable. Reset any
  // minted public link when filters change (it was scoped to the old filters).
  useEffect(() => {
    if (state.status !== 'ok') return;
    setPublicUrl('');
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
    return data.people.filter((p) =>
      (!team || p.department === team) &&
      (!manager || p.manager === manager) &&
      (!pq || p.name.toLowerCase().includes(pq) || (p.email || '').toLowerCase().includes(pq))
    );
  }, [data, team, manager, person]);

  const overview = useMemo(() => {
    const now = Date.now();
    const active = filtered.filter((p) => p.lastActive && (now - new Date(p.lastActive).getTime()) / 86400000 <= 7).length;
    return {
      learners: filtered.length,
      active,
      lessons: filtered.reduce((s, p) => s + (p.lessonsCompleted || 0), 0),
      xp: filtered.reduce((s, p) => s + (p.totalXp || 0), 0),
      avgLevel: filtered.length ? filtered.reduce((s, p) => s + (p.level || 0), 0) / filtered.length : 0,
    };
  }, [filtered]);

  const copyViewLink = useCallback(() => {
    try { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  }, []);

  const createPublicLink = useCallback(async () => {
    setMinting(true);
    try {
      const res = await fetch('/api/reporting/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: { team, manager, person } }),
      });
      if (!res.ok) throw new Error('mint failed');
      const { token } = await res.json();
      const url = `${window.location.origin}/reporting/shared/${token}`;
      setPublicUrl(url);
      try { await navigator.clipboard.writeText(url); setPublicCopied(true); setTimeout(() => setPublicCopied(false), 2000); } catch { /* */ }
    } catch { /* best-effort */ } finally { setMinting(false); }
  }, [team, manager, person]);

  return (
    <div className="min-h-screen">
      <PageHeader icon={BarChart3} title="Reporting" subtitle="Team learning activity and progress" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Building the report…</div>
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
            <div className="flex flex-wrap items-end gap-3 mb-4">
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
            </div>

            {/* Share controls */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button onClick={copyViewLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Link2 className="w-4 h-4" /> Copy view link</>}
                <span className="text-xs text-slate-400 font-normal">(needs login)</span>
              </button>
              <button onClick={createPublicLink} disabled={minting} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                {minting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Create public link
              </button>
              {publicUrl && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input readOnly value={publicUrl} className="flex-1 min-w-[240px] px-3 py-2 rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50/40 dark:bg-slate-800 text-xs text-ink dark:text-slate-200" onFocus={(e) => e.target.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(publicUrl); setPublicCopied(true); setTimeout(() => setPublicCopied(false), 2000); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    {publicCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
            {publicUrl && <p className="text-xs text-slate-400 mb-6 -mt-3">Anyone with this link can view this exact slice (no login needed). It expires in 90 days.</p>}

            <ReportView people={filtered} overview={overview} engagement={data.engagement} activityByType={data.activityByType} />

            <p className="text-center text-xs text-slate-400 mt-6">
              Generated {new Date(data.generatedAt).toLocaleString()} · {data.people.length} learners with activity
            </p>
          </>
        )}
      </main>
    </div>
  );
}
