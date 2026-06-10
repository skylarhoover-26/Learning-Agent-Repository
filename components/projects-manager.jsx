'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function ProjectsManager() {
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/user-data?type=work_projects')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.data)) setProjects(d.data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function persist(next) {
    setProjects(next);
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'work_projects', data: next }),
      });
    } catch {
      // best-effort
    }
  }

  async function addProject() {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    const project = {
      id: `wp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: t,
      description: description.trim(),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    await persist([project, ...projects]);
    setTitle('');
    setDescription('');
    setShowForm(false);
    setBusy(false);
  }

  async function removeProject(id) {
    if (busy) return;
    setBusy(true);
    await persist(projects.filter((p) => p.id !== id));
    setBusy(false);
  }

  const active = projects.filter((p) => p.status !== 'completed');

  return (
    <>
      <div className="space-y-4 mb-8">
        {!loaded ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse h-20" />
        ) : (
          active.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ink dark:text-slate-200 mb-1">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
                  <span className="inline-block mt-2 text-xs text-slate-500 dark:text-slate-400 bg-bg-subtle dark:bg-slate-700 px-2 py-1 rounded">
                    {p.status || 'active'}
                  </span>
                </div>
                <button
                  onClick={() => removeProject(p.id)}
                  disabled={busy}
                  aria-label="Delete project"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8">
        {showForm ? (
          <div className="space-y-3">
            <h3 className="font-bold text-ink dark:text-slate-200 text-center">Add a work project</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(); } }}
              placeholder="Project title (e.g., Q3 onboarding revamp)"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's it about? (optional) — helps tailor your lessons"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand resize-none"
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={addProject}
                disabled={!title.trim() || busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Add project
              </button>
              <button
                onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}
                className="px-4 py-2.5 rounded-pill border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-3 flex items-center justify-center">
              <Plus className="w-6 h-6 text-brand" />
            </div>
            <h3 className="font-bold text-ink dark:text-slate-200 mb-1">Add a work project</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Lessons will be personalized to your real work.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
            >
              Add Project
            </button>
          </div>
        )}
      </div>
    </>
  );
}
