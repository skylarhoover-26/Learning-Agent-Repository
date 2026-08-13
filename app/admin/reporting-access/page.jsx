'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { ShieldCheck, Loader2, Plus, X, Save } from 'lucide-react';

// Who can open reporting, beyond admins and managers.
//
// This is how a report gets shared: add someone here and send them the URL. Okta
// proves who they are, this list decides whether they get in. There is no token
// link on purpose — one existed in June and was removed the same day, once the
// report started showing the full roster including who had never signed in.
// A named list can be revoked, is attributable, and can't be forwarded.

export default function ReportingAccessAdminPage() {
  return <CinematicFrame><ReportingAccessAdminPageInner /></CinematicFrame>;
}

function ReportingAccessAdminPageInner() {
  const [allowed, setAllowed] = useState(null);
  const [emails, setEmails] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/reporting-access', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setAllowed(!!d?.isAdmin);
        setEmails(Array.isArray(d?.emails) ? d.emails : []);
      })
      .catch(() => { setAllowed(false); setEmails([]); });
  }, []);

  function add() {
    const e = input.trim().toLowerCase();
    if (!e.includes('@')) { setStatus('That does not look like an email address.'); return; }
    if (emails.includes(e)) { setStatus('Already on the list.'); setInput(''); return; }
    setEmails((prev) => [...prev, e]);
    setInput('');
    setStatus(null);
  }

  function remove(email) {
    setEmails((prev) => prev.filter((e) => e !== email));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/reporting-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Save failed');
      setEmails(d.emails || emails);
      setStatus('saved');
    } catch (e) {
      setStatus(e.message || 'Save failed');
    }
    setBusy(false);
  }

  if (allowed === null || emails === null) return <Shell><Center>Checking…</Center></Shell>;
  if (!allowed) return <Shell><Center>Admins only.</Center></Shell>;

  return (
    <Shell>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Admins and anyone with direct reports can already open reporting. Add people here to give
          them the same view without making them an admin.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          To share a report, add the person and send them{' '}
          <code className="text-xs">/reporting/data</code>. They sign in with their Housecall Pro
          account, so access is revocable and the link is useless to anyone else.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="name@housecallpro.com"
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-2">
        {emails.map((e) => (
          <div key={e} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5">
            <span className="text-sm text-ink dark:text-slate-200 flex-1 truncate">{e}</span>
            <button
              type="button"
              onClick={() => remove(e)}
              aria-label={`Remove ${e}`}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!emails.length && (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
            Nobody added yet — reporting is admins and managers only.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save access list
        </button>
        {status === 'saved' && <span className="text-sm font-semibold text-green-600">Saved.</span>}
        {status && status !== 'saved' && <span className="text-sm font-semibold text-red-600">{status}</span>}
      </div>
    </Shell>
  );
}

function Center({ children }) {
  return <p className="text-center text-slate-500 dark:text-slate-400">{children}</p>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={ShieldCheck} title="Reporting Access" subtitle="Who can see org-wide learning data" />
      <main className="max-w-2xl mx-auto px-6 pt-6 pb-10 space-y-4">{children}</main>
    </div>
  );
}
