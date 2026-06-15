'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Shield, Plus, Trash2, Lock } from 'lucide-react';

export default function AdminsPage() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [seed, setSeed] = useState([]);
  const [extra, setExtra] = useState([]);
  const [input, setInput] = useState('');
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
    fetch('/api/admin/admins')
      .then((r) => (r.ok ? r.json() : { seed: [], extra: [] }))
      .then((d) => {
        setSeed(Array.isArray(d.seed) ? d.seed : []);
        setExtra(Array.isArray(d.extra) ? d.extra : []);
      })
      .catch(() => {});
  }, [allowed]);

  async function save(next) {
    setExtra(next);
    setBusy(true);
    setStatus(null);
    try {
      await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: next }),
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  function addEmail() {
    const e = input.trim().toLowerCase();
    if (!e.includes('@') || extra.includes(e) || seed.includes(e)) return;
    setInput('');
    save([...extra, e]);
  }

  function removeEmail(e) {
    save(extra.filter((x) => x !== e));
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Shield} title="Admins" subtitle="Who has admin access" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Shield} title="Admins" subtitle="Who has admin access" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Admins only.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Shield} title="Admins" subtitle="Who has admin access" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            Admins can see the Admin section and manage settings. Add or remove people by
            email anytime — no redeploy needed. Anyone you add here can also manage admins.
          </p>

          <div className="flex items-center gap-2 mb-5">
            <input
              type="email"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              placeholder="name@housecallpro.com"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
            />
            <button
              onClick={addEmail}
              disabled={!input.trim() || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-all"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <ul className="space-y-2">
            {seed.map((e) => (
              <li key={e} className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-ink dark:text-slate-200">{e}</span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Lock className="w-3 h-3" /> Seed (set in Vercel)
                </span>
              </li>
            ))}
            {extra.map((e) => (
              <li key={e} className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-sm text-ink dark:text-slate-200">{e}</span>
                <button
                  onClick={() => removeEmail(e)}
                  disabled={busy}
                  aria-label="Remove"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
            {seed.length === 0 && extra.length === 0 && (
              <li className="text-sm text-slate-400 italic">No admins yet — add someone above.</li>
            )}
          </ul>

          {status === 'saved' && <p className="mt-4 text-sm text-green-600 dark:text-green-400">Saved</p>}
          {status === 'error' && <p className="mt-4 text-sm text-red-600 dark:text-red-400">Something went wrong</p>}
        </div>
      </main>
    </div>
  );
}
