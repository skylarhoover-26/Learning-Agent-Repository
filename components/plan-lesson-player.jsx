'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormattedContent } from '@/components/lesson-slide';
import LessonActivity from '@/components/lesson-activity';
import LlmWindowCallout from '@/components/llm-window-callout';
import BookLoader from '@/components/book-loader';
import { useProfile } from '@/components/profile-provider';
import { useActiveTool } from '@/components/active-tool-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { onLessonComplete } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';
import { trackLessonComplete } from '@/lib/track';
import {
  Target, ChevronRight, ChevronLeft, Send, Loader2, Trophy, Pause, Lightbulb, Check, RotateCcw, MessageSquare,
} from 'lucide-react';

const SAVE_KEY = 'lp_plan_lesson';
const FORMAT_LABEL = { standard: 'Quick Lesson', deep_dive: 'Deep Dive', project_quest: 'Project Quest' };

// Plan-driven lesson: objectives (Bloom) are the source of truth, the learner
// works through a fixed set of teach + interactive activity steps, must pass
// every activity to finish (no finishing early — pause & resume instead), and
// free-form questions insert extra steps.
export default function PlanLessonPlayer({ topic, format = 'standard', onExit }) {
  const router = useRouter();
  const { profile } = useProfile();
  const { tools } = useActiveTool();
  // Stable string for effect deps (a fresh array each render would loop the
  // plan fetch); the actual id list is derived from it where needed.
  const toolKey = (tools || []).map((t) => t.id).join(',');
  const toolIds = toolKey ? toolKey.split(',') : undefined;

  const [plan, setPlan] = useState(null);     // { objectives, steps(base) }
  const [steps, setSteps] = useState([]);      // base steps + inserted Q&A
  const [stepIdx, setStepIdx] = useState(0);
  const [teachContent, setTeachContent] = useState({}); // stepId -> {message, keyPoints}
  // stepId -> passed(bool). Presence means the activity is settled (passed, or
  // 3 attempts used). Continue unlocks once settled either way.
  const [resolved, setResolved] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachError, setTeachError] = useState({}); // stepId -> true when generation failed
  const [retryTick, setRetryTick] = useState(0);     // bump to re-run the teach fetch
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  // Inline Q&A thread shown under the chat on the current step (no navigation,
  // no inserted step). Each entry: { id, q, a, loading, error }.
  const [qaThread, setQaThread] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  // The tool the lesson is actually built around (recommended-if-owned, else the
  // learner's starred tool). Sent first so generation centers on it.
  const [lessonToolIds, setLessonToolIds] = useState(null);
  const startedAt = useRef(new Date().toISOString());
  const recorded = useRef(false);

  // ---- Plan load (with pause/resume) ----------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      // Resume an in-progress session for this exact lesson if one exists.
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        if (saved && saved.topic === topic && saved.format === format && saved.plan) {
          if (!active) return;
          setPlan(saved.plan);
          setSteps(saved.steps || saved.plan.steps);
          setStepIdx(saved.stepIdx || 0);
          setTeachContent(saved.teachContent || {});
          setResolved(saved.resolved || {});
          setQaThread(saved.qaThread || []);
          startedAt.current = saved.startedAt || startedAt.current;
          setLoading(false);
          return;
        }
      } catch {
        // ignore bad save
      }

      // First, find the best tool for this lesson and resolve which tool the
      // lesson should be built around: the recommended one IF the learner owns
      // it, otherwise their starred/primary tool.
      const owned = tools || [];
      let recTool = null;
      try {
        const rr = await fetch('/api/lesson/recommend-tool', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }),
        });
        const rd = rr.ok ? await rr.json() : null;
        if (rd?.tool) { recTool = rd.tool; if (active) setRecommendation(rd); }
      } catch {
        // recommendation is best-effort
      }
      const match = recTool ? owned.find((t) => (t.label || '').toLowerCase() === recTool.toLowerCase()) : null;
      const orderedIds = match
        ? [match.id, ...owned.filter((t) => t.id !== match.id).map((t) => t.id)]
        : owned.map((t) => t.id);
      const lessonTools = orderedIds.length ? orderedIds : undefined;
      if (active) setLessonToolIds(lessonTools);

      try {
        const res = await fetch('/api/lesson/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, format, tools: lessonTools }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to plan lesson');
        if (!active) return;
        setPlan(data);
        setSteps(data.steps);
        setLoading(false);
        // Hidden self-QA for admins (never shown to the learner).
        const toolLabel = match?.label || owned[0]?.label || '';
        fetch('/api/lesson/qa', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: data, topic, format, tool: toolLabel }),
        }).catch(() => {});
      } catch (err) {
        if (active) { setError(err.message); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [topic, format, toolKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const objectives = plan?.objectives || [];
  const step = steps[stepIdx] || null;
  const total = steps.length;

  // ---- Persist progress (pause/resume) --------------------------------------
  const persist = useCallback((next = {}) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        topic, format, plan,
        steps: next.steps || steps,
        stepIdx: next.stepIdx ?? stepIdx,
        teachContent: next.teachContent || teachContent,
        resolved: next.resolved || resolved,
        qaThread: next.qaThread || qaThread,
        startedAt: startedAt.current,
      }));
    } catch {
      // localStorage full/unavailable
    }
  }, [topic, format, plan, steps, stepIdx, teachContent, resolved, qaThread]);

  // The actual teaching text the learner has already seen, in order — fed to the
  // AI so each step and answer is grounded in the real lesson (it "remembers").
  const buildPriorContent = useCallback((uptoIdx) => {
    return steps
      .slice(0, uptoIdx)
      .filter((s) => (s.kind === 'teach' || s.kind === 'qa') && teachContent[s.id]?.message)
      .map((s) => ({ title: s.title || '', message: teachContent[s.id].message }));
  }, [steps, teachContent]);

  // ---- Lazily generate teach content for the current step -------------------
  useEffect(() => {
    if (!step || step.kind !== 'teach') return;
    if (teachContent[step.id]) return;
    let active = true;
    setTeachLoading(true);
    setTeachError((prev) => ({ ...prev, [step.id]: false }));
    const priorTitles = steps.slice(0, stepIdx).filter((s) => s.kind === 'teach').map((s) => s.title);
    const priorContent = buildPriorContent(stepIdx);
    fetch('/api/lesson/teach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, objectives, step, priorTitles, priorContent, tools: lessonToolIds || toolIds }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => {
        if (!active) return;
        if (!d?.message) throw new Error('empty');
        setTeachContent((prev) => {
          const updated = { ...prev, [step.id]: { message: d.message, keyPoints: d.keyPoints || [] } };
          persist({ teachContent: updated });
          return updated;
        });
      })
      .catch(() => { if (active) setTeachError((prev) => ({ ...prev, [step.id]: true })); })
      .finally(() => { if (active) setTeachLoading(false); });
    return () => { active = false; };
  }, [step, stepIdx, retryTick]); // eslint-disable-line react-hooks/exhaustive-deps

  function resolveActivity(id, passed) {
    setResolved((prev) => {
      if (id in prev) return prev;
      const next = { ...prev, [id]: passed };
      persist({ resolved: next });
      return next;
    });
  }

  const isActivity = step?.kind === 'activity';
  const activitySettled = isActivity ? step.id in resolved : true;
  const teachReady = step?.kind === 'teach' ? !!teachContent[step?.id] : true;
  const canAdvance = step?.kind === 'recap' ? false : (isActivity ? activitySettled : teachReady);

  function goNext() {
    if (stepIdx < total - 1) {
      const ni = stepIdx + 1;
      setStepIdx(ni);
      persist({ stepIdx: ni });
    }
  }
  function goBack() {
    if (stepIdx > 0) { const ni = stepIdx - 1; setStepIdx(ni); persist({ stepIdx: ni }); }
  }

  function pauseAndExit() {
    persist();
    if (onExit) onExit();
    else router.push('/');
  }

  // Ask a question without leaving the step: the answer threads in below the
  // chat. The full lesson-so-far is sent so the answer is grounded (the model
  // is NOT stateless from the learner's point of view anymore).
  async function askQuestion() {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion('');
    setAsking(true);
    const id = `q_${stepIdx}_${q.length}_${qaThread.length}`;
    setQaThread((prev) => {
      const next = [...prev, { id, q, a: '', loading: true }];
      persist({ qaThread: next });
      return next;
    });
    try {
      const priorContent = buildPriorContent(stepIdx + 1);
      const recentQa = qaThread.filter((x) => x.a && !x.error).slice(-3).map((x) => ({ q: x.q, a: x.a }));
      const res = await fetch('/api/lesson/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, objectives, mode: 'answer', question: q,
          priorContent, currentStep: step?.title || '', recentQa,
          tools: lessonToolIds || toolIds,
        }),
      });
      if (!res.ok) throw new Error('failed');
      const d = await res.json();
      const a = d.message || 'Here you go.';
      setQaThread((prev) => {
        const next = prev.map((x) => (x.id === id ? { ...x, a, loading: false } : x));
        persist({ qaThread: next });
        return next;
      });
    } catch {
      setQaThread((prev) => prev.map((x) => (
        x.id === id ? { ...x, a: 'Sorry — I couldn’t answer that just now. Please try again.', loading: false, error: true } : x
      )));
    } finally {
      setAsking(false);
    }
  }

  function finishLesson() {
    if (recorded.current) return;
    recorded.current = true;
    try {
      localStorage.removeItem(SAVE_KEY);
      if (profile) {
        const durationMs = Date.now() - new Date(startedAt.current).getTime();
        const activityCount = steps.filter((s) => s.kind === 'activity').length;
        const passedCount = Object.values(resolved).filter(Boolean).length;
        const result = onLessonComplete(resolveLearnerId(profile), topic, startedAt.current, {
          format,
          correctness: activityCount ? passedCount / activityCount : 1,
          quizCorrect: passedCount,
        });
        emitXp(result);
        trackLessonComplete(topic, format, durationMs);
      }
    } catch {
      // best-effort
    }
    if (onExit) onExit();
    else router.push('/');
  }

  // ---- Render ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-12">
        <BookLoader message={`Designing your lesson on ${topic}…`} size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-400 text-sm font-medium mb-2">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-red-600 underline">Try again</button>
      </div>
    );
  }

  const teach = step && (step.kind === 'teach' || step.kind === 'qa') ? teachContent[step.id] : null;

  return (
    <div className="space-y-5">
      {/* Progress + step count */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${((stepIdx + 1) / total) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Step {stepIdx + 1} of {total}</span>
        <button onClick={pauseAndExit} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors">
          <Pause className="w-3.5 h-3.5" /> Pause
        </button>
      </div>

      {/* Tool callout */}
      <LlmWindowCallout storageKey="planlesson" recommendation={recommendation} />

      {/* Objectives (shown on the first step) */}
      {stepIdx === 0 && objectives.length > 0 && (
        <div className="rounded-2xl border border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-800 p-5">
          <h3 className="flex items-center gap-2 font-bold text-ink dark:text-slate-200 mb-2">
            <Target className="w-5 h-5 text-brand" /> By the end, you'll be able to:
          </h3>
          <ul className="space-y-1.5">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-2 text-sm text-ink dark:text-slate-300">
                <Check className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step body */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-xs font-bold">{stepIdx + 1}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {step?.kind === 'activity' ? 'Activity' : step?.kind === 'recap' ? 'Recap' : step?.kind === 'qa' ? 'Your question' : 'Step'}
            {step?.title ? ` · ${step.title}` : ''}
          </span>
        </div>

        {(step?.kind === 'teach' || step?.kind === 'qa') && (
          teachLoading && !teach ? (
            <div className="py-6"><BookLoader message="Preparing…" size="sm" /></div>
          ) : (!teach && teachError[step.id]) ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">This step didn’t load. Let’s try again.</p>
              <button
                onClick={() => { setTeachError((p) => ({ ...p, [step.id]: false })); setRetryTick((t) => t + 1); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Retry this step
              </button>
            </div>
          ) : (
            <div>
              <FormattedContent text={teach?.message || ''} />
              {teach?.keyPoints?.length > 0 && (
                <div className="mt-4 rounded-xl bg-brand-50 dark:bg-slate-700/50 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300 mb-1">
                    <Lightbulb className="w-4 h-4" /> Key points
                  </p>
                  <ul className="space-y-1">
                    {teach.keyPoints.map((k, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-ink dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" /> {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}

        {step?.kind === 'activity' && (
          <LessonActivity
            activityType={step.activityType}
            activity={step.activity}
            objective={objectives.find((o) => o.id === step.objectiveId)?.text}
            resolved={step.id in resolved}
            passed={resolved[step.id] === true}
            onResolve={(p) => resolveActivity(step.id, p)}
          />
        )}

        {step?.kind === 'recap' && (
          <div className="text-center py-4">
            <Trophy className="w-10 h-10 text-cta-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">You did it!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">You completed every activity and proved each objective.</p>
            <button onClick={finishLesson} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all">
              <Trophy className="w-4 h-4" /> Finish &amp; earn XP
            </button>
          </div>
        )}
      </div>

      {/* Nav: activities must be passed before advancing; no finishing early */}
      {step?.kind !== 'recap' && (
        <div className="flex items-center justify-between gap-3">
          <button onClick={goBack} disabled={stepIdx === 0}
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {!canAdvance ? (
            <span className="text-xs text-slate-400">
              {isActivity ? 'Give the activity a try to continue' : 'Loading this step…'}
            </span>
          ) : (
            <button onClick={goNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Question box — the answer threads in right here, you stay on your step */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">Have a question? Ask it — I'll answer right here without losing your place.</p>
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            placeholder="Type a question about this lesson…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand"
          />
          <button onClick={askQuestion} disabled={asking || !question.trim()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all">
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {/* Threaded Q&A — appears below the input, on the same step */}
        {qaThread.length > 0 && (
          <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
            {qaThread.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-brand text-white px-3 py-2 rounded-2xl rounded-br-md text-sm">{item.q}</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-bg-subtle dark:bg-slate-900 px-3 py-2 text-sm">
                    {item.loading ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</span>
                    ) : (
                      <FormattedContent text={item.a} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
