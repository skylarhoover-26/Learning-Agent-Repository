'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Bell, Plus, Trash2, Loader2, Send } from 'lucide-react';

export default function NotificationsAdminPage() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [emails, setEmails] = useState([]);
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
    fetch('/api/admin/notify-allowlist')
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((d) => setEmails(Array.isArray(d.emails) ? d.emails : []))
      .catch(() => {});
  }, [allowed]);

  async function save(next) {
    setEmails(next);
    setBusy(true);
    setStatus(null);
    try {
      await fetch('/api/admin/notify-allowlist', {
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
    if (!e.includes('@') || emails.includes(e)) return;
    setInput('');
    save([...emails, e]);
  }

  function removeEmail(e) {
    save(emails.filter((x) => x !== e));
  }

  async function sendNow() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/notifications/send', { method: 'POST' });
      const data = await res.json();
      setStatus(res.ok ? `sent:${data.sent}/${data.recipients}` : 'error');
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
        <main className="max-w-3xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">
          Admins only.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Only people on this list receive the daily Slack push. Add or remove by email anytime —
            no redeploy needed. The daily send is triggered by the n8n schedule.
          </p>

          <div className="flex items-center gap-2 mb-4">
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

          {emails.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No recipients yet — add someone above.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((e) => (
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
            </ul>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={sendNow}
              disabled={busy || emails.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 transition-all shadow-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send now (test)
            </button>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Something went wrong</span>}
            {status?.startsWith('sent:') && (
              <span className="text-sm text-green-600 dark:text-green-400">Sent {status.slice(5)} DMs</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
