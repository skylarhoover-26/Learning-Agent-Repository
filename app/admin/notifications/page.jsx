'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { Bell, Plus, Trash2, Loader2, Send, History, CheckCircle2, AlertTriangle } from 'lucide-react';

// A 'catchup' row means the 9:30 cron didn't fire and the hour-later safety net
// covered it. Labelled distinctly on purpose: it's a signal, not a normal send.
const TRIGGER_LABEL = {
  cron: 'Automatic (weekday)',
  catchup: 'Catch-up (9:30 run missed)',
  manual: 'Manual send',
  n8n: 'n8n schedule',
};

function formatSentAt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function NotificationsAdminPage() {
  return <CinematicFrame><NotificationsAdminPageInner /></CinematicFrame>;
}

function NotificationsAdminPageInner() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [emails, setEmails] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState([]);
  // Whether learners can take a lesson inside Slack. null = still loading.
  const [slackLesson, setSlackLesson] = useState(null);
  const [togglingLesson, setTogglingLesson] = useState(false);
  // Why a save didn't stick. Without this the toggle just silently snapped back to
  // Off, which is indistinguishable from never having clicked it — that cost real
  // debugging time when the config write wasn't landing.
  const [lessonError, setLessonError] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  async function loadLog() {
    try {
      const r = await fetch('/api/admin/notifications/log');
      const d = r.ok ? await r.json() : { entries: [] };
      setLog(Array.isArray(d.entries) ? d.entries : []);
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/admin/slack-lesson')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setSlackLesson(d.enabled === true))
      .catch(() => setSlackLesson(false));
    fetch('/api/admin/notify-allowlist')
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((d) => setEmails(Array.isArray(d.emails) ? d.emails : []))
      .catch(() => {});
    loadLog();
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

  async function toggleSlackLesson() {
    const next = !slackLesson;
    setTogglingLesson(true);
    setLessonError(null);
    // Optimistic, then corrected from the response — the server is the authority on
    // what's actually stored.
    setSlackLesson(next);
    try {
      const res = await fetch('/api/admin/slack-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSlackLesson(!next);
        setLessonError(
          res.status === 403
            ? "You're not an admin on this account, so this can't be changed here."
            : `Couldn't save (${res.status}${data.error ? `: ${data.error}` : ''}). Nothing changed.`
        );
        return;
      }
      setSlackLesson(data.enabled === true);
      // The server echoes what it actually stored. A mismatch means the write didn't
      // take, and saying so beats showing a switch that lies about the real state.
      if (data.enabled !== next) {
        setLessonError('The server saved a different value than requested. Reload to see the real state.');
      }
    } catch (error) {
      setSlackLesson(!next);
      setLessonError(`Couldn't reach the server (${error.message}). Nothing changed.`);
    } finally {
      setTogglingLesson(false);
    }
  }

  async function sendNow() {
    const count = emails.length;
    if (count === 0) return;
    // Real broadcast, not a private preview — make the admin confirm exactly
    // who gets DM'd right now so nobody fires it at the group by accident.
    const ok = window.confirm(
      `Send today's pick to ${count} ${count === 1 ? 'person' : 'people'} RIGHT NOW?\n\n` +
      `${emails.join('\n')}\n\n` +
      `This sends a real Slack DM to everyone above — it is not a private test.`
    );
    if (!ok) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/notifications/send', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
      } else if (data.failed > 0) {
        const firstErr = (data.results || []).find((r) => !r.ok)?.error || 'unknown';
        setStatus(`partial:${data.sent}/${data.recipients}:${firstErr}`);
      } else if (data.logged === false) {
        // Delivered, but the send log write failed — so Recent sends below won't
        // list it. Say so, otherwise the missing row reads as "it didn't send".
        setStatus(`unlogged:${data.sent}/${data.recipients}`);
      } else {
        setStatus(`sent:${data.sent}/${data.recipients}`);
      }
      loadLog();
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  if (allowed === null) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
        <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">Checking…</main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
        <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">
          Admins only.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Bell} title="Notifications" subtitle="Who receives Slack notifications" />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Only people on this list receive the daily Slack push. Add or remove by email anytime —
            no redeploy needed. The daily pick is sent automatically every weekday morning (~9:30am PT).
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
              {emails.length === 0
                ? 'Send now'
                : `Send to ${emails.length} ${emails.length === 1 ? 'person' : 'people'} now`}
            </button>
            {status === 'saved' && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
            {status === 'error' && <span className="text-sm text-red-600 dark:text-red-400">Something went wrong</span>}
            {status?.startsWith('sent:') && (
              <span className="text-sm text-green-600 dark:text-green-400">Sent {status.slice(5)} DMs</span>
            )}
            {status?.startsWith('partial:') && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Sent {status.split(':')[1]} DMs — Slack error: <code className="font-mono">{status.split(':').slice(2).join(':')}</code>
              </span>
            )}
            {status?.startsWith('unlogged:') && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Sent {status.slice(9)} DMs — but the send log couldn&rsquo;t be written, so this send won&rsquo;t appear in Recent sends below. Delivery was fine.
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink dark:text-slate-100">Lessons inside Slack</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Adds a <strong>Take it here in Slack</strong> button to the daily DM. Teach steps arrive as
                messages, activities open in a Slack window, and finishing awards the same XP as the app.
                Off means the button is hidden rather than left there doing nothing.
              </p>
            </div>
            <button
              onClick={toggleSlackLesson}
              disabled={slackLesson === null || togglingLesson}
              role="switch"
              aria-checked={slackLesson === true}
              aria-label="Lessons inside Slack"
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                slackLesson ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  slackLesson ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
          <p className="text-sm mt-3 font-medium">
            {slackLesson === null ? (
              <span className="text-slate-400">Checking…</span>
            ) : slackLesson ? (
              <span className="text-green-600 dark:text-green-400">On — recipients can take today&rsquo;s pick in Slack.</span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Off — the daily DM links to the app only.</span>
            )}
          </p>
          {lessonError && (
            <p className="text-sm mt-2 text-red-600 dark:text-red-400 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{lessonError}</span>
            </p>
          )}
        </div>

        <SendHistory log={log} onRefresh={loadLog} />
      </main>
    </div>
  );
}

// Pulse check: confirms each daily-pick send actually fired, newest-first.
function SendHistory({ log, onRefresh }) {
  const last = log[0];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-200">
          <History className="w-4 h-4 text-slate-400" /> Recent sends
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
        >
          Refresh
        </button>
      </div>

      {last ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Last sent <strong>{formatSentAt(last.at)}</strong> — {last.sent}/{last.recipients} delivered
            {last.failed > 0 ? `, ${last.failed} failed` : ''}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic mb-2">
          No sends recorded yet. Once the weekday send fires (or you send manually), it'll show here.
        </p>
      )}

      {log.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {log.map((e, i) => (
            <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-ink dark:text-slate-200">{formatSentAt(e.at)}</p>
                <p className="text-xs text-slate-400">{TRIGGER_LABEL[e.trigger] || e.trigger}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {e.failed > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {e.sent}/{e.recipients}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
