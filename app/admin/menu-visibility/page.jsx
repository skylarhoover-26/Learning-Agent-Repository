'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Eye, Loader2, Shield, User } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// A small on/off pill toggle. `on` = visible to everyone.
function Toggle({ on, onChange, disabled, labelOn = 'Visible', labelOff = 'Coming soon' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center gap-2 shrink-0 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`relative w-10 h-6 rounded-full transition-colors ${
          on ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <span className={`text-xs font-medium w-20 text-left ${on ? 'text-brand' : 'text-slate-400'}`}>
        {on ? labelOn : labelOff}
      </span>
    </button>
  );
}

export default function MenuVisibilityAdminPage() {
  const { previewAsUser, setPreviewAsUser, refresh } = useMenuVisibility();
  const [allowed, setAllowed] = useState(null); // null = checking
  const [catalog, setCatalog] = useState([]);
  // enabled = true means visible. We store the inverse of the API's disabled lists.
  const [sectionOn, setSectionOn] = useState({}); // title -> bool
  const [itemOn, setItemOn] = useState({}); // href -> bool
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
    fetch('/api/menu-visibility')
      .then((r) => (r.ok ? r.json() : { catalog: [], sections: [], items: [] }))
      .then((d) => {
        const cat = Array.isArray(d.catalog) ? d.catalog : [];
        setCatalog(cat);
        const offSections = new Set(d.sections || []);
        const offItems = new Set(d.items || []);
        setSectionOn(Object.fromEntries(cat.map((s) => [s.title, !offSections.has(s.title)])));
        setItemOn(
          Object.fromEntries(cat.flatMap((s) => s.items.map((i) => [i.href, !offItems.has(i.href)]))),
        );
      })
      .catch(() => {});
  }, [allowed]);

  function toggleSection(title, on) {
    setSectionOn((prev) => ({ ...prev, [title]: on }));
    setStatus(null);
  }
  function toggleItem(href, on) {
    setItemOn((prev) => ({ ...prev, [href]: on }));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const sections = catalog.filter((s) => !sectionOn[s.title]).map((s) => s.title);
    const items = catalog.flatMap((s) => s.items).filter((i) => !itemOn[i.href]).map((i) => i.href);
    try {
      const res = await fetch('/api/menu-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, items }),
      });
      if (!res.ok) throw new Error('save failed');
      await refresh(); // sync the live menu/route gating with what we just saved
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Eye} title="Menu Visibility" subtitle="Control what regular users can see" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Eye} title="Menu Visibility" subtitle="Control what regular users can see" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Admins only.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Eye} title="Menu Visibility" subtitle="Control what regular users can see" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">View the app as</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Preview exactly what a regular user sees. Your admin access stays — the Admin menu and a
            &ldquo;Back to admin view&rdquo; button are always there to switch back.
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
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Turn whole sections or individual items off to hide them from regular users — they&apos;ll
            see <span className="font-medium">&ldquo;Coming soon&rdquo;</span> instead and can&apos;t open the page.
            <span className="block mt-1">Admins always see and can use everything, no matter what&apos;s set here. Changes apply right away — no redeploy.</span>
          </p>

          <div className="space-y-6">
            {catalog.map((section) => {
              const secOn = sectionOn[section.title] !== false;
              return (
                <div key={section.title} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-ink dark:text-slate-200">{section.title}</span>
                    <Toggle
                      on={secOn}
                      onChange={(on) => toggleSection(section.title, on)}
                      labelOn="Section on"
                      labelOff="Section off"
                    />
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {section.items.map((item) => (
                      <li key={item.href} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <span className="min-w-0">
                          <span className={`block text-sm ${secOn ? 'text-ink dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                            {item.label}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{item.desc}</span>
                        </span>
                        <Toggle
                          on={secOn && itemOn[item.href] !== false}
                          disabled={!secOn}
                          onChange={(on) => toggleItem(item.href, on)}
                        />
                      </li>
                    ))}
                  </ul>
                  {!secOn && (
                    <p className="px-4 py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10">
                      Whole section hidden — every item above shows &ldquo;Coming soon&rdquo; to regular users.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

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
