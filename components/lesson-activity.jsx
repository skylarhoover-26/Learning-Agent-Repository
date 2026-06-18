'use client';

import { useState, useMemo } from 'react';
import { Check, X, Loader2, PencilLine, ListChecks, Shuffle, Lightbulb } from 'lucide-react';

// A required, interactive checkpoint that proves a learning objective. Renders by
// type (mcq | write | match | scenario), lets the learner retry until they pass,
// and calls onPass() once they've demonstrated the objective.
export default function LessonActivity({ activityType, activity, objective, onPass, passed }) {
  const type = activityType || 'mcq';
  const TYPE_META = {
    mcq: { icon: ListChecks, label: 'Quick check' },
    write: { icon: PencilLine, label: 'Your turn — try it' },
    match: { icon: Shuffle, label: 'Match them up' },
    scenario: { icon: Lightbulb, label: 'What would you do?' },
  };
  const meta = TYPE_META[type] || TYPE_META.mcq;

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${passed ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'border-brand-300 bg-brand-50/40 dark:bg-slate-800'}`}>
      <div className="flex items-center gap-2 mb-1">
        <meta.icon className={`w-5 h-5 ${passed ? 'text-green-600' : 'text-brand'}`} />
        <h3 className="font-bold text-ink dark:text-slate-200">{meta.label}</h3>
        {passed && <Check className="w-4 h-4 text-green-600 ml-auto" />}
      </div>
      {objective && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Proves: {objective}</p>
      )}

      {type === 'mcq' && <McqActivity activity={activity} onPass={onPass} passed={passed} />}
      {type === 'write' && <WriteActivity activity={activity} onPass={onPass} passed={passed} />}
      {type === 'match' && <MatchActivity activity={activity} onPass={onPass} passed={passed} />}
      {type === 'scenario' && <ScenarioActivity activity={activity} onPass={onPass} passed={passed} />}
    </div>
  );
}

function McqActivity({ activity, onPass, passed }) {
  const [picked, setPicked] = useState(null);
  const options = activity?.options || [];
  const correct = activity?.correctIndex ?? 0;

  function choose(i) {
    if (passed) return;
    setPicked(i);
    if (i === correct) onPass();
  }

  return (
    <div>
      <p className="font-medium text-ink dark:text-slate-200 mb-3">{activity?.question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isCorrect = passed && i === correct;
          const isWrong = !passed && picked === i;
          let cls = 'border-slate-200 dark:border-slate-600 hover:border-brand-300 text-ink dark:text-slate-200';
          if (isCorrect) cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          else if (isWrong) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
          return (
            <button key={i} onClick={() => choose(i)} disabled={passed}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between gap-2 transition-all disabled:cursor-default ${cls}`}>
              <span>{opt}</span>
              {isCorrect && <Check className="w-4 h-4 shrink-0" />}
              {isWrong && <X className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {!passed && picked != null && picked !== correct && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">Not quite — try again.</p>
      )}
      {passed && activity?.explanation && (
        <p className="text-xs text-green-700 dark:text-green-400 mt-2">{activity.explanation}</p>
      )}
    </div>
  );
}

function WriteActivity({ activity, onPass, passed }) {
  const [text, setText] = useState('');
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState(null);
  const passScore = activity?.passScore ?? 70;

  async function submit() {
    if (!text.trim() || grading || passed) return;
    setGrading(true);
    try {
      const res = await fetch('/api/lesson/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sourceText: activity?.instructions, gradingCriteria: activity?.gradingCriteria }),
      });
      const data = await res.json();
      setGrade(data);
      if ((data.score || 0) >= passScore) onPass();
    } catch {
      setGrade({ score: 0, improvement: 'Something went wrong — try submitting again.' });
    } finally {
      setGrading(false);
    }
  }

  return (
    <div>
      <p className="font-medium text-ink dark:text-slate-200 mb-2">{activity?.instructions}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={passed}
        rows={3}
        placeholder={activity?.placeholder || 'Type your response…'}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand"
      />
      {grade && (
        <div className={`mt-2 text-sm rounded-lg p-3 ${(grade.score || 0) >= passScore ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'}`}>
          <p className="font-semibold">Score: {grade.score ?? 0}/100 {(grade.score || 0) >= passScore ? '— passed!' : `(need ${passScore})`}</p>
          {grade.strength && <p className="mt-0.5">{grade.strength}</p>}
          {grade.improvement && (grade.score || 0) < passScore && <p className="mt-0.5">{grade.improvement}</p>}
        </div>
      )}
      {!passed && (
        <button onClick={submit} disabled={grading || !text.trim()}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
          {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {grading ? 'Checking…' : 'Submit'}
        </button>
      )}
    </div>
  );
}

function MatchActivity({ activity, onPass, passed }) {
  const pairs = activity?.pairs || [];
  const rights = useMemo(() => {
    const arr = pairs.map((p) => p.right);
    // Deterministic shuffle by reversing + rotating so options aren't in order.
    return [...arr].reverse();
  }, [pairs]);
  const [picks, setPicks] = useState({});
  const [checked, setChecked] = useState(false);

  function setPick(leftIdx, value) {
    if (passed) return;
    setPicks((p) => ({ ...p, [leftIdx]: value }));
    setChecked(false);
  }

  function check() {
    if (passed) return;
    const allCorrect = pairs.every((p, i) => picks[i] === p.right);
    setChecked(true);
    if (allCorrect) onPass();
  }

  const allAnswered = pairs.every((_, i) => picks[i]);

  return (
    <div>
      <p className="font-medium text-ink dark:text-slate-200 mb-3">{activity?.instructions || 'Match each item to its pair.'}</p>
      <div className="space-y-2">
        {pairs.map((p, i) => {
          const wrong = checked && !passed && picks[i] !== p.right;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-ink dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">{p.left}</span>
              <span className="text-slate-400">→</span>
              <select
                value={picks[i] || ''}
                onChange={(e) => setPick(i, e.target.value)}
                disabled={passed}
                className={`flex-1 text-sm rounded-lg px-3 py-2 border bg-white dark:bg-slate-900 text-ink dark:text-slate-200 outline-none ${wrong ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`}
              >
                <option value="">Choose…</option>
                {rights.map((r, j) => <option key={j} value={r}>{r}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      {checked && !passed && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Some matches are off — adjust and check again.</p>}
      {!passed && (
        <button onClick={check} disabled={!allAnswered}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
          <Check className="w-4 h-4" /> Check matches
        </button>
      )}
    </div>
  );
}

function ScenarioActivity({ activity, onPass, passed }) {
  const choices = activity?.choices || [];
  const [picked, setPicked] = useState(null);

  function choose(i) {
    if (passed) return;
    setPicked(i);
    if (choices[i]?.correct) onPass();
  }

  return (
    <div>
      <p className="font-medium text-ink dark:text-slate-200 mb-3">{activity?.situation}</p>
      <div className="space-y-2">
        {choices.map((c, i) => {
          const isPicked = picked === i;
          const reveal = isPicked || (passed && c.correct);
          let cls = 'border-slate-200 dark:border-slate-600 hover:border-brand-300 text-ink dark:text-slate-200';
          if (reveal && c.correct) cls = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
          else if (reveal && !c.correct) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
          return (
            <div key={i}>
              <button onClick={() => choose(i)} disabled={passed}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all disabled:cursor-default ${cls}`}>
                {c.text}
              </button>
              {isPicked && c.feedback && (
                <p className={`text-xs mt-1 pl-1 ${c.correct ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{c.feedback}</p>
              )}
            </div>
          );
        })}
      </div>
      {!passed && picked != null && !choices[picked]?.correct && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Try a different approach.</p>
      )}
    </div>
  );
}
