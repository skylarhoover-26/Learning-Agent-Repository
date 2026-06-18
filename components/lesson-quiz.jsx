'use client';

import { useState } from 'react';
import { Check, X, HelpCircle, Trophy, Loader2 } from 'lucide-react';

// End-of-lesson checkpoint quiz. The learner answers each multiple-choice
// question; wrong answers can be retried as many times as they like. XP (handled
// by the caller) scales with how many are correct when they click Finish — so
// retrying everything to correct earns full XP, while finishing with some wrong
// earns proportionally less. No XP number is shown here; the amount is revealed
// in the popup after Finish (consistent across the platform).
export default function LessonQuiz({ questions, onFinish, finishing }) {
  const [answers, setAnswers] = useState(
    () => questions.map(() => ({ selected: null, status: 'unanswered' }))
  );

  function selectOption(qi, oi) {
    setAnswers((prev) => {
      if (prev[qi].status === 'correct') return prev; // locked once correct
      const correct = oi === questions[qi].correctIndex;
      return prev.map((a, i) =>
        i === qi ? { selected: oi, status: correct ? 'correct' : 'wrong' } : a
      );
    });
  }

  const total = questions.length;
  const correctCount = answers.filter((a) => a.status === 'correct').length;
  const allAttempted = answers.every((a) => a.status !== 'unanswered');
  const allCorrect = correctCount === total;

  function handleFinish() {
    if (!allAttempted || finishing) return;
    onFinish(total ? correctCount / total : 1, { correctCount, total });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-5 h-5 text-brand" />
        <h2 className="font-bold text-ink dark:text-slate-200">Quick check</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Answer these to lock in what you learned. Missed one? Retry it — getting them all right earns full XP.
      </p>

      <div className="space-y-6">
        {questions.map((q, qi) => {
          const a = answers[qi];
          return (
            <div key={qi} className="border-b border-slate-100 dark:border-slate-700 pb-6 last:border-0 last:pb-0">
              <p className="font-medium text-ink dark:text-slate-200 mb-3">
                <span className="text-slate-400 mr-2">{qi + 1}.</span>{q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = a.selected === oi;
                  const isCorrectAnswer = oi === q.correctIndex;
                  const locked = a.status === 'correct';

                  // Styling: green for the chosen correct answer, red for a wrong
                  // pick, neutral otherwise. We don't reveal the correct option
                  // on a wrong guess — the learner retries.
                  let cls = 'border-slate-200 dark:border-slate-600 hover:border-brand-300 dark:hover:border-slate-500 text-ink dark:text-slate-200';
                  if (locked && isCorrectAnswer) {
                    cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
                  } else if (!locked && isSelected && a.status === 'wrong') {
                    cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                  }

                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => selectOption(qi, oi)}
                      disabled={locked}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between gap-2 disabled:cursor-default ${cls}`}
                    >
                      <span>{opt}</span>
                      {locked && isCorrectAnswer && <Check className="w-4 h-4 shrink-0" />}
                      {!locked && isSelected && a.status === 'wrong' && <X className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {a.status === 'wrong' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">Not quite — give it another try.</p>
              )}
              {a.status === 'correct' && q.explanation && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">{q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {correctCount} of {total} correct
          {allAttempted && !allCorrect && ' — retry the rest for full XP'}
        </span>
        <button
          onClick={handleFinish}
          disabled={!allAttempted || finishing}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {finishing ? 'Finishing…' : 'Finish lesson'}
        </button>
      </div>
      {!allAttempted && (
        <p className="text-xs text-slate-400 mt-2 text-right">Answer every question to finish.</p>
      )}
    </div>
  );
}
