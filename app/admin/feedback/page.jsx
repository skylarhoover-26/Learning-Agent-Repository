'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { MessageSquarePlus, ArrowLeft, Check, RotateCcw, ChevronLeft, ChevronRight, Search, X, Sparkles, GitPullRequestDraft, Paperclip, StickyNote, RefreshCw } from 'lucide-react';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { PRIORITY_LEVELS, PRIORITY_DEFINITIONS } from '@/lib/feedback-priority';

// Category → pill color, so bugs/ideas/praise are scannable at a glance.
const CATEGORY_STYLES = {
  Bug: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  Idea: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800',
  Confusing: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  Praise: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  Other: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

// AI bug-triage verdict → badge color/label, so admins can see at a glance
// which Bug reports the classifier thinks are real vs. not before opening them.
const AI_VERDICT_STYLES = {
  likely_bug: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  not_bug: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
  unclear: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
};
const AI_VERDICT_LABELS = {
  likely_bug: 'AI: Likely a bug',
  not_bug: 'AI: Not a bug',
  unclear: 'AI: Unclear',
};

// Order mirrors PRIORITY_LEVELS (lib/feedback-priority.js): Critical → Future.
const PRIORITY_ORDER = Object.fromEntries(PRIORITY_LEVELS.map((p, i) => [p, i]));
const PRIORITY_STYLES = {
  Critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  High: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  'Needs Info': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
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

const PAGE_SIZE = 10;

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
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [retriaging, setRetriaging] = useState(false);
  const [retriageMsg, setRetriageMsg] = useState(null);

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
      // Adopt the server's record so server-stamped fields (doneBy/doneAt) show.
      const data = await res.json();
      if (data.feedback) {
        setItems((cur) => cur.map((f) => (f.id === id ? data.feedback : f)));
      }
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

  // Re-run AI priority classification on every non-manually-overridden record
  // (e.g. after tuning the triage prompt) and reload. Can take a minute or two
  // over a large backlog.
  async function runRetriage() {
    setRetriaging(true);
    setRetriageMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/feedback/retriage', { method: 'POST' });
      if (!res.ok) throw new Error('Re-triage failed');
      const data = await res.json();
      setRetriageMsg(`Re-triaged ${data.updated} item${data.updated === 1 ? '' : 's'}.`);
      await loadFeedback();
    } catch (e) {
      setError(e.message);
    } finally {
      setRetriaging(false);
    }
  }

  // Jumping tabs/filters/sort can land you past the end of the new list, so
  // always snap back to page 1 when any of them change.
  useEffect(() => {
    setPage(1);
  }, [tab, sortBy, priorityFilter, search]);

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
        <div className="flex items-center justify-between gap-3 mb-2">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <button
            onClick={runRetriage}
            disabled={retriaging}
            title="Re-run AI priority classification on every record that hasn't been manually overridden — use after tuning the triage prompt"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retriaging ? 'animate-spin' : ''}`} /> {retriaging ? 'Re-triaging…' : 'Re-run AI triage'}
          </button>
        </div>
        {retriageMsg && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{retriageMsg}</p>
        )}

        <div className="mb-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">AI-assigned by severity, not category:</span>
            {PRIORITY_LEVELS.map((p) => (
              <span key={p} title={PRIORITY_DEFINITIONS[p]} className="inline-flex items-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-pill text-[10px] font-semibold border ${PRIORITY_STYLES[p]}`}>{p}</span>
              </span>
            ))}
            <span className="italic">(hover a level for its definition — admins can always override)</span>
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
          // Free-text search across the card's text, author, and page — so a
          // reviewer can find a specific report without scrolling the whole queue.
          const q = search.trim().toLowerCase();
          // Narrow to a single priority (or "no priority") when a filter is set,
          // then apply the search query on top.
          const filtered = base.filter((f) => {
            if (priorityFilter === 'none' && f.priority) return false;
            if (priorityFilter !== 'all' && priorityFilter !== 'none' && f.priority !== priorityFilter) return false;
            if (q) {
              const hay = `${f.text || ''} ${f.name || ''} ${f.email || ''} ${f.page || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
          // Copy before sorting so we never mutate the source arrays.
          const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'priority') {
              const diff = priorityRank(a) - priorityRank(b);
              if (diff !== 0) return diff;
            }
            return (b.at || '').localeCompare(a.at || '');
          });
          const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
          const safePage = Math.min(page, pageCount);
          const shown = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
          return (
            <>
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search feedback by text, name, or page…"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-sm pl-9 pr-9 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-ink dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {q && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {sorted.length} match{sorted.length === 1 ? '' : 'es'} in {tab}
                  </p>
                )}
              </div>

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
                <div className="flex items-center gap-3 pb-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Priority
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-1.5 py-1"
                    >
                      <option value="all">All</option>
                      {PRIORITY_LEVELS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="none">No priority</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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
              </div>

              {shown.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">
                  {q
                    ? `No feedback matches "${search.trim()}" in ${tab}.`
                    : priorityFilter !== 'all' && base.length > 0
                    ? `No ${priorityFilter === 'none' ? 'unprioritized' : priorityFilter} items in ${tab}.`
                    : tab === 'praise'
                    ? 'No praise yet.'
                    : tab === 'completed'
                    ? 'Nothing marked done yet.'
                    : 'No pending feedback — all caught up!'}
                </p>
              ) : (
                <>
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
                  {pageCount > 1 && (
                    <Pager page={safePage} pageCount={pageCount} onPage={setPage} />
                  )}
                </>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}

function Pager({ page, pageCount, onPage }) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-1.5 mt-5">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`min-w-[2rem] px-2 py-1 rounded-md text-sm font-medium border transition-colors ${
            p === page
              ? 'border-brand bg-brand text-white'
              : 'border-slate-200 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FeedbackCard({ feedback: f, busy, onPatch }) {
  const done = isDone(f);
  const [noteDraft, setNoteDraft] = useState('');
  const fileRef = useRef(null);

  function submitNote() {
    const text = noteDraft.trim();
    if (!text || busy) return;
    onPatch(f.id, { note: text });
    setNoteDraft('');
  }

  async function attachScreenshot(fileList) {
    const file = Array.from(fileList || []).find((fl) => fl.type.startsWith('image/'));
    if (!file || busy) return;
    const dataUrl = await fileToDataUrl(file).catch(() => null);
    if (dataUrl) onPatch(f.id, { screenshot: dataUrl });
  }

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
              title={f.aiReason || ''}
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
      {f.aiBugVerdict && (
        <p
          title={f.aiReason || ''}
          className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-pill text-[10px] font-semibold border ${AI_VERDICT_STYLES[f.aiBugVerdict] || AI_VERDICT_STYLES.unclear}`}
        >
          <Sparkles className="w-3 h-3" /> {AI_VERDICT_LABELS[f.aiBugVerdict] || 'AI: Unclear'}
        </p>
      )}
      {f.draftPrUrl && (
        <p className="mt-2">
          <a
            href={f.draftPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold border bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800 hover:opacity-80"
          >
            <GitPullRequestDraft className="w-3 h-3" /> Draft fix PR open
          </a>
        </p>
      )}
      {done && f.doneBy && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 inline-flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Marked done by {f.doneBy}{f.doneAt ? ` · ${formatDate(f.doneAt)}` : ''}
        </p>
      )}
      {f.page && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">On page: <code>{f.page}</code></p>
      )}
      {(Array.isArray(f.screenshotUrls) && f.screenshotUrls.length > 0) || !isPraise(f) ? (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {(f.screenshotUrls || []).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Screenshot" className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-90" />
            </a>
          ))}
          {!isPraise(f) && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach image
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => attachScreenshot(e.target.files)}
              />
            </>
          )}
        </div>
      ) : null}
      {!isPraise(f) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          {Array.isArray(f.notes) && f.notes.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {f.notes.map((n, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                  <span><span className="text-ink dark:text-slate-200">{n.text}</span> — {n.by}{n.at ? `, ${formatDate(n.at)}` : ''}</span>
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitNote(); }}
              disabled={busy}
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-ink dark:text-slate-200 px-2.5 py-1.5 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
            />
            <button
              onClick={submitNote}
              disabled={busy || !noteDraft.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
