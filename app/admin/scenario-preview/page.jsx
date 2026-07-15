'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { FlaskConical, Loader2, Clock } from 'lucide-react';
import { CALIBRATION_SKILL_ORDER, SCENARIO_BY_ID } from '@/lib/calibration-scenarios';

// Admin-only: preview what the calibration generator produces for a given role,
// so we can tune the prompt against real output without retaking the gate.
export default function ScenarioPreviewPage() {
  const [allowed, setAllowed] = useState(null);
  const [form, setForm] = useState({ title: '', department: '', sub_team: '', tier: '', goal: '', top_tasks: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check').then((r) => r.json()).then((d) => setAllowed(!!d.isAdmin)).catch(() => setAllowed(false));
  }, []);

  // Prefill from the admin's own profile as a convenient starting point.
  useEffect(() => {
    if (!allowed) return;
    fetch('/api/user-data?type=profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        let p = j?.data;
        if (p?.data?.department) p = p.data;
        if (!p) return;
        setForm((f) => ({
          ...f,
          title: p.title || p.job_title || '',
          department: p.department || '',
          sub_team: p.sub_team || p.team || '',
          tier: p.tier || '',
          goal: p.goal || '',
          top_tasks: Array.isArray(p.top_tasks) ? p.top_tasks.join(', ') : (p.top_tasks || ''),
        }));
      })
      .catch(() => {});
  }, [allowed]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function generate() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/scenario-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (allowed === null) {
    return <Wrap><p className="text-center text-slate-500 dark:text-slate-400 py-10">Checking…</p></Wrap>;
  }
  if (!allowed) {
    return <Wrap><p className="text-center text-slate-500 dark:text-slate-400 py-10">Admins only.</p></Wrap>;
  }

  // Show the COMPLETE set a learner would actually see: generated where it came
  // back cleanly, curated fallback for any skill that didn't — the same merge the
  // real calibration flow does. Without this, a slow/partial generation shows a
  // blank result and you "can't see anything."
  const merged = result
    ? CALIBRATION_SKILL_ORDER.map((id) => {
        const gen = result.scenarios?.[id];
        return gen
          ? { ...gen, _source: 'generated' }
          : (SCENARIO_BY_ID[id] ? { ...SCENARIO_BY_ID[id], _source: 'curated' } : null);
      }).filter(Boolean)
    : [];

  return (
    <Wrap>
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-6">
        <div className="rounded-2xl border border-brand-200 dark:border-slate-600 bg-brand-50/60 dark:bg-slate-800/60 p-5">
          <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">What this is</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            These are the <strong>placement questions</strong> a learner sees in the onboarding
            calibration gate — the same scenarios you can normally only see by resetting your own
            calibration. The role below is <strong>prefilled from your profile</strong>, so hit
            Generate to preview your own set (no reset needed). AI tailors each scenario to the role;
            any skill that doesn&apos;t generate shows the <strong>curated fallback</strong> instead, and
            every card below is tagged so you know which is which.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Role to preview <span className="text-slate-400">(edit to try any other role)</span>:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Title" value={form.title} onChange={set('title')} placeholder="Senior Associate, AI Solutions" />
            <Field label="Department" value={form.department} onChange={set('department')} placeholder="AI Solutions" />
            <Field label="Sub-team" value={form.sub_team} onChange={set('sub_team')} placeholder="Applied AI" />
            <Field label="Tier / level" value={form.tier} onChange={set('tier')} placeholder="power_user" />
          </div>
          <Field label="Goal" value={form.goal} onChange={set('goal')} placeholder="ship internal AI tools that save teams time" />
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Top tasks (comma-separated)</label>
            <textarea
              value={form.top_tasks} onChange={set('top_tasks')} rows={2}
              placeholder="build internal AI agents, prompt engineering for features, evaluate model outputs"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200"
            />
          </div>
          <button
            onClick={generate} disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 transition-all"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            {busy ? 'Generating…' : 'Generate scenarios'}
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200">
                <Clock className="w-3.5 h-3.5" /> {(result.durationMs / 1000).toFixed(1)}s on {result.model}
              </span>
              <span className={`px-3 py-1 rounded-pill ${result.generatedSkills.length === 6 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {result.generatedSkills.length}/6 skills generated{result.generatedSkills.length < 6 ? ' — rest shown from curated fallback below' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This is the full set a learner in this role would see, in order. Cards are tagged by source.
            </p>
            {merged.map((s) => {
              const isGen = s._source === 'generated';
              return (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-brand">{s.primary}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-pill ${
                      isGen ? 'bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {isGen ? 'AI-generated' : 'Curated fallback'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{s.setup}</p>
                  <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-3">{s.prompt}</p>
                  <ul className="space-y-2">
                    {s.answers.map((a, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                        <span className="font-mono text-xs text-slate-400 shrink-0">{JSON.stringify(a.scores)}</span>
                        <span>{a.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Wrap>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200"
      />
    </div>
  );
}

function Wrap({ children }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={FlaskConical} title="Calibration Scenario Preview" subtitle="See the onboarding placement questions a learner gets — admin only" />
      {children}
    </div>
  );
}
