'use client';

// Paste a conversation, get questions.
//
// The editor below this panel is fine for tweaking a question but punishing for
// authoring a set: every answer needs its text plus a score weight per
// competency, so a five-question set is well over a hundred fields. Questions
// tend to get drafted in a chat and then re-keyed by hand. This skips that.
//
// Deliberately a two-step: parse produces a DRAFT you look at, and nothing
// reaches the question list until you pick how to apply it. The parse route can
// misread a messy transcript, so the preview is the point, not a formality.

import { useState } from 'react';
import { ClipboardPaste, Loader2, Sparkles, AlertTriangle, X } from 'lucide-react';

export default function QuizImportPanel({ existingIds = [], labels = {}, onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { questions, notes }

  const known = new Set(existingIds);

  async function parse() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/onboarding-quiz/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Import failed');
      if (!data.questions?.length) throw new Error("We couldn't find any questions in that.");
      setResult(data);
    } catch (e) {
      setError(e.message || 'Import failed');
    }
    setBusy(false);
  }

  function apply(mode) {
    onApply(result.questions, mode);
    setText('');
    setResult(null);
    setError(null);
    setOpen(false);
  }

  function discard() {
    setResult(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand transition-all"
      >
        <ClipboardPaste className="w-4 h-4" />
        Import from a conversation
      </button>
    );
  }

  const newCount = result?.questions.filter((q) => !known.has(q.id)).length || 0;
  const updateCount = result ? result.questions.length - newCount : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        <p className="text-sm font-semibold text-ink dark:text-slate-200 flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-brand" />
          Import from a conversation
        </p>
        <button
          type="button"
          onClick={() => { setOpen(false); discard(); }}
          aria-label="Close import"
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {!result && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Paste the whole thing &mdash; a Claude conversation, rough notes, a half-formatted list.
              We&apos;ll pull out the questions, pick the competency, and fill in the scoring. You review
              everything before it&apos;s applied, and nothing saves until you hit Save questions.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste your conversation here…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all leading-relaxed resize-y"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={parse}
                disabled={busy || !text.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? 'Reading it…' : 'Pull out the questions'}
              </button>
              {busy && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  This can take up to a minute for a long transcript.
                </span>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-sm font-semibold text-ink dark:text-slate-200">
                Found {result.questions.length} question{result.questions.length === 1 ? '' : 's'}
              </p>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {newCount} new{updateCount > 0 ? ` · ${updateCount} would update an existing question` : ''}
              </span>
            </div>

            {result.notes?.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Worth a look
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                  {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.questions.map((q) => (
                <ImportPreviewRow key={q.id} question={q} isUpdate={known.has(q.id)} labels={labels} />
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => apply('append')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
              >
                Add to my questions
              </button>
              <button
                type="button"
                onClick={() => apply('replace')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Replace all questions
              </button>
              <button
                type="button"
                onClick={discard}
                className="px-3 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline"
              >
                Discard
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Either way this only changes the list below &mdash; learners see nothing until you save.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ImportPreviewRow({ question, isUpdate, labels }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-pill shrink-0 ${
          isUpdate
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
            : 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
        }`}>
          {isUpdate ? 'Updates' : 'New'}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-brand-50 text-brand-700 shrink-0">
          {labels[question.competency] || question.competency}
        </span>
        <span className="text-sm text-ink dark:text-slate-200 truncate">{question.prompt}</span>
      </button>

      {open && (
        <div className="mt-2 pl-1 space-y-1.5">
          {question.setup && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{question.setup}</p>
          )}
          <ul className="space-y-1">
            {question.answers.map((a, i) => (
              <li
                key={i}
                className={`text-xs leading-relaxed ${
                  i === question.best
                    ? 'text-green-700 dark:text-green-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {i === question.best ? '✓ ' : '· '}{a.text}
              </li>
            ))}
          </ul>
          {question.why && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">{question.why}</p>
          )}
        </div>
      )}
    </div>
  );
}
