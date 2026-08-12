'use client';

// Editor for ONE onboarding quiz question. Collapsed it shows a summary row;
// expanded it edits the setup, prompt, every answer, each answer's competency
// score weights, which answer is best, and the "why" text learners see right
// after they answer.
//
// Deliberately a dumb component: every change calls onChange with the whole
// updated question, so the page owns all the state and one Save writes the set.

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Trash2, Plus, GripVertical, Check, AlertTriangle,
} from 'lucide-react';
import { MIN_ANSWERS, MAX_ANSWERS } from '@/lib/onboarding-quiz';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all';

// Model families, for the "this names a specific model" warning below.
//
// A live question once asked learners to choose between two models BY NAME and
// version, and the version it recommended had already been superseded by the
// time anyone noticed — so the placement quiz every new hire takes was teaching
// a stale fact. The durable skill is the judgment (a fast everyday model vs a
// slower deep-reasoning one); the names churn every few months.
//
// Deliberately a warning and not a block: there are legitimate reasons to name a
// tool, and the author is better placed to judge than a regex. The parse route
// has the same rule in its prompt, so imports avoid this on the way in.
const MODEL_NAME_RE = /\b(gpt|claude|opus|sonnet|haiku|gemini|llama|mistral|grok|o[1-4]-(?:mini|preview))\b/i;

export default function QuizQuestionEditor({
  question, index, total, labels, onChange, onRemove, onMove, canReorder = true,
}) {
  const [open, setOpen] = useState(false);
  const answers = question.answers || [];

  // What learners would actually be told. A question with no marked-best "why"
  // silently falls back to generic text, so surface that here rather than
  // letting it ship unnoticed.
  const warnings = [];
  if (!question.prompt?.trim()) warnings.push('No question text');
  if (answers.length < MIN_ANSWERS) warnings.push(`Needs at least ${MIN_ANSWERS} answers`);
  if (answers.some((a) => !a.text?.trim())) warnings.push('An answer is blank');
  if (!question.why?.trim()) warnings.push('No "why" explanation');
  const bestAnswer = answers[question.best];
  if (bestAnswer && !Object.keys(bestAnswer.scores || {}).length) warnings.push('Best answer scores nothing');
  const allText = [question.setup, question.prompt, question.why, ...answers.map((a) => a.text)]
    .filter(Boolean).join(' ');
  if (MODEL_NAME_RE.test(allText)) warnings.push('Names a specific AI model — model names go stale, ask about the judgment instead');

  function set(patch) {
    onChange({ ...question, ...patch });
  }

  function setAnswer(i, patch) {
    set({ answers: answers.map((a, j) => (i === j ? { ...a, ...patch } : a)) });
  }

  function setScore(i, key, raw) {
    const answer = answers[i];
    const scores = { ...(answer.scores || {}) };
    if (raw === '' || raw === null) {
      delete scores[key];
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) scores[key] = Math.max(0, Math.min(1, n));
    }
    setAnswer(i, { scores });
  }

  function addAnswer() {
    if (answers.length >= MAX_ANSWERS) return;
    set({ answers: [...answers, { text: '', scores: { [question.competency]: 0.3 } }] });
  }

  function removeAnswer(i) {
    if (answers.length <= MIN_ANSWERS) return;
    const next = answers.filter((_, j) => j !== i);
    // Keep `best` pointing at the same answer it did before the removal.
    let best = question.best;
    if (i === best) best = 0;
    else if (i < best) best -= 1;
    set({ answers: next, best });
  }

  return (
    <div className={`rounded-xl border ${question.enabled === false ? 'border-slate-200 dark:border-slate-700 opacity-70' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800 overflow-hidden`}>
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {canReorder && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
              className="text-slate-400 hover:text-brand disabled:opacity-25 disabled:hover:text-slate-400 leading-none"
            >
              <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={index === total - 1}
              aria-label="Move down"
              className="text-slate-400 hover:text-brand disabled:opacity-25 disabled:hover:text-slate-400 leading-none"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>
        )}
        {canReorder && <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-brand-50 text-brand-700 shrink-0">
            {labels[question.competency] || question.competency}
          </span>
          <span className="text-sm text-ink dark:text-slate-200 truncate">
            {question.prompt?.trim() || <span className="text-slate-400 italic">Untitled question</span>}
          </span>
          {warnings.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              {warnings.length}
            </span>
          )}
        </button>

        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={question.enabled !== false}
            onChange={e => set({ enabled: e.target.checked })}
            className="accent-brand"
          />
          Live
        </label>
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label="Delete question"
          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
          {warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Needs attention</p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside">
                {warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Competency measured</label>
              <select
                value={question.competency}
                onChange={e => set({ competency: e.target.value })}
                className={inputClass}
              >
                {Object.entries(labels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Question id <span className="font-normal text-slate-400">(saved answers key off this)</span>
              </label>
              <input value={question.id} onChange={e => set({ id: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Setup <span className="font-normal text-slate-400">— the situation, in a grey panel. Optional.</span>
            </label>
            <textarea
              value={question.setup || ''}
              onChange={e => set({ setup: e.target.value })}
              rows={3}
              placeholder="A short, specific moment someone in this role would actually hit."
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Question</label>
            <input
              value={question.prompt || ''}
              onChange={e => set({ prompt: e.target.value })}
              placeholder="What's the best move?"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Answers <span className="font-normal text-slate-400">— mark the best one; keep them all a similar length</span>
              </label>
              <button
                type="button"
                onClick={addAnswer}
                disabled={answers.length >= MAX_ANSWERS}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-40 disabled:no-underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add answer
              </button>
            </div>
            <div className="space-y-2">
              {answers.map((a, i) => (
                <AnswerRow
                  key={i}
                  answer={a}
                  index={i}
                  isBest={question.best === i}
                  labels={labels}
                  canRemove={answers.length > MIN_ANSWERS}
                  onMarkBest={() => set({ best: i })}
                  onTextChange={text => setAnswer(i, { text })}
                  onScoreChange={(key, value) => setScore(i, key, value)}
                  onRemove={() => removeAnswer(i)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Why <span className="font-normal text-slate-400">— shown right after they answer, right or wrong</span>
            </label>
            <textarea
              value={question.why || ''}
              onChange={e => set({ why: e.target.value })}
              rows={3}
              placeholder="Explain what makes the best answer the best one, in plain language."
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerRow({
  answer, index, isBest, labels, canRemove, onMarkBest, onTextChange, onScoreChange, onRemove,
}) {
  const [showScores, setShowScores] = useState(false);
  const scored = Object.entries(answer.scores || {});

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${isBest ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onMarkBest}
          aria-label={isBest ? 'This is the best answer' : 'Mark as best answer'}
          title={isBest ? 'Best answer' : 'Mark as best answer'}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
            isBest ? 'border-green-600 bg-green-600' : 'border-slate-300 dark:border-slate-600 hover:border-green-500'
          }`}
        >
          {isBest && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <textarea
            value={answer.text || ''}
            onChange={e => onTextChange(e.target.value)}
            rows={2}
            placeholder={`Answer ${index + 1}`}
            className="w-full bg-transparent text-sm text-ink dark:text-slate-200 placeholder-slate-400 resize-none focus:outline-none leading-relaxed"
          />
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => setShowScores(s => !s)}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              {showScores ? 'Hide scoring' : `Scoring (${scored.length})`}
            </button>
            {!showScores && scored.length > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {scored.map(([k, v]) => `${labels[k] || k} ${v}`).join(' · ')}
              </span>
            )}
            {isBest && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Best</span>
            )}
          </div>

          {showScores && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(labels).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="flex-1 truncate" title={label}>{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={answer.scores?.[key] ?? ''}
                    onChange={e => onScoreChange(key, e.target.value)}
                    placeholder="—"
                    className="w-14 px-1.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-right focus:outline-none focus:border-brand"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove answer"
          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-25 disabled:hover:text-slate-400 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
