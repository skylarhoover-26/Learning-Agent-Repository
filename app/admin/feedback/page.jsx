'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { MessageSquarePlus, ArrowLeft, Check, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Search, X, Sparkles, GitPullRequestDraft, Paperclip, StickyNote, DatabaseZap } from 'lucide-react';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import MediaCapture from '@/components/media-capture';
import { PRIORITY_LEVELS, PRIORITY_DEFINITIONS, WORK_STATUSES } from '@/lib/feedback-priority';
import { FEATURE_AREAS } from '@/lib/feedback-features';

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

// Order mirrors PRIORITY_LEVELS (lib/feedback-priority.js): Show stopper → Future.
const PRIORITY_ORDER = Object.fromEntries(PRIORITY_LEVELS.map((p, i) => [p, i]));
const PRIORITY_STYLES = {
  'Show stopper': 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:text-red-50 dark:border-red-500',
  Critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  High: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  'Needs Info': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  Med: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  Low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  Future: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};
const PRIORITY_UNSET = 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600';
// Skipped: a muted, struck-through-feeling slate so it reads as "set aside".
const SKIPPED_STYLE = 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500';

// Workflow-status pill colors: In Progress reads yellow, Blocked light red;
// Needs Review a calm blue, Not Started neutral slate.
const WORK_STATUS_STYLES = {
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  'Needs Review': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  Blocked: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};
const WORK_STATUS_UNSET = 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600';
// Terminal "Done" state shown in the per-card status dropdown once an item is
// marked done, so the control reads "Done" instead of a stale pipeline value.
const WORK_STATUS_DONE_STYLE = 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
// Sentinel for the synthetic "Done" option in the per-card status dropdown.
const DONE_STATUS = 'Done';
// Order mirrors WORK_STATUSES: Not Started → Blocked; unset sinks last.
const WORK_STATUS_ORDER = Object.fromEntries(WORK_STATUSES.map((s, i) => [s, i]));
function workStatusRank(f) {
  return f.workStatus in WORK_STATUS_ORDER ? WORK_STATUS_ORDER[f.workStatus] : 99;
}

// Feature-area tag: neutral indigo pill, distinct from the category/priority
// colors so the three buckets stay visually separable on a card.
const FEATURE_STYLE = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800';
const FEATURE_UNSET = 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600';

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

// "Skipped" is an admin-only disposition: reviewed and intentionally passed on
// (never AI-assigned). It lives in the status field alongside open/done.
function isSkipped(f) {
  return f.status === 'skipped';
}

function isPraise(f) {
  return f.category === 'Praise';
}

// "Sorted" = an admin has given it a priority. Un-sorted items live in the New
// tab until triaged by hand (AI no longer auto-assigns priority on submit).
function isSorted(f) {
  return !!f.priority;
}

// Sentinel value used in the per-card priority dropdown to mark an item Skipped
// — it sets status, not priority, so it stays out of the AI-driven priority set.
const SKIPPED = 'Skipped';

// Sentinel used inside the multi-select filters to represent "untagged" items
// (no priority / no feature), so it can be picked alongside real values.
const NONE = '__none__';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'notStarted', label: 'Not Started' },
  { key: 'pending', label: 'In Progress' },
  { key: 'needsReview', label: 'Needs Review' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
  { key: 'skipped', label: 'Skipped' },
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
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  // Multi-select filters: arrays of chosen values. Empty = no filter (All).
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [featureFilter, setFeatureFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // One-click Supabase re-sync (replaces the browser-console backfill).
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Stable reference number per record: number every item by the order it was
  // received (oldest = #1), so each card has a fixed ID to reference. Computed
  // globally from all items — independent of the current tab, sort, or page —
  // so a given feedback always shows the same number for every admin. New
  // submissions have the latest timestamp, so they get the next number and
  // never renumber existing ones.
  const refMap = useMemo(() => {
    const m = {};
    if (!items) return m;
    [...items]
      .sort((a, b) => (a.at || '').localeCompare(b.at || '') || (a.id || '').localeCompare(b.id || ''))
      .forEach((f, i) => { m[f.id] = i + 1; });
    return m;
  }, [items]);

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

  // Patch a record. Optimistic: update the UI first, then persist; roll back and
  // surface an error if the request fails.
  //
  // Notes and post-hoc screenshots are append-only additions — they must have
  // ZERO effect on how the card is ranked or ordered. So for those we never
  // adopt the server's whole record (which could carry a slightly stale
  // priority from the read-modify-write and silently re-sort the list); we fold
  // in only the notes/screenshotUrls threads and leave every sort-relevant field
  // (priority, feature, status, date) exactly as it is on screen.
  async function patchItem(id, patch) {
    const isAppend = 'note' in patch || 'screenshot' in patch || 'recording' in patch;
    const prev = items;
    setUpdatingId(id);
    setError(null);
    // Field patches (status/priority/feature) update optimistically; appends
    // wait for the server so we don't inject a half-formed note/screenshot.
    if (!isAppend) {
      setItems((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    }
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error('Failed to update feedback');
      const data = await res.json();
      if (data.feedback) {
        setItems((cur) => cur.map((f) => {
          if (f.id !== id) return f;
          // Append: take only the threads, keep everything else local → no re-rank.
          if (isAppend) {
            return { ...f, notes: data.feedback.notes, screenshotUrls: data.feedback.screenshotUrls, recordingUrls: data.feedback.recordingUrls };
          }
          // Field patch: adopt the server record so server-stamped fields (doneBy/doneAt) show.
          return data.feedback;
        }));
      }
    } catch (e) {
      // Only optimistic (field) patches mutated the list pre-flight and need a
      // rollback. Appends never touched the list before the response, so
      // restoring an old snapshot here would wrongly discard notes/edits that
      // landed in between — for appends we just surface the error.
      if (!isAppend) setItems(prev);
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Copy every feedback record into Supabase (idempotent upsert-by-id). This is
  // the button-driven version of the one-time backfill — safe to click anytime
  // to reconcile the two stores.
  async function syncToSupabase() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch('/api/feedback/migrate-to-supabase', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(`Synced ${data.migrated} of ${data.total} to Supabase`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!loaded || !isAdmin) return;
    loadFeedback();
  }, [loaded, isAdmin, loadFeedback]);

  // Jumping tabs/filters/sort can land you past the end of the new list, so
  // always snap back to page 1 when any of them change.
  useEffect(() => {
    setPage(1);
  }, [tab, sortBy, priorityFilter, featureFilter, statusFilter, search]);

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
          <div className="flex items-center gap-2">
            {syncResult && (
              <span className="text-xs text-green-600 dark:text-green-400">{syncResult}</span>
            )}
            <button
              type="button"
              onClick={syncToSupabase}
              disabled={syncing}
              title="Copy all feedback into Supabase (safe to re-run anytime)"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <DatabaseZap className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync to Supabase'}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Sort by severity, not category — assigning a priority moves an item out of New:</span>
            {PRIORITY_LEVELS.map((p) => (
              <span key={p} title={PRIORITY_DEFINITIONS[p]} className="inline-flex items-center">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-pill text-[10px] font-semibold border ${PRIORITY_STYLES[p]}`}>{p}</span>
              </span>
            ))}
            <span className="italic">(hover a level for its definition)</span>
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
          // is excluded from the triage queues. Skipped items (admin set them
          // aside) also get their own tab. Active (open, non-praise) items split
          // into New (no priority yet — awaiting triage) vs Pending (sorted, has
          // a priority, but not yet done).
          const praise = items.filter(isPraise);
          const active = items.filter((f) => !isPraise(f) && !isDone(f) && !isSkipped(f));
          // Fully status-driven tabs. New = untriaged (no priority yet). Once an
          // admin assigns a priority, an item flows into one of the workflow-
          // status tabs by its workStatus; unset (or "Not Started") lands in Not
          // Started, so every active item always has exactly one tab home.
          const newItems = active.filter((f) => !isSorted(f));
          const triaged = active.filter(isSorted);
          const inProgress = triaged.filter((f) => f.workStatus === 'In Progress');
          const needsReview = triaged.filter((f) => f.workStatus === 'Needs Review');
          const blocked = triaged.filter((f) => f.workStatus === 'Blocked');
          const notStarted = triaged.filter((f) => !['In Progress', 'Needs Review', 'Blocked'].includes(f.workStatus));
          const done = items.filter((f) => !isPraise(f) && isDone(f));
          const skipped = items.filter((f) => !isPraise(f) && isSkipped(f));
          const counts = { all: items.length, new: newItems.length, notStarted: notStarted.length, pending: inProgress.length, needsReview: needsReview.length, blocked: blocked.length, done: done.length, skipped: skipped.length, praise: praise.length };
          const base = tab === 'all' ? items : tab === 'praise' ? praise : tab === 'done' ? done : tab === 'skipped' ? skipped : tab === 'new' ? newItems : tab === 'notStarted' ? notStarted : tab === 'needsReview' ? needsReview : tab === 'blocked' ? blocked : inProgress;
          // Free-text search across the card's text, author, and page — so a
          // reviewer can find a specific report without scrolling the whole queue.
          const q = search.trim().toLowerCase();
          // Narrow to a single priority (or "no priority") when a filter is set,
          // then apply the search query on top.
          // One predicate powers both the current-tab list and the global
          // "Total" counter, so the total reflects exactly the active filters.
          const matchesFilters = (f) => {
            // Empty selection = no constraint (All). Otherwise the record must
            // match one of the chosen values; NONE matches untagged items.
            if (priorityFilter.length > 0 && !priorityFilter.includes(f.priority || NONE)) return false;
            if (featureFilter.length > 0 && !featureFilter.includes(f.feature || NONE)) return false;
            // Match the same "effective status" the card shows: a done item
            // reads as Done, an item with no workStatus set reads as "No status"
            // (NONE) — distinct from an item explicitly set to Not Started.
            if (statusFilter.length > 0 && !statusFilter.includes(isDone(f) ? DONE_STATUS : (f.workStatus || NONE))) return false;
            if (q) {
              const hay = `${f.text || ''} ${f.name || ''} ${f.email || ''} ${f.page || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          };
          const filtered = base.filter(matchesFilters);
          // Total across every tab (pending/completed/skipped/praise) that matches
          // the active Priority/Feature/search filters — not scoped to the current tab.
          const totalMatching = items.filter(matchesFilters).length;
          // Copy before sorting so we never mutate the source arrays.
          const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'priority') {
              const diff = priorityRank(a) - priorityRank(b);
              if (diff !== 0) return diff;
            }
            if (sortBy === 'feature') {
              // Group by feature area (alphabetical); untagged items sink last.
              const fa = a.feature || '￿';
              const fb = b.feature || '￿';
              const diff = fa.localeCompare(fb);
              if (diff !== 0) return diff;
            }
            if (sortBy === 'status') {
              // Order by workflow status (Not Started → Blocked); unset sinks last.
              const diff = workStatusRank(a) - workStatusRank(b);
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

              {/* Filters on their own line so their dropdowns never run off the
                  side of the screen; they wrap to the next line on narrow widths. */}
              <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 mb-3">
                <MultiSelect
                  label="Priority"
                  selected={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[...PRIORITY_LEVELS.map((p) => ({ value: p, label: p })), { value: NONE, label: 'No priority' }]}
                />
                <MultiSelect
                  label="Feature"
                  selected={featureFilter}
                  onChange={setFeatureFilter}
                  options={[...FEATURE_AREAS.map((a) => ({ value: a, label: a })), { value: NONE, label: 'No feature' }]}
                />
                <MultiSelect
                  label="Status"
                  selected={statusFilter}
                  onChange={setStatusFilter}
                  options={[...WORK_STATUSES.map((s) => ({ value: s, label: s })), { value: DONE_STATUS, label: 'Done' }, { value: NONE, label: 'No status' }]}
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Sort
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-1.5 py-1"
                  >
                    <option value="priority">Priority</option>
                    <option value="feature">Feature</option>
                    <option value="status">Status</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>

              {/* Tabs + counts, with Total leading (left of Pending). */}
              {/* Pill tabs that wrap onto multiple lines so every bucket stays
                  visible (no sideways scroll) even with the full status pipeline. */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  title="Total feedback matching the current Priority, Feature, and search filters — across every tab"
                  className="pr-3 mr-0.5 border-r border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                >
                  Total
                  <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">{totalMatching}</span>
                </span>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                      tab === t.key
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                    <span className={`text-xs ${tab === t.key ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>{counts[t.key]}</span>
                  </button>
                ))}
              </div>

              {shown.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-10 text-center">
                  {q
                    ? `No feedback matches "${search.trim()}" in ${tab}.`
                    : (priorityFilter.length > 0 || featureFilter.length > 0 || statusFilter.length > 0) && base.length > 0
                    ? `No items match the current filters in ${tab}.`
                    : tab === 'all'
                    ? 'No feedback yet.'
                    : tab === 'praise'
                    ? 'No praise yet.'
                    : tab === 'done'
                    ? 'Nothing marked done yet.'
                    : tab === 'skipped'
                    ? 'Nothing skipped.'
                    : tab === 'new'
                    ? 'No new feedback — nothing waiting to be sorted.'
                    : tab === 'notStarted'
                    ? 'Nothing waiting to be started.'
                    : tab === 'needsReview'
                    ? 'Nothing flagged for review.'
                    : tab === 'blocked'
                    ? 'Nothing blocked.'
                    : 'No in-progress feedback — all caught up!'}
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {shown.map((f) => (
                      <FeedbackCard
                        key={f.id}
                        feedback={f}
                        refNumber={refMap[f.id]}
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

// A compact checkbox dropdown so a filter can hold several selections at once.
// Empty selection reads as "All"; picking values narrows to their union.
function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking anywhere outside the control.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const summary = selected.length === 0
    ? 'All'
    : selected.length === 1
    ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
    : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {label}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-between gap-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-2 py-1 min-w-[6rem]"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 min-w-[11rem] max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-brand hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Clear selection
            </button>
          )}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-brand"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
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

function FeedbackCard({ feedback: f, refNumber, busy, onPatch }) {
  const done = isDone(f);
  const skipped = isSkipped(f);
  const resolved = done || skipped; // done or set-aside → the button offers "Reopen"
  const [noteDraft, setNoteDraft] = useState('');
  const fileRef = useRef(null);
  // Ref-based in-flight guard: React state (`busy`) flips a render *after* the
  // click, so a double-click or a held Enter (keydown auto-repeat) can fire two
  // note submits before the input disables. Two concurrent appends race and one
  // note is lost — the ref closes that window synchronously.
  const submittingRef = useRef(false);

  async function submitNote() {
    const text = noteDraft.trim();
    if (!text || busy || submittingRef.current) return;
    submittingRef.current = true;
    setNoteDraft('');
    try {
      await onPatch(f.id, { note: text });
    } finally {
      submittingRef.current = false;
    }
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
        {refNumber != null && (
          <span className="text-sm font-bold text-ink dark:text-slate-100">#{refNumber}</span>
        )}
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
              value={f.feature || ''}
              onChange={(e) => onPatch(f.id, { feature: e.target.value || null })}
              disabled={busy}
              aria-label="Feature area"
              title={f.feature ? `Feature area: ${f.feature}${f.featureIsAiAssigned ? ' (AI-suggested)' : ''}` : 'Tag which part of the app this is about'}
              className={`rounded-pill text-[11px] font-semibold border px-2 py-1 disabled:opacity-50 ${f.feature ? FEATURE_STYLE : FEATURE_UNSET}`}
            >
              <option value="">Feature…</option>
              {FEATURE_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={skipped ? SKIPPED : (f.priority || '')}
              onChange={(e) => {
                const val = e.target.value;
                // "Skipped" is a status, not a priority — set it aside without
                // touching (or clearing) whatever priority it already has.
                if (val === SKIPPED) { onPatch(f.id, { status: 'skipped' }); return; }
                // Choosing a real priority (or clearing) pulls a skipped item
                // back into the queue so it doesn't get stranded in Skipped.
                const patch = { priority: val || null };
                if (skipped) patch.status = 'open';
                onPatch(f.id, patch);
              }}
              disabled={busy}
              aria-label="Priority"
              title={skipped ? 'Set aside by an admin — pick a priority to return it to the queue' : (f.aiReason || '')}
              className={`rounded-pill text-[11px] font-semibold border px-2 py-1 disabled:opacity-50 ${skipped ? SKIPPED_STYLE : (f.priority ? PRIORITY_STYLES[f.priority] : PRIORITY_UNSET)}`}
            >
              <option value="">Priority…</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value={SKIPPED}>Skipped</option>
            </select>
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
      {(Array.isArray(f.screenshotUrls) && f.screenshotUrls.length > 0) ||
      (Array.isArray(f.recordingUrls) && f.recordingUrls.length > 0) ||
      !isPraise(f) ? (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {(f.screenshotUrls || []).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Screenshot" className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-90" />
            </a>
          ))}
          {(f.recordingUrls || []).map((url, i) => (
            <video
              key={`rec-${i}`}
              src={url}
              controls
              className="w-40 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600 bg-black"
            />
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
              <MediaCapture
                disabled={busy}
                onUploaded={(url) => onPatch(f.id, { recording: url })}
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) submitNote(); }}
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
          <div className="flex items-center justify-between gap-2 mt-3">
            <select
              value={done ? DONE_STATUS : (f.workStatus || '')}
              onChange={(e) => {
                const val = e.target.value;
                // Choosing "Done" marks it done instantly (same as the button).
                if (val === DONE_STATUS) { onPatch(f.id, { status: 'done' }); return; }
                // Picking a pipeline status on a done item reopens it into that status.
                if (done) { onPatch(f.id, { status: 'open', workStatus: val || null }); return; }
                onPatch(f.id, { workStatus: val || null });
              }}
              disabled={busy}
              aria-label="Work status"
              title={done ? 'Marked done — pick a status to reopen it' : 'Where this stands in the work'}
              className={`rounded-pill text-[11px] font-semibold border px-2 py-1 disabled:opacity-50 ${done ? WORK_STATUS_DONE_STYLE : (f.workStatus ? (WORK_STATUS_STYLES[f.workStatus] || WORK_STATUS_UNSET) : WORK_STATUS_UNSET)}`}
            >
              <option value="">No status</option>
              {WORK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value={DONE_STATUS}>Done</option>
            </select>
            <button
              onClick={() => onPatch(f.id, { status: resolved ? 'open' : 'done' })}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                resolved
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20'
              }`}
            >
              {resolved ? <><RotateCcw className="w-3.5 h-3.5" /> Reopen</> : <><Check className="w-3.5 h-3.5" /> Mark as done</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
