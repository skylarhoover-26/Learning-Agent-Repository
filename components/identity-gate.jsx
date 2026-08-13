'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

// Pre-Okta soft login. While SSO is off, each tester enters their company email
// once so their data is kept separate (keyed by email). Hidden entirely when
// Okta is configured — SSO handles identity then.
export default function IdentityGate() {
  const [status, setStatus] = useState('loading'); // loading | needed | ok
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/identity')
      .then(r => (r.ok ? r.json() : { oktaConfigured: true, email: 'x' }))
      .then(d => {
        if (d.oktaConfigured || d.email) setStatus('ok');
        else setStatus('needed');
      })
      .catch(() => setStatus('ok')); // never block the app on a failed check
  }, []);

  async function submit(e) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@housecallpro\.com$/.test(clean)) {
      setError('Enter a valid @housecallpro.com email');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Something went wrong');
      }
      // Reload so the server picks up the cookie and loads this person's data.
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (status !== 'needed') return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-br from-[#00205C] to-brand p-6 text-white">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Welcome to AI Learning Coach</h2>
          <p className="text-white/80 text-sm mt-1 leading-relaxed">
            Enter your work email so your progress stays yours. You only do this once —
            when single sign-on is turned on, it&apos;ll connect automatically.
          </p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="name@housecallpro.com"
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
