'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

// A destructive action that makes you type the phrase before it runs.
//
// The existing reset-everyone button uses window.confirm, which is one careless
// Enter away from wiping production. For actions that cannot be undone, the
// point of the confirmation is to interrupt autopilot — a dialog you dismiss by
// reflex does not do that, and typing the words does.
//
// Props:
//   phrase   what has to be typed exactly (e.g. 'DELETE EVERYONE')
//   onRun    async () => void — throw to surface an error
export default function DangerConfirm({
  label,
  phrase,
  title,
  children,
  onRun,
  buttonClass = 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20',
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const armed = typed.trim() === phrase;

  async function run() {
    if (!armed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onRun();
      setDone(typeof result === 'string' ? result : 'Done.');
      setOpen(false);
      setTyped('');
    } catch (e) {
      setError(e?.message || 'That failed. Nothing was changed.');
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => { setOpen(true); setDone(null); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border text-sm font-semibold transition-all ${buttonClass}`}
        >
          <AlertTriangle className="w-4 h-4" /> {label}
        </button>
        {done && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{done}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-red-800 dark:text-red-300">{title}</p>
        <div className="text-sm text-red-700 dark:text-red-400 mt-1 space-y-1">{children}</div>
      </div>
      <p className="text-sm text-red-700 dark:text-red-400">
        Type <code className="font-bold bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded">{phrase}</code> to confirm.
      </p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        // No onKeyDown submit on purpose: Enter is exactly the reflex this is
        // meant to interrupt.
        placeholder={phrase}
        className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={!armed || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {label}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTyped(''); setError(null); }}
          disabled={busy}
          className="px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
