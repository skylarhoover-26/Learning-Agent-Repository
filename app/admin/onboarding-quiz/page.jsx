'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { ClipboardList, Loader2, RotateCcw, Plus, Save } from 'lucide-react';
import QuizQuestionEditor from '@/components/admin/quiz-question-editor';

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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold text-ink dark:text-slate-200">
          {questions.length} question{questions.length === 1 ? '' : 's'}
          <span className="font-normal text-slate-500 dark:text-slate-400"> · {liveCount} live for learners</span>
        </p>
        <div className="flex items-center gap-2">
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

      {liveCount === 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No live questions</p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Saving with nothing live would leave new users staring at an empty quiz. Turn at least one on.
          </p>
        </div>
      )}

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

      <div className="flex items-center gap-3 sticky bottom-4">
        <button
          type="button"
          onClick={save}
          disabled={busy || liveCount === 0}
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

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <PageHeader icon={ClipboardList} title="Onboarding Quiz" subtitle={SUBTITLE} />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-5">{children}</main>
    </div>
  );
}
