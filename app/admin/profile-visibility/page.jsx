'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Eye, EyeOff, Clock, Loader2, Shield, User, UserCog } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Three states an item can be in, in display order.
const STATES = [
  { key: 'visible', label: 'Visible', icon: Eye, on: 'bg-brand text-white' },
  { key: 'coming_soon', label: 'Coming soon', icon: Clock, on: 'bg-amber-500 text-white' },
  { key: 'hidden', label: 'Hidden', icon: EyeOff, on: 'bg-slate-600 text-white dark:bg-slate-500' },
];

function TriToggle({ value, onChange }) {
  return (
    <div role="radiogroup" className="inline-flex shrink-0 rounded-pill border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
      {STATES.map((s) => {
        const on = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.key)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium transition-colors ${
              on ? s.on : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileVisibilityAdminPage() {
  const { previewAsUser, setPreviewAsUser, refresh } = useMenuVisibility();
  const [allowed, setAllowed] = useState(null); // null = checking
  const [catalog, setCatalog] = useState([]);
  const [itemState, setItemState] = useState({}); // href -> state
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
    fetch('/api/profile-visibility', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { catalog: [], items: [], hiddenItems: [] }))
      .then((d) => {
        const cat = Array.isArray(d.catalog) ? d.catalog : [];
        setCatalog(cat);
        const coming = new Set(d.items || []);
        const hidden = new Set(d.hiddenItems || []);
        setItemState(
          Object.fromEntries(cat.map((i) => [i.href, hidden.has(i.href) ? 'hidden' : coming.has(i.href) ? 'coming_soon' : 'visible'])),
        );
      })
      .catch(() => {});
  }, [allowed]);

  function setItem(href, state) {
    setItemState((prev) => ({ ...prev, [href]: state }));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const items = [];
    const hiddenItems = [];
    for (const item of catalog) {
      const is = itemState[item.href] || 'visible';
      if (is === 'hidden') hiddenItems.push(item.href);
      else if (is === 'coming_soon') items.push(item.href);
    }
    try {
      const res = await fetch('/api/profile-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, hiddenItems }),
      });
      if (!res.ok) throw new Error('save failed');
      await refresh();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={UserCog} title="Profile Visibility" subtitle="Control what regular users see in the profile menu" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={UserCog} title="Profile Visibility" subtitle="Control what regular users see in the profile menu" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Admins only.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={UserCog} title="Profile Visibility" subtitle="Control what regular users see in the profile menu" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">View the app as</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Preview exactly what a regular user sees. Your admin access stays — a &ldquo;Back to admin
            view&rdquo; button is always in the profile menu to switch back.
          </p>
          <div className="inline-flex rounded-pill border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setPreviewAsUser(false)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-sm font-semibold transition-colors ${
                !previewAsUser ? 'bg-brand text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
            <button
              type="button"
              onClick={() => setPreviewAsUser(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-sm font-semibold transition-colors ${
                previewAsUser ? 'bg-brand text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <User className="w-4 h-4" /> Regular user
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Set each profile menu item for regular users:</p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 mb-6 space-y-1">
            <li><span className="inline-flex items-center gap-1 font-medium text-brand"><Eye className="w-3.5 h-3.5" /> Visible</span> — shown and usable.</li>
            <li><span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"><Clock className="w-3.5 h-3.5" /> Coming soon</span> — shown greyed as a teaser; the page is locked.</li>
            <li><span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300"><EyeOff className="w-3.5 h-3.5" /> Hidden</span> — removed completely; no menu entry.</li>
            <li className="pt-1">Log out and admin controls are always available. Changes apply right away — no redeploy.</li>
          </ul>

          <ul className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {catalog.map((item) => {
              const effective = itemState[item.href] || 'visible';
              return (
                <li key={item.href} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className={`block text-sm ${effective === 'visible' ? 'text-ink dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{item.desc}</span>
                  </span>
                  <TriToggle value={effective} onChange={(state) => setItem(item.href, state)} />
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
              Save changes
            </button>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Something went wrong</span>}
          </div>
        </div>
      </main>
    </div>
  );
}
