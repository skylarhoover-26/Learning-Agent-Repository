'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { SlidersHorizontal, Loader2, RotateCcw } from 'lucide-react';

const LEVEL_OPTIONS = ['beginner', 'intermediate', 'advanced'];

export default function SkillLevelsAdminPage() {
  return <CinematicFrame><SkillLevelsAdminPageInner /></CinematicFrame>;
}

function SkillLevelsAdminPageInner() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [catalog, setCatalog] = useState([]);
  const [levels, setLevels] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/skill-levels')
      .then((r) => (r.ok ? r.json() : { catalog: [], levels: {} }))
      .then((d) => {
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
        setLevels(d.levels || {});
      })
      .catch(() => {});
  }, [allowed]);

  function setLevel(name, level) {
    setLevels((prev) => ({ ...prev, [name]: level }));
    setStatus(null);
  }

  function resetToDefaults() {
    setLevels(Object.fromEntries(catalog.map((s) => [s.name, s.defaultLevel])));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/skill-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels }),
      });
      if (!res.ok) throw new Error('save failed');
      const d = await res.json();
      setLevels(d.levels || levels);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={SlidersHorizontal} title="Skill Levels" subtitle="Set the difficulty level of each AI skill" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={SlidersHorizontal} title="Skill Levels" subtitle="Set the difficulty level of each AI skill" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Admins only.</main>
      </div>
    );
  }

  // Group skills by category, preserving catalog order.
  const categories = [];
  for (const skill of catalog) {
    let group = categories.find((c) => c.name === skill.category);
    if (!group) {
      group = { name: skill.category, skills: [] };
      categories.push(group);
    }
    group.skills.push(skill);
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={SlidersHorizontal} title="Skill Levels" subtitle="Set the difficulty level of each AI skill" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            These levels decide who gets recommended each topic. Beginners only see
            beginner topics, practitioners see beginner + intermediate, and power users
            and above see everything. Changes apply everywhere recommendations appear —
            no redeploy needed.
          </p>

          <div className="space-y-6">
            {categories.map((group) => (
              <div key={group.name}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {group.name}
                </p>
                <ul className="space-y-2">
                  {group.skills.map((skill) => {
                    const current = levels[skill.name] || skill.defaultLevel;
                    const changed = current !== skill.defaultLevel;
                    return (
                      <li
                        key={skill.name}
                        className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700"
                      >
                        <span className="text-sm text-ink dark:text-slate-200">
                          {skill.name}
                          {changed && (
                            <span className="ml-2 text-[11px] text-amber-600 dark:text-amber-400">
                              (default: {skill.defaultLevel})
                            </span>
                          )}
                        </span>
                        <select
                          value={current}
                          onChange={(e) => setLevel(skill.name, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
                        >
                          {LEVEL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="capitalize">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 transition-all shadow-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save levels
            </button>
            <button
              onClick={resetToDefaults}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" /> Reset to defaults
            </button>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Something went wrong</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
