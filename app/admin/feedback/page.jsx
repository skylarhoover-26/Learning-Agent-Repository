'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { MessageSquarePlus, ArrowLeft, Check, RotateCcw, DownloadCloud } from 'lucide-react';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Category → pill color, so bugs/ideas/praise are scannable at a glance.
const CATEGORY_STYLES = {
  Bug: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  Idea: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800',
  Confusing: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  Praise: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  Other: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

// Priority levels mirror the task-tracker sheet: Critical → Future.
const PRIORITY_LEVELS = ['Critical', 'High', 'Med', 'Low', 'Future'];
const PRIORITY_ORDER = { Critical: 0, High: 1, Med: 2, Low: 3, Future: 4 };
const PRIORITY_STYLES = {
  Critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  High: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  Med: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  Low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  Future: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};
const PRIORITY_UNSET = 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600';

// Unset priorities sort last; ties fall back to newest-first by date.
function priorityRank(f) {
  return f.priority in PRIORITY_ORDER ? PRIORITY_ORDER[f.priority] : 99;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Records without a status are treated as pending, so the existing backlog
// shows up under "Pending" without a migration.
function isDone(f) {
  return f.status === 'done';
}

function isPraise(f) {
  return f.category === 'Praise';
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'praise', label: 'Praise' },
];

export default function AdminFeedback() {
  return <CinematicFrame><AdminFeedbackInner /></CinematicFrame>;
}

function AdminFeedbackInner() {
  const router = useRouter();
  const { isAdmin, loaded } = useMenuVisibility();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('pending');
  const [sortBy, setSortBy] = useState('priority');
  const [updatingId, setUpdatingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  useEffect(() => {
    if (loaded && !isAdmin) router.replace('/');
  }, [loaded, isAdmin, router]);

  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('Failed to load feedback');
      const data = await res.json();
      setItems(data.feedback || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Pull tester test-script feedback into the store, then refresh the list.
  async function runImport() {
    setImporting(true);
    setImportMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/feedback/import', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const removedNote = data.removed ? `, removed ${data.removed} duplicate${data.removed === 1 ? '' : 's'}` : '';
      setImportMsg(`Imported ${data.imported} item${data.imported === 1 ? '' : 's'}${removedNote}.`);
      await loadFeedback();
    } catch (e) {
      setImportMsg(null);
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  // Patch a record (status and/or priority). Optimistic: update the UI first,
  // then persist; roll back and surface an error if the request fails.
  async function patchItem(id, patch) {
    const prev = items;
    setUpdatingId(id);
    setError(null);
    setItems((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error('Failed to update feedback');
    } catch (e) {
      setItems(prev);
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    if (!loaded || !isAdmin) return;
    loadFeedback();
  }, [loaded, isAdmin, loadFeedback]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={MessageSquarePlus} title="Feedback" subtitle="What people are telling us through the in-app Send feedback form" />

      <main className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <div className="flex items-center gap-3">
            {importMsg && <span className="text-xs text-green-600 dark:text-green-400">{importMsg}</span>}
            <button
              onClick={runImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              {importing ? 'Importing…' : 'Import test-script feedback'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        )}

        {items === null && !error && (
          <div className="py-16 flex justify-center"><BookLoader message="Loading feedback…" size="sm" /></div>
        )}

        {items !== null && items.length === 0 && (
          <div className="text-center py-16">
            <MessageSquarePlus className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No feedback yet.</p>
          </div>
        )}

        {items !== null && items.length > 0 && (() => {
          // Praise is positive signal, not a to-do, so it gets its own tab and
          // is excluded from the Pending/Completed triage queues.
          const praise = items.filter(isPraise);
          const pending = items.filter((f) => !isPraise(f) && !isDone(f));
          const completed = items.filter((f) => !isPraise(f) && isDone(f));
          const counts = { pending: pending.length, completed: completed.length, praise: praise.length };
          const base = tab === 'praise' ? praise : tab === 'completed' ? completed : pending;
          // Copy before sorting so we never mutate the source arrays.
          const shown = [...base].sort((a, b) => {
            if (sortBy === 'priority') {
              const diff = priorityRank(a) - priorityRank(b);
              if (diff !== 0) return diff;
            }
            return (b.at || '').localeCompare(a.at || '');
          });
          return (
            <>
              <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`px-3 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                        tab === t.key
                          ? 'border-brand text-brand'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                      <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">{counts[t.key]}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pb-2">
                  Sort
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-1.5 py-1"
                  >
                    <option value="priority">Priority</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>

              {shown.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">
                  {tab === 'praise'
                    ? 'No praise yet.'
                    : tab === 'completed'
                    ? 'Nothing marked done yet.'
                    : 'No pending feedback — all caught up!'}
                </p>
              ) : (
                <div className="space-y-3">
                  {shown.map((f) => (
                    <FeedbackCard
                      key={f.id}
                      feedback={f}
                      busy={updatingId === f.id}
                      onPatch={patchItem}
                    />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}

function FeedbackCard({ feedback: f, busy, onPatch }) {
  const done = isDone(f);
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {f.category && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border ${CATEGORY_STYLES[f.category] || CATEGORY_STYLES.Other}`}>
            {f.category}
          </span>
        )}
        <span className="text-sm font-semibold text-ink dark:text-slate-200">{f.name || f.email}</span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(f.at)}</span>
        {!isPraise(f) && (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={f.priority || ''}
              onChange={(e) => onPatch(f.id, { priority: e.target.value || null })}
              disabled={busy}
              aria-label="Priority"
              className={`rounded-pill text-[11px] font-semibold border px-2 py-1 disabled:opacity-50 ${f.priority ? PRIORITY_STYLES[f.priority] : PRIORITY_UNSET}`}
            >
              <option value="">Priority…</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              onClick={() => onPatch(f.id, { status: done ? 'open' : 'done' })}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                done
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                  : 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20'
              }`}
            >
              {done ? <><RotateCcw className="w-3.5 h-3.5" /> Reopen</> : <><Check className="w-3.5 h-3.5" /> Mark as done</>}
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-ink dark:text-slate-200 whitespace-pre-wrap">{f.text}</p>
      {f.page && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">On page: <code>{f.page}</code></p>
      )}
      {Array.isArray(f.screenshotUrls) && f.screenshotUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {f.screenshotUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Screenshot" className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-90" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
