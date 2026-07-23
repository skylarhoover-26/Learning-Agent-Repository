'use client';

import { useState } from 'react';
import { FormattedContent } from '@/components/lesson-slide';
import { Target, Check, Loader2, BookOpen, PencilLine, Trophy, HelpCircle } from 'lucide-react';

// Read-only view of a generated lesson plan, for admins reviewing exactly what a
// learner was given. Objectives + every step (teach + activities) render from the
// stored plan instantly; the teach narrative is generated on demand (it isn't
// stored), so it loads behind a button.
export default function AdminLessonContent({ plan, topic, format }) {
  const [teach, setTeach] = useState(null);
  const [loadingTeach, setLoadingTeach] = useState(false);
  const [teachError, setTeachError] = useState(null);

  if (!plan || !Array.isArray(plan.steps)) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        Full content isn&apos;t available for this lesson — it was generated before content capture was added. New lessons will show here.
      </p>
    );
  }

  const objectives = plan.objectives || [];

  async function loadTeach() {
    if (loadingTeach) return;
    setLoadingTeach(true);
    setTeachError(null);
    try {
      const res = await fetch('/api/admin/lesson-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, topic, format, tier: format === 'developer' ? 'developer' : 'beginner' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTeach(data.teach || {});
    } catch (err) {
      setTeachError(err.message);
    } finally {
      setLoadingTeach(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Objectives */}
      {objectives.length > 0 && (
        <div className="rounded-xl border border-brand-200 dark:border-slate-600 bg-brand-50/50 dark:bg-slate-900/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-ink dark:text-slate-200 mb-1.5">
            <Target className="w-3.5 h-3.5 text-brand" /> Learning objectives
          </p>
          <ul className="space-y-1">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-1.5 text-xs text-ink dark:text-slate-300">
                <Check className="w-3 h-3 text-brand mt-0.5 shrink-0" />
                <span>{o.text}{o.level ? <span className="text-slate-400"> · {o.level}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Load teaching text */}
      {!teach && (
        <button
          onClick={loadTeach}
          disabled={loadingTeach}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all"
        >
          {loadingTeach ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reconstructing the lesson…</> : <>Show the teaching text learners saw</>}
        </button>
      )}
      {teachError && <p className="text-xs text-red-600 dark:text-red-400">{teachError}</p>}
      {teach && (
        <p className="text-[11px] text-slate-400 italic">
          Teaching text is regenerated from the plan for review — wording may differ slightly from the learner&apos;s run. Activities are exact.
        </p>
      )}

      {/* Steps */}
      <ol className="space-y-2">
        {plan.steps.map((step, i) => (
          <li key={step.id || i} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold shrink-0">{i + 1}</span>
              <StepKindLabel kind={step.kind} />
              {step.title && <span className="text-xs font-semibold text-ink dark:text-slate-200">{step.title}</span>}
              {step.kind === 'activity' && step.activityType && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">{step.activityType}</span>
              )}
            </div>

            {step.kind === 'teach' && (
              teach?.[step.id] ? (
                <div className="text-sm">
                  <FormattedContent text={teach[step.id].message || '(no content)'} />
                  {teach[step.id].keyPoints?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {teach[step.id].keyPoints.map((k, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Check className="w-3 h-3 text-brand mt-0.5 shrink-0" /> {k}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Teaching text — click &ldquo;Show the teaching text&rdquo; above to load.</p>
              )
            )}

            {step.kind === 'activity' && <ActivityReadout activityType={step.activityType} activity={step.activity} />}

            {step.kind === 'recap' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Completion screen — learner reviews and finishes to earn XP.</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepKindLabel({ kind }) {
  const map = {
    teach: { icon: BookOpen, label: 'Teach', cls: 'text-brand' },
    activity: { icon: PencilLine, label: 'Activity', cls: 'text-cta-600' },
    recap: { icon: Trophy, label: 'Recap', cls: 'text-green-600' },
    qa: { icon: HelpCircle, label: 'Question', cls: 'text-slate-500' },
  };
  const m = map[kind] || map.teach;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      <m.icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

// Read-only render of each activity type, showing the prompt, all options, and
// the correct answer(s) + feedback — so an admin can review what's being asked.
function ActivityReadout({ activityType, activity }) {
  if (!activity) return <p className="text-xs text-slate-400 italic">(no activity content)</p>;
  const A = activity;

  if (activityType === 'mcq') {
    const correct = A.correctIndex ?? 0;
    return (
      <div className="text-sm">
        <p className="text-ink dark:text-slate-200 mb-1.5">{A.question}</p>
        <ul className="space-y-1">
          {(A.options || []).map((opt, i) => (
            <li key={i} className={`text-xs flex items-start gap-1.5 ${i === correct ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
              {i === correct ? <Check className="w-3 h-3 mt-0.5 shrink-0" /> : <span className="w-3 shrink-0" />}
              <span>{opt}{A.optionFeedback?.[i] ? <span className="text-slate-400 italic"> — {A.optionFeedback[i]}</span> : null}</span>
            </li>
          ))}
        </ul>
        {A.explanation && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Why: {A.explanation}</p>}
      </div>
    );
  }

  if (activityType === 'write') {
    return (
      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
        <p className="text-ink dark:text-slate-200">{A.instructions}</p>
        {A.gradingCriteria && <p className="text-xs">Passes if: {A.gradingCriteria}</p>}
        {A.passScore != null && <p className="text-xs text-slate-400">Pass score: {A.passScore}</p>}
      </div>
    );
  }

  if (activityType === 'match') {
    return (
      <div className="text-sm">
        <p className="text-ink dark:text-slate-200 mb-1.5">{A.instructions || 'Match each item to its pair.'}</p>
        <ul className="space-y-0.5">
          {(A.pairs || []).map((p, i) => (
            <li key={i} className="text-xs text-slate-600 dark:text-slate-400">{p.left} <span className="text-slate-400">→</span> <span className="text-green-700 dark:text-green-400">{p.right}</span></li>
          ))}
        </ul>
      </div>
    );
  }

  if (activityType === 'scenario') {
    return (
      <div className="text-sm">
        <p className="text-ink dark:text-slate-200 mb-1.5">{A.situation}</p>
        <ul className="space-y-1">
          {(A.choices || []).map((c, i) => (
            <li key={i} className={`text-xs flex items-start gap-1.5 ${c.correct ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
              {c.correct ? <Check className="w-3 h-3 mt-0.5 shrink-0" /> : <span className="w-3 shrink-0" />}
              <span>{c.text}{c.feedback ? <span className="text-slate-400 italic"> — {c.feedback}</span> : null}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (activityType === 'order') {
    return (
      <div className="text-sm">
        <p className="text-ink dark:text-slate-200 mb-1.5">{A.instructions || 'Put in the correct order.'}</p>
        <ol className="list-decimal list-inside space-y-0.5">
          {(A.items || []).map((it, i) => <li key={i} className="text-xs text-green-700 dark:text-green-400">{it}</li>)}
        </ol>
      </div>
    );
  }

  if (activityType === 'categorize') {
    return (
      <div className="text-sm">
        <p className="text-ink dark:text-slate-200 mb-1.5">{A.instructions || 'Put each item in the right group.'}</p>
        <ul className="space-y-0.5">
          {(A.items || []).map((it, i) => (
            <li key={i} className="text-xs text-slate-600 dark:text-slate-400">{it.text} <span className="text-slate-400">→</span> <span className="text-green-700 dark:text-green-400">{it.bucket}</span></li>
          ))}
        </ul>
      </div>
    );
  }

  return <pre className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{JSON.stringify(activity, null, 2)}</pre>;
}
