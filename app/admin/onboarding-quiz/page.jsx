'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { ClipboardList, Loader2, RotateCcw, Plus, Save, ListOrdered, LayoutList } from 'lucide-react';
import QuizQuestionEditor from '@/components/admin/quiz-question-editor';
import QuizImportPanel from '@/components/admin/quiz-import-panel';
import AssessmentSwitches from '@/components/admin/assessment-switches';

// Authoring surface for the onboarding placement quiz. These are the questions
// every new user answers inside the required gate, and the scores they produce
// are what the graded rating scale shows them and what tunes lesson difficulty.
//
// Seeded with the questions the assessment shipped with, so you can see what was
// there before changing it. Nothing is stored until you save; until then learners
// get the code defaults.

export default function OnboardingQuizAdminPage() {
  return <CinematicFrame><OnboardingQuizAdminPageInner /></CinematicFrame>;
}

const SUBTITLE = 'Write the placement questions every new user answers';

function OnboardingQuizAdminPageInner() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [questions, setQuestions] = useState(null);
  const [labels, setLabels] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // null | 'saved' | 'reset' | string error
  // 'order' = the sequence learners get. 'competency' = grouped for authoring.
  const [view, setView] = useState('order');
  // Whether the quiz runs at all. When it's off the "at least one live question"
  // rule stops applying — there's no learner to strand.
  const [quizEnabled, setQuizEnabled] = useState(true);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/onboarding-quiz')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setQuestions(Array.isArray(d?.questions) ? d.questions : []);
        setLabels(d?.labels || {});
      })
      .catch(() => setQuestions([]));
  }, [allowed]);

  // Live questions per competency. A competency with no live question isn't
  // measured at all, which is easy to cause by accident (switching one off) and
  // invisible in a flat list of prompts.
  const coverage = useMemo(() => {
    const counts = {};
    for (const q of questions || []) {
      if (q.enabled === false) continue;
      counts[q.competency] = (counts[q.competency] || 0) + 1;
    }
    return counts;
  }, [questions]);

  function updateQuestion(index, next) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
    setStatus(null);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setStatus(null);
  }

  function moveQuestion(index, delta) {
    setQuestions((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setStatus(null);
  }

  function addQuestion() {
    const firstKey = Object.keys(labels)[0] || 'prompting';
    setQuestions((prev) => [
      ...prev,
      {
        id: `q${prev.length + 1}-${prev.length ? prev.length : 'new'}`,
        competency: firstKey,
        enabled: true,
        setup: '',
        prompt: '',
        best: 0,
        why: '',
        answers: [
          { text: '', scores: { [firstKey]: 1.0 } },
          { text: '', scores: { [firstKey]: 0.2 } },
        ],
      },
    ]);
    setStatus(null);
  }

  // Apply a parsed import to the working list. Nothing is persisted here — the
  // admin still reviews the result and hits Save, same as a hand edit.
  //
  // 'replace' swaps the whole set. 'append' updates any question whose id matches
  // IN PLACE (so re-importing a revised draft doesn't produce duplicates) and
  // adds the rest at the end.
  function applyImport(imported, mode) {
    setQuestions((prev) => {
      if (mode === 'replace') return imported;
      const byId = new Map(imported.map((q) => [q.id, q]));
      const merged = prev.map((q) => (byId.has(q.id) ? byId.get(q.id) : q));
      const seen = new Set(prev.map((q) => q.id));
      return [...merged, ...imported.filter((q) => !seen.has(q.id))];
    });
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/onboarding-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Save failed');
      // Show exactly what was stored — the server drops questions it can't use,
      // so a silent difference here would be misleading.
      setQuestions(d.questions || questions);
      setStatus('saved');
    } catch (error) {
      setStatus(error.message || 'Save failed');
    }
    setBusy(false);
  }

  async function resetToDefaults() {
    if (!window.confirm('Discard the saved questions and go back to the originals? This affects every new user.')) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/onboarding-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Reset failed');
      setQuestions(d.questions || []);
      setStatus('reset');
    } catch (error) {
      setStatus(error.message || 'Reset failed');
    }
    setBusy(false);
  }

  if (allowed === null || (allowed && questions === null)) {
    return (
      <Shell>
        <p className="text-center text-slate-500 dark:text-slate-400">
          {allowed === null ? 'Checking…' : 'Loading questions…'}
        </p>
      </Shell>
    );
  }

  if (!allowed) {
    return <Shell><p className="text-center text-slate-500 dark:text-slate-400">Admins only.</p></Shell>;
  }

  const liveCount = questions.filter((q) => q.enabled !== false).length;

  return (
    <Shell>
      <AssessmentSwitches onChange={(c) => setQuizEnabled(c?.quiz_enabled !== false)} />

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          These are the questions in the required placement quiz. Learners answer one at a time and
          see the best answer plus your &ldquo;why&rdquo; immediately after each one, then get a graded
          score per competency &mdash; they never rate themselves.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Only competencies covered by a <strong>live</strong> question get scored and shown, so turning a
          question off removes that competency from the results rather than showing an unearned zero.
          Changes apply to the next person who starts the quiz &mdash; no redeploy needed.
        </p>
      </div>

      <QuizImportPanel
        existingIds={questions.map((q) => q.id)}
        labels={labels}
        onApply={applyImport}
      />

      {/* Coverage: which competencies the live set actually measures. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Object.entries(labels).map(([key, label]) => {
          const n = coverage[key] || 0;
          return (
            <span
              key={key}
              title={n ? `${n} live question${n === 1 ? '' : 's'}` : 'Not measured — no live question'}
              className={`text-xs font-medium px-2.5 py-1 rounded-pill border ${
                n
                  ? 'bg-brand-50 text-brand-700 border-brand-100'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {label} {n || '—'}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-ink dark:text-slate-200">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          <span className="font-normal text-slate-500 dark:text-slate-400"> · {liveCount} live for learners</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView((v) => (v === 'order' ? 'competency' : 'order'))}
            title={view === 'order' ? 'Group by competency' : 'Back to learner order'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            {view === 'order'
              ? <><LayoutList className="w-4 h-4" /> Group by competency</>
              : <><ListOrdered className="w-4 h-4" /> Learner order</>}
          </button>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" /> Add question
          </button>
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reset to originals
          </button>
        </div>
      </div>

      {/* Only a problem while the quiz actually runs. With the switch off, zero
          live questions is the intended state, not a mistake to warn about. */}
      {liveCount === 0 && quizEnabled && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No live questions</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Saving with nothing live would leave new users staring at an empty quiz. Turn at least one
            on, or switch the placement quiz off at the top of this page.
          </p>
        </div>
      )}

      {view === 'order' ? (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <QuizQuestionEditor
              key={`${q.id}-${i}`}
              question={q}
              index={i}
              total={questions.length}
              labels={labels}
              onChange={(next) => updateQuestion(i, next)}
              onRemove={removeQuestion}
              onMove={moveQuestion}
            />
          ))}
        </div>
      ) : (
        <GroupedQuestions
          questions={questions}
          labels={labels}
          onChange={updateQuestion}
          onRemove={removeQuestion}
        />
      )}

      <div className="flex items-center gap-3 sticky bottom-4">
        <button
          type="button"
          onClick={save}
          disabled={busy || (quizEnabled && liveCount === 0)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save questions
        </button>
        {status === 'saved' && <span className="text-sm font-semibold text-green-600">Saved.</span>}
        {status === 'reset' && <span className="text-sm font-semibold text-green-600">Back to the originals.</span>}
        {status && status !== 'saved' && status !== 'reset' && (
          <span className="text-sm font-semibold text-red-600">{status}</span>
        )}
      </div>
    </Shell>
  );
}

// Grouped by competency, for authoring. This regroups what's ON SCREEN only —
// learners still get the sequence set in the Learner order view.
//
// Reordering is switched off here on purpose: the up/down arrows move a question
// by its position in the real array, so inside a group "up" would fling it
// somewhere off-screen. Better to have one view that reorders and one that
// groups than one view that does both badly.
function GroupedQuestions({ questions, labels, onChange, onRemove }) {
  const entries = questions.map((q, i) => ({ q, i }));
  const groups = Object.entries(labels)
    .map(([key, label]) => ({ key, label, items: entries.filter((e) => e.q.competency === key) }))
    .filter((g) => g.items.length > 0);

  // Anything whose competency isn't in the label set still has to show up. A
  // view that silently swallows a question is worse than an ugly group header.
  const placed = new Set(groups.flatMap((g) => g.items.map((e) => e.i)));
  const orphans = entries.filter((e) => !placed.has(e.i));
  if (orphans.length) groups.push({ key: '__other__', label: 'Uncategorized', items: orphans });

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-baseline gap-2 px-1">
            <h2 className="text-sm font-bold text-ink dark:text-slate-200">{group.label}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {group.items.filter((e) => e.q.enabled !== false).length} live of {group.items.length}
            </span>
          </div>
          {group.items.map(({ q, i }) => (
            <QuizQuestionEditor
              key={`${q.id}-${i}`}
              question={q}
              index={i}
              total={questions.length}
              labels={labels}
              canReorder={false}
              onChange={(next) => onChange(i, next)}
              onRemove={onRemove}
              onMove={() => {}}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={ClipboardList} title="Onboarding Quiz" subtitle={SUBTITLE} />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-5">{children}</main>
    </div>
  );
}
