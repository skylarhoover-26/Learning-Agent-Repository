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
  const [from, setFrom] = useState(''); // YYYY-MM-DD, set on mount
  const [to, setTo] = useState('');
  const [bounds, setBounds] = useState({ min: '', max: '' }); // date-input limits (last 30 days)
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [publicCopied, setPublicCopied] = useState(false);
  const [minting, setMinting] = useState(false);

  // Set filters + the date range on mount. Default range is the last 14 days;
  // the picker can reach back 30 days (the window the server gathers). Computed
  // here (client-only) rather than at render to avoid an SSR/client date mismatch.
  useEffect(() => {
    const iso = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    const todayStr = iso(now);
    const minStr = iso(new Date(now.getTime() - 29 * 86400000));
    const defFrom = iso(new Date(now.getTime() - 13 * 86400000));
    setBounds({ min: minStr, max: todayStr });
    try {
      const q = new URLSearchParams(window.location.search);
      setTeam(q.get('team') || '');
      setManager(q.get('manager') || '');
      setPerson(q.get('person') || '');
      setFrom(q.get('from') || defFrom);
      setTo(q.get('to') || todayStr);
    } catch {
      setFrom(defFrom);
      setTo(todayStr);
    }
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
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const qs = q.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    } catch { /* ignore */ }
  }, [team, manager, person, from, to, state.status]);

  const filtered = useMemo(() => {
    if (!data?.people) return [];
    const pq = person.trim().toLowerCase();
    return data.people.filter((p) =>
      (!team || p.department === team) &&
      (!manager || p.manager === manager) &&
      (!pq || p.name.toLowerCase().includes(pq) || (p.email || '').toLowerCase().includes(pq))
    );
  }, [data, team, manager, person]);

  // Set of identifiers (email + learnerId) for the people in the current
  // team/manager/person slice — used to scope the engagement series to them.
  const emailSet = useMemo(() => {
    const s = new Set();
    for (const p of filtered) {
      if (p.email) s.add(p.email.toLowerCase());
      if (typeof p.learnerId === 'string') s.add(p.learnerId.toLowerCase());
    }
    return s;
  }, [filtered]);

  const hasPeopleFilter = !!(team || manager || person.trim());

  // The engagement series sliced to the chosen date range. When a team/manager/
  // person filter is active, each day's active count + lessons are recomputed
  // from just that slice; with no filter it stays the app-wide numbers.
  const rangeEngagement = useMemo(() => {
    if (!data?.engagement || !from || !to) return [];
    return data.engagement
      .filter((d) => d.date >= from && d.date <= to)
      .map((d) => {
        if (!hasPeopleFilter) {
          return { date: d.date, activeUsers: d.activeUsers, lessons: d.lessons, events: d.events, active: d.active || [] };
        }
        const active = (d.active || []).filter((a) => emailSet.has((a.email || '').toLowerCase()));
        const lessons = Object.entries(d.lessonsByEmail || {}).reduce((s, [em, n]) => s + (emailSet.has(em) ? n : 0), 0);
        return { date: d.date, activeUsers: active.length, lessons, events: d.events, active };
      });
  }, [data, from, to, hasPeopleFilter, emailSet]);

  // Who showed up at least once in the range (by email/id), so each row can be
  // tagged active/inactive for the selected window.
  const activeEmailsInRange = useMemo(() => {
    const s = new Set();
    for (const d of rangeEngagement) for (const a of (d.active || [])) s.add((a.email || '').toLowerCase());
    return s;
  }, [rangeEngagement]);

  const peopleWithStatus = useMemo(() => filtered.map((p) => ({
    ...p,
    activeInRange: activeEmailsInRange.has((p.email || '').toLowerCase())
      || activeEmailsInRange.has(String(p.learnerId).toLowerCase()),
  })), [filtered, activeEmailsInRange]);

  const overview = useMemo(() => ({
    learners: filtered.length,
    active: peopleWithStatus.filter((p) => p.activeInRange).length,
    lessons: rangeEngagement.reduce((s, d) => s + (d.lessons || 0), 0),
    xp: filtered.reduce((s, p) => s + (p.totalXp || 0), 0),
    avgLevel: filtered.length ? filtered.reduce((s, p) => s + (p.level || 0), 0) / filtered.length : 0,
  }), [filtered, peopleWithStatus, rangeEngagement]);

  const rangeLabel = useMemo(() => {
    const fmt = (d) => { try { return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return d; } };
    return from && to ? `${fmt(from)} – ${fmt(to)}` : '';
  }, [from, to]);

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
            {/* Filters — team / manager / person on top, date range below. They
                all scope the report: the cards, engagement chart, learners-by-team
                and the people table react together. */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
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
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date range</span>
                  <div className="flex items-center gap-2">
                    <input type="date" value={from} min={bounds.min} max={to || bounds.max} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200" />
                    <span className="text-sm text-slate-400">to</span>
                    <input type="date" value={to} min={from || bounds.min} max={bounds.max} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200" />
                  </div>
                </label>
              </div>
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

            <ReportView
              people={peopleWithStatus}
              overview={overview}
              engagement={rangeEngagement}
              activityByType={data.activityByType}
              showActiveStatus
              hideTeamChart={!!person.trim()}
              rangeLabel={rangeLabel}
              activeLabel="Active"
              activeSub={rangeLabel ? `in ${rangeLabel}` : undefined}
              lessonsSub={rangeLabel ? `in ${rangeLabel}` : undefined}
            />

            <p className="text-center text-xs text-slate-400 mt-6">
              Generated {new Date(data.generatedAt).toLocaleString()} · {data.people.length} learners with activity
            </p>
          </>
        )}
      </main>
    </div>
  );
}
