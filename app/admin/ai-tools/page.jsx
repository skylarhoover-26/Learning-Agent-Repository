'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { AI_TOOLS } from '@/lib/ai-tools';
import { Wrench, Loader2, RotateCcw, Sparkles } from 'lucide-react';

const DEFAULTS = Object.fromEntries(AI_TOOLS.map((t) => [t.id, t]));

// Admin screen to edit the AI tool catalog — what each tool is "best for", its
// label, and its URL. This is the single place that keeps the catalog current as
// the AI landscape shifts; "Suggest updates" drafts refreshed descriptions with
// AI for the admin to review before saving. Changes apply everywhere, no deploy.
export default function AiToolsAdminPage() {
  return <CinematicFrame><AiToolsAdminPageInner /></CinematicFrame>;
}

function AiToolsAdminPageInner() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [form, setForm] = useState({}); // id -> { label, strengths, url }
  const [suggestions, setSuggestions] = useState({}); // id -> { strengths, reason, changed }
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/ai-tools')
      .then((r) => (r.ok ? r.json() : { tools: AI_TOOLS }))
      .then((d) => seedForm(Array.isArray(d.tools) && d.tools.length ? d.tools : AI_TOOLS))
      .catch(() => seedForm(AI_TOOLS));
  }, [allowed]);

  function seedForm(tools) {
    const next = {};
    for (const t of tools) {
      next[t.id] = { label: t.label || '', strengths: t.strengths || '', url: t.url || '' };
    }
    setForm(next);
  }

  function setField(id, field, value) {
    setForm((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setStatus(null);
  }

  function resetTool(id) {
    const d = DEFAULTS[id];
    setForm((prev) => ({ ...prev, [id]: { label: d.label, strengths: d.strengths, url: d.url || '' } }));
    setSuggestions((prev) => ({ ...prev, [id]: undefined }));
    setStatus(null);
  }

  async function suggest() {
    setSuggesting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ai-tools/suggest', { method: 'POST' });
      if (!res.ok) throw new Error('suggest failed');
      const d = await res.json();
      const map = {};
      for (const s of d.suggestions || []) {
        if (s && s.id) map[s.id] = { strengths: s.strengths || '', reason: s.reason || '', changed: !!s.changed };
      }
      setSuggestions(map);
    } catch {
      setStatus('suggest-error');
    }
    setSuggesting(false);
  }

  function applySuggestion(id) {
    const s = suggestions[id];
    if (!s) return;
    setField(id, 'strengths', s.strengths);
    setSuggestions((prev) => ({ ...prev, [id]: undefined }));
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: form }),
      });
      if (!res.ok) throw new Error('save failed');
      const d = await res.json();
      if (Array.isArray(d.tools)) seedForm(d.tools);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null || !allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Wrench} title="AI Tools" subtitle="Edit what each AI tool is good for" />
        <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">
          {allowed === null ? 'Checking…' : 'Admins only.'}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Wrench} title="AI Tools" subtitle="Edit what each AI tool is good for" />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              These descriptions tell learners — and the coach — what each tool is best for. Edit them as the AI
              landscape shifts. Changes apply everywhere (My AI Tools, onboarding, lessons), no redeploy needed.
              &ldquo;Suggest updates&rdquo; drafts refreshed wording with AI for you to review — always sanity-check it.
            </p>
            <button
              onClick={suggest}
              disabled={suggesting}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
            >
              {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Suggest updates
            </button>
          </div>

          <ul className="space-y-4">
            {AI_TOOLS.map((base) => {
              const id = base.id;
              const f = form[id] || { label: '', strengths: '', url: '' };
              const sug = suggestions[id];
              return (
                <li key={id} className="rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{base.emoji}</span>
                    <input
                      value={f.label}
                      onChange={(e) => setField(id, 'label', e.target.value)}
                      className="font-semibold text-ink dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand focus:outline-none"
                    />
                    <button
                      onClick={() => resetTool(id)}
                      title="Reset to default"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>

                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                    Best for
                  </label>
                  <textarea
                    value={f.strengths}
                    onChange={(e) => setField(id, 'strengths', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand resize-none"
                  />

                  {sug && sug.changed && sug.strengths && sug.strengths !== f.strengths && (
                    <div className="mt-2 rounded-lg bg-brand-50 dark:bg-slate-700/50 border border-brand-100 dark:border-slate-600 p-2.5">
                      <p className="text-xs text-ink dark:text-slate-200">
                        <span className="font-semibold">Suggested:</span> {sug.strengths}
                      </p>
                      {sug.reason && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sug.reason}</p>}
                      <button
                        onClick={() => applySuggestion(id)}
                        className="mt-1.5 text-xs font-medium text-brand dark:text-brand-200 hover:underline"
                      >
                        Use this
                      </button>
                    </div>
                  )}

                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1 mt-3">
                    URL
                  </label>
                  <input
                    value={f.url}
                    onChange={(e) => setField(id, 'url', e.target.value)}
                    placeholder="https://…"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
                  />
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 transition-all shadow-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save catalog
            </button>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Something went wrong</span>}
            {status === 'suggest-error' && <span className="text-sm text-red-600 dark:text-red-400">Couldn&rsquo;t fetch suggestions</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
