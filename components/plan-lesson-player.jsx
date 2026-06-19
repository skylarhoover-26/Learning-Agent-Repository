'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormattedContent } from '@/components/lesson-slide';
import LessonInteractive from '@/components/lesson-interactive';
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
  Target, ChevronRight, ChevronLeft, Send, Loader2, Trophy, Pause, Lightbulb, Check, RotateCcw, MessageSquare, RefreshCw,
  Hammer, Copy, Download, Sparkles,
} from 'lucide-react';

const SAVE_KEY = 'lp_plan_lesson';
const FORMAT_LABEL = { standard: 'Quick Lesson', deep_dive: 'Deep Dive', project_quest: 'Project Quest' };

// The concrete terms/items an activity will quiz, so the preceding teach step
// can be told to define each one by name (never test what wasn't taught). Pulls
// the learner-facing prompts only — never the answer keys.
function activityCovers(step) {
  const a = step?.activity || {};
  let list = [];
  switch (step?.activityType) {
    case 'match': list = (a.pairs || []).map((p) => p.left); break;
    case 'categorize': list = [...(a.buckets || []), ...((a.items || []).map((i) => i.text))]; break;
    case 'order': list = a.items || []; break;
    case 'mcq': list = a.question ? [a.question] : []; break;
    case 'scenario': list = a.situation ? [a.situation] : []; break;
    case 'write': list = a.instructions ? [a.instructions] : []; break;
    default: list = [];
  }
  return list.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 10);
}

// Plan-driven lesson: objectives (Bloom) are the source of truth, the learner
// works through a fixed set of teach + interactive activity steps, must pass
// every activity to finish (no finishing early — pause & resume instead), and
// free-form questions insert extra steps.
export default function PlanLessonPlayer({ topic: topicProp, format = 'standard', onExit }) {
  const router = useRouter();
  const { profile } = useProfile();
  const { tools } = useActiveTool();
  // The lesson's working topic. Starts from the prop, but the "this isn't what I
  // was looking for" flow can replace it with a sharper one and rebuild around
  // it. Kept in sync if the parent navigates to a genuinely new topic.
  const [topic, setTopic] = useState(topicProp);
  useEffect(() => { setTopic(topicProp); }, [topicProp]);
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
  const [elapsed, setElapsed] = useState(0); // seconds spent generating, for the loading bar
  const [error, setError] = useState(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachError, setTeachError] = useState({}); // stepId -> true when generation failed
  const [retryTick, setRetryTick] = useState(0);     // bump to re-run the teach fetch
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [rebuildNonce, setRebuildNonce] = useState(0);          // bump to rebuild for a new tool
  const [dismissedForToolId, setDismissedForToolId] = useState(null); // "keep" choice, per tool
  const [confirmingRebuild, setConfirmingRebuild] = useState(false);
  // Inline Q&A thread shown under the chat on the current step (no navigation,
  // no inserted step). Each entry: { id, q, a, loading, error }.
  const [qaThread, setQaThread] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  // The tool the lesson is actually built around (recommended-if-owned, else the
  // learner's starred tool). Sent first so generation centers on it.
  const [lessonToolIds, setLessonToolIds] = useState(null);
  const startedAt = useRef(new Date().toISOString());
  const recorded = useRef(false);

  // "This isn't what I was looking for" refinement chat. We ask follow-up
  // questions until we can name a sharper topic, then offer to regenerate the
  // whole lesson around it (with an overwrite warning).
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineMessages, setRefineMessages] = useState([]); // {role, content}
  const [refineInput, setRefineInput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineReady, setRefineReady] = useState(null); // { message, newTopic } once we have enough
  const refineBannerRef = useRef(null);

  // Project Quest build engine: each build step captures a real piece the
  // learner makes; pieces accumulate into `artifact` (stepId -> {name, content})
  // and assemble into a deliverable at the end. Drafts/feedback are per-step.
  const isQuest = format === 'project_quest';
  const [artifact, setArtifact] = useState({});         // stepId -> { name, content }
  const [buildDraft, setBuildDraft] = useState({});      // stepId -> textarea string
  const [buildReview, setBuildReview] = useState({});    // stepId -> { feedback, suggestions, looksGood }
  const [buildReviewing, setBuildReviewing] = useState(null); // stepId currently being reviewed
  const [copied, setCopied] = useState(false);

  // When a sharper topic is ready, the confirm lives in a banner at the top
  // (easy to miss at the bottom of a long lesson) — scroll it into view.
  useEffect(() => {
    if (refineReady && refineBannerRef.current) {
      refineBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [refineReady]);

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
          setArtifact(saved.artifact || {});
          setQaThread(saved.qaThread || []);
          // Restore the lesson's tool + callout so resumed steps/answers stay on
          // the same tool the lesson was built around.
          if (saved.lessonToolIds) setLessonToolIds(saved.lessonToolIds);
          if (saved.recommendation) setRecommendation(saved.recommendation);
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
      // Center the ENTIRE lesson on ONE tool — the recommended one if the
      // learner owns it, otherwise their primary — so the teaching content names
      // the SAME tool as the callout instead of drifting to a different one.
      const match = recTool ? owned.find((t) => (t.label || '').toLowerCase() === recTool.toLowerCase()) : null;
      const primary = match || owned[0] || null;
      const lessonTools = primary ? [primary.id] : undefined;
      if (active) setLessonToolIds(lessonTools);

      // Try up to twice on the client too — if the first request fails (the
      // server already retries internally), a fresh attempt usually succeeds
      // before we ever show an error.
      let planData = null;
      let planErr = null;
      for (let attempt = 1; attempt <= 2 && active; attempt++) {
        try {
          const res = await fetch('/api/lesson/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, format, tools: lessonTools }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to plan lesson');
          planData = data;
          planErr = null;
          break;
        } catch (err) {
          planErr = err;
        }
      }
      if (!active) return;
      if (planData) {
        setPlan(planData);
        setSteps(planData.steps);
        setLoading(false);
        // Hidden self-QA for admins (never shown to the learner).
        const toolLabel = match?.label || owned[0]?.label || '';
        fetch('/api/lesson/qa', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planData, topic, format, tool: toolLabel }),
        }).catch(() => {});
      } else {
        setError(planErr?.message || 'Failed to design the lesson. Please try again.');
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [topic, format, toolKey, rebuildNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick an elapsed-seconds counter while the lesson is being designed, so the
  // loading bar can advance and the message can reassure on longer runs.
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const objectives = plan?.objectives || [];
  const step = steps[stepIdx] || null;
  const total = steps.length;

  // ---- Detect a mid-lesson tool switch --------------------------------------
  // Recompute the tool this lesson WOULD resolve to from the learner's current
  // tools (recommended-if-owned, else primary) and compare to the tool it was
  // actually built on. No extra API call — uses the persisted recommendation.
  const owned = tools || [];
  const recTool = recommendation?.tool;
  const currentPrimary = (recTool ? owned.find((t) => (t.label || '').toLowerCase() === recTool.toLowerCase()) : null) || owned[0] || null;
  const currentToolId = currentPrimary?.id || null;
  const builtToolId = lessonToolIds?.[0] || null;
  const newToolLabel = currentPrimary?.label || 'your new tool';
  const builtToolLabel = owned.find((t) => t.id === builtToolId)?.label || 'a different tool';
  const toolMismatch = !!builtToolId && !!currentToolId && builtToolId !== currentToolId;
  const showToolSwitch = toolMismatch && dismissedForToolId !== currentToolId && !loading && !!plan;

  // Wipe this lesson's in-progress state so the load effect regenerates from
  // scratch on the next render. Shared by the tool-switch rebuild and the
  // "not what I was looking for" topic refinement.
  function resetForRebuild() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    recorded.current = false;
    startedAt.current = new Date().toISOString();
    setPlan(null);
    setSteps([]);
    setStepIdx(0);
    setTeachContent({});
    setResolved({});
    setArtifact({});
    setBuildDraft({});
    setBuildReview({});
    setQaThread([]);
    setTeachError({});
    setError(null);
    setConfirmingRebuild(false);
    setDismissedForToolId(null);
    setLoading(true);
    setRebuildNonce((n) => n + 1);
  }

  // Fresh rebuild on the learner's current tool (same topic).
  function rebuildForCurrentTool() {
    resetForRebuild();
  }

  // Regenerate the entire lesson around a sharper topic from the refine chat.
  // This intentionally overwrites the current lesson — the warning is shown
  // before this runs.
  function regenerateWithTopic(nextTopic) {
    setRefineOpen(false);
    setRefineMessages([]);
    setRefineReady(null);
    setRefineInput('');
    setTopic(nextTopic);
    resetForRebuild();
  }

  // Send the refine conversation to the server and either show the next question
  // or, once it has enough, surface the proposed new topic for confirmation.
  async function runRefineStep(msgs) {
    setRefineLoading(true);
    try {
      const res = await fetch('/api/lesson/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, messages: msgs }),
      });
      const d = res.ok ? await res.json() : null;
      const message = d?.message || 'Can you tell me a bit more about what you were hoping to learn?';
      setRefineMessages((prev) => [...prev, { role: 'assistant', content: message }]);
      if (d?.done && d.newTopic) setRefineReady({ message, newTopic: d.newTopic });
    } catch {
      setRefineMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry — something went wrong. Mind trying that again?' }]);
    } finally {
      setRefineLoading(false);
    }
  }

  function openRefine() {
    setRefineOpen(true);
    setRefineReady(null);
    setRefineInput('');
    if (refineMessages.length === 0) runRefineStep([]);
  }

  function sendRefine() {
    const text = refineInput.trim();
    if (!text || refineLoading) return;
    setRefineInput('');
    setRefineReady(null);
    const next = [...refineMessages, { role: 'user', content: text }];
    setRefineMessages(next);
    runRefineStep(next);
  }

  // ---- Persist progress (pause/resume) --------------------------------------
  const persist = useCallback((next = {}) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        topic, format, plan,
        steps: next.steps || steps,
        stepIdx: next.stepIdx ?? stepIdx,
        teachContent: next.teachContent || teachContent,
        resolved: next.resolved || resolved,
        artifact: next.artifact || artifact,
        qaThread: next.qaThread || qaThread,
        lessonToolIds,
        recommendation,
        startedAt: startedAt.current,
      }));
    } catch {
      // localStorage full/unavailable
    }
  }, [topic, format, plan, steps, stepIdx, teachContent, resolved, artifact, qaThread, lessonToolIds, recommendation]);

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
    // The next activity, so the worked example can prepare the learner for
    // exactly what they'll be asked to do (concept → example → activity). We
    // also extract the concrete terms/items it will test ("covers") so this
    // teach step can be told to define each one BY NAME — otherwise an activity
    // can quiz terms (e.g. "Vector store", "Retriever", "Chunk") the lesson only
    // implied. Only when the activity immediately follows this teach step.
    const nextStep = steps[stepIdx + 1];
    const nextActivity = nextStep?.kind === 'activity' ? nextStep : null;
    const upcoming = nextActivity
      ? {
          activityType: nextActivity.activityType,
          objective: objectives.find((o) => o.id === nextActivity.objectiveId)?.text || '',
          covers: activityCovers(nextActivity),
        }
      : null;

    // Teach generation is an LLM call that can transiently fail or be slow on a
    // cold function. Auto-retry a few times with a per-attempt timeout (the plan
    // fetch above already does the same) so a step loads on its own instead of
    // stranding the learner on "Preparing…" until they hit Retry.
    (async () => {
      const MAX_ATTEMPTS = 3;
      const TIMEOUT_MS = 30000;
      for (let attempt = 1; active && attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const res = await fetch('/api/lesson/teach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, objectives, step, priorTitles, priorContent, upcoming, tools: lessonToolIds || toolIds }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error('failed');
          const d = await res.json();
          if (!d?.message) throw new Error('empty');
          if (!active) return;
          setTeachContent((prev) => {
            const updated = { ...prev, [step.id]: { message: d.message, blocks: d.blocks || [], keyPoints: d.keyPoints || [] } };
            persist({ teachContent: updated });
            return updated;
          });
          if (active) setTeachLoading(false);
          return; // success — stop retrying
        } catch {
          clearTimeout(timer);
          if (!active) return;
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 1200 * attempt)); // backoff, keep showing "Preparing…"
            continue;
          }
          setTeachError((prev) => ({ ...prev, [step.id]: true }));
          setTeachLoading(false);
        }
      }
    })();
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

  // ---- Build engine (Project Quest) -----------------------------------------
  // Ask the AI for constructive feedback on the current build piece. Never
  // blocks — the learner can add their work with or without asking.
  async function reviewBuild(bstep) {
    const content = (buildDraft[bstep.id] || '').trim();
    if (!content || buildReviewing) return;
    setBuildReviewing(bstep.id);
    try {
      const res = await fetch('/api/lesson/build-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          brief: bstep.build?.brief || '',
          deliverableName: bstep.build?.deliverableName || bstep.title || '',
          reviewFocus: bstep.build?.reviewFocus || '',
          objective: objectives.find((o) => o.id === bstep.objectiveId)?.text || '',
          content,
        }),
      });
      const d = res.ok ? await res.json() : null;
      setBuildReview((prev) => ({ ...prev, [bstep.id]: d || { feedback: 'Saved — keep going!', suggestions: [], looksGood: true } }));
    } catch {
      setBuildReview((prev) => ({ ...prev, [bstep.id]: { feedback: 'Saved — keep going!', suggestions: [], looksGood: true } }));
    } finally {
      setBuildReviewing(null);
    }
  }

  // Save the learner's piece into the running deliverable and mark the step
  // settled so Continue unlocks.
  function addBuildPiece(bstep) {
    const content = (buildDraft[bstep.id] || '').trim();
    if (!content) return;
    const name = bstep.build?.deliverableName || bstep.title || 'Piece';
    setArtifact((prev) => {
      const nextArtifact = { ...prev, [bstep.id]: { name, content } };
      setResolved((prevR) => {
        const nextResolved = { ...prevR, [bstep.id]: true };
        persist({ artifact: nextArtifact, resolved: nextResolved });
        return nextResolved;
      });
      return nextArtifact;
    });
  }

  // Let the learner move on without adding this piece.
  function skipBuildPiece(bstep) {
    setResolved((prev) => {
      const next = { ...prev, [bstep.id]: true };
      persist({ resolved: next });
      return next;
    });
  }

  // Reopen an already-added piece for editing.
  function editBuildPiece(bstep) {
    setResolved((prev) => { const n = { ...prev }; delete n[bstep.id]; persist({ resolved: n }); return n; });
  }

  // Assemble every saved piece, in build order, into one copy/exportable doc.
  function assembledMarkdown() {
    const pieces = steps
      .filter((s) => s.kind === 'build' && artifact[s.id]?.content)
      .map((s) => `## ${artifact[s.id].name}\n\n${artifact[s.id].content}`);
    return `# ${topic}\n\n${pieces.join('\n\n')}`;
  }

  async function copyDeliverable() {
    try {
      await navigator.clipboard.writeText(assembledMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  function downloadDeliverable() {
    try {
      const blob = new Blob([assembledMarkdown()], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60) || 'project'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* download unavailable */ }
  }

  const isActivity = step?.kind === 'activity';
  const isBuild = step?.kind === 'build';
  const stepSettled = (isActivity || isBuild) ? step.id in resolved : true;
  const teachReady = step?.kind === 'teach' ? !!teachContent[step?.id] : true;
  const canAdvance = step?.kind === 'recap' ? false : ((isActivity || isBuild) ? stepSettled : teachReady);
  const builtCount = steps.filter((s) => s.kind === 'build' && artifact[s.id]?.content).length;

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
    // Asymptotic bar: climbs quickly then eases toward ~95% (we can't show true
    // progress for a single model call, so this just signals "still working").
    const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 14))));
    const message =
      elapsed < 8 ? `Designing your lesson on ${topic}…`
      : elapsed < 20 ? 'Writing the steps and activities…'
      : elapsed < 35 ? 'Putting on the finishing touches…'
      : 'Almost there — this one’s taking a little longer than usual…';
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-12">
        <BookLoader message={message} size="lg" />
        <div className="mt-6 max-w-md mx-auto">
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            This usually takes 10–30 seconds{elapsed >= 35 ? ' — hang tight, almost done.' : '.'}
          </p>
        </div>
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
      {/* Refinement ready — prominent confirm at the top so it isn't missed at
          the bottom of a long lesson. */}
      {refineOpen && refineReady && (
        <div ref={refineBannerRef} className="rounded-xl border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-slate-200">
                Ready: a new lesson on <span className="text-brand">{refineReady.newTopic}</span>
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Generating it will <strong>replace this lesson from the start</strong> to give you a better fit. Your current progress here will be cleared.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => regenerateWithTopic(refineReady.newTopic)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Generate the new lesson
                </button>
                <button onClick={() => setRefineReady(null)}
                  className="px-3 py-2 rounded-pill text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                  Keep refining
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool switched mid-lesson — offer to rebuild on the new tool */}
      {showToolSwitch && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
          {!confirmingRebuild ? (
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="flex-1 text-sm text-ink dark:text-slate-200">
                You switched your AI tool to <strong>{newToolLabel}</strong>, but this lesson was built for <strong>{builtToolLabel}</strong>.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setConfirmingRebuild(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Rebuild for {newToolLabel}
                </button>
                <button onClick={() => setDismissedForToolId(currentToolId)}
                  className="px-3 py-2 rounded-pill text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                  Keep {builtToolLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="flex-1 text-sm text-ink dark:text-slate-200">
                This will <strong>restart the lesson</strong> from the beginning, built for {newToolLabel}. Your current progress here will be cleared.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={rebuildForCurrentTool}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Rebuild &amp; restart
                </button>
                <button onClick={() => setConfirmingRebuild(false)}
                  className="px-3 py-2 rounded-pill text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Lesson title + objectives — pinned under the steps on every screen so
          the learner always sees what they picked and where it's headed. */}
      <div className="rounded-2xl border border-brand-200 dark:border-slate-700 bg-brand-50/50 dark:bg-slate-800 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          {FORMAT_LABEL[format] || 'Lesson'}
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-ink dark:text-slate-200 leading-snug mt-0.5">{topic}</h2>
        {objectives.length > 0 && (
          <div className="mt-3 pt-3 border-t border-brand-200/70 dark:border-slate-700">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-200 mb-1.5">
              <Target className="w-4 h-4 text-brand" /> By the end, you'll be able to:
            </h3>
            <ul className="space-y-1">
              {objectives.map((o) => (
                <li key={o.id} className="flex items-start gap-2 text-sm text-ink dark:text-slate-300">
                  <Check className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <span>{o.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tool callout — shown on the first step, then drops away as the learner
          continues (they've already opened their tool by then). */}
      {stepIdx === 0 && (
        <LlmWindowCallout storageKey="planlesson" recommendation={recommendation} />
      )}

      {/* Step body */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-xs font-bold">{stepIdx + 1}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {step?.kind === 'activity' ? 'Activity' : step?.kind === 'build' ? 'Build' : step?.kind === 'recap' ? 'Recap' : step?.kind === 'qa' ? 'Your question' : 'Step'}
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
              <LessonInteractive blocks={teach?.blocks} />
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

        {step?.kind === 'build' && (
          <div>
            <FormattedContent text={step.build?.brief || ''} />
            {step.build?.example && (
              <LessonInteractive blocks={[{ type: 'reveal', title: 'Example to model', prompt: 'Show me an example to model', content: step.build.example }]} />
            )}

            {resolved[step.id] && artifact[step.id] ? (
              <div className="mt-4 rounded-xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300 mb-1.5">
                  <Check className="w-4 h-4" /> Added to your project: {artifact[step.id].name}
                </p>
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-700 p-3 text-sm text-ink dark:text-slate-200 whitespace-pre-wrap max-h-48 overflow-auto">{artifact[step.id].content}</div>
                <button onClick={() => editBuildPiece(step)} className="mt-2 text-xs font-medium text-brand hover:text-brand-600">Edit this piece</button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-200 mb-1">
                  <Hammer className="w-4 h-4 text-brand" /> Make it{step.build?.deliverableName ? `: ${step.build.deliverableName}` : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Build this in your AI tool, then paste it here to save it into your project.</p>
                <textarea
                  value={buildDraft[step.id] || ''}
                  onChange={(e) => setBuildDraft((p) => ({ ...p, [step.id]: e.target.value }))}
                  placeholder="Paste what you made here…"
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand resize-y"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button onClick={() => addBuildPiece(step)} disabled={!(buildDraft[step.id] || '').trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 transition-all">
                    <Check className="w-4 h-4" /> Add to my project
                  </button>
                  <button onClick={() => reviewBuild(step)} disabled={!(buildDraft[step.id] || '').trim() || buildReviewing === step.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 disabled:opacity-50 transition-all">
                    {buildReviewing === step.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reviewing…</> : <><Sparkles className="w-3.5 h-3.5" /> Get feedback</>}
                  </button>
                  <button onClick={() => skipBuildPiece(step)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Skip this piece</button>
                </div>
                {buildReview[step.id] && (
                  <div className="mt-3 rounded-xl bg-brand-50 dark:bg-slate-700/50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300 mb-1"><MessageSquare className="w-4 h-4" /> Feedback</p>
                    <FormattedContent text={buildReview[step.id].feedback} />
                    {buildReview[step.id].suggestions?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {buildReview[step.id].suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-ink dark:text-slate-300"><ChevronRight className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" /> {s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step?.kind === 'recap' && (
          isQuest && builtCount > 0 ? (
            <div className="py-4">
              <div className="text-center mb-5">
                <Trophy className="w-10 h-10 text-cta-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Your project is built! 🎉</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You created {builtCount} {builtCount === 1 ? 'piece' : 'pieces'}. Here&rsquo;s your finished project — copy or download it to keep.
                </p>
              </div>
              <div className="rounded-2xl border border-brand-200 dark:border-slate-600 bg-bg-subtle dark:bg-slate-900 p-4 space-y-3 max-h-[420px] overflow-auto">
                {steps.filter((s) => s.kind === 'build' && artifact[s.id]?.content).map((s) => (
                  <div key={s.id} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">{artifact[s.id].name}</p>
                    <div className="text-sm text-ink dark:text-slate-200 whitespace-pre-wrap">{artifact[s.id].content}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button onClick={copyDeliverable} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-all">
                  {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy all</>}
                </button>
                <button onClick={downloadDeliverable} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-all">
                  <Download className="w-4 h-4" /> Download .md
                </button>
                <button onClick={finishLesson} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all">
                  <Trophy className="w-4 h-4" /> Finish &amp; earn XP
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Trophy className="w-10 h-10 text-cta-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">You did it!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{isQuest ? 'You worked through every step of your project.' : 'You completed every activity and proved each objective.'}</p>
              <button onClick={finishLesson} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all">
                <Trophy className="w-4 h-4" /> Finish &amp; earn XP
              </button>
            </div>
          )
        )}
      </div>

      {/* Nav: activities must be passed before advancing; no finishing early */}
      {step?.kind !== 'recap' && (
        <div className="flex items-center justify-between gap-3">
          <button onClick={goBack} disabled={stepIdx === 0}
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            {isQuest && builtCount > 0 && (
              <span className="text-xs font-medium text-brand">{builtCount} {builtCount === 1 ? 'piece' : 'pieces'} in your project</span>
            )}
            {!canAdvance ? (
              <span className="text-xs text-slate-400">
                {isActivity ? 'Give the activity a try to continue' : isBuild ? 'Add or skip your piece to continue' : 'Loading this step…'}
              </span>
            ) : (
              <button onClick={goNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
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

      {/* "This isn't what I was looking for" — gather more, then regenerate. */}
      {!refineOpen ? (
        <div className="text-center">
          <button
            onClick={openRefine}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> This isn&rsquo;t what I was looking for
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 dark:border-slate-600 shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-200">
              <MessageSquare className="w-4 h-4 text-brand" /> Let&rsquo;s find a better fit
            </p>
            <button onClick={() => setRefineOpen(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Close</button>
          </div>

          {/* Refine conversation */}
          <div className="space-y-3">
            {refineMessages.map((m, i) => (
              m.role === 'assistant' ? (
                <div key={i} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-bg-subtle dark:bg-slate-900 px-3 py-2 text-sm text-ink dark:text-slate-200">
                    <FormattedContent text={m.content} />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-brand text-white px-3 py-2 rounded-2xl rounded-br-md text-sm">{m.content}</div>
                </div>
              )
            ))}
            {refineLoading && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm pl-8">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          {/* Once we have a sharper topic, the confirm + overwrite warning lives
              in the banner at the top — point the learner up to it. */}
          {refineReady ? (
            <button
              onClick={() => refineBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="mt-3 w-full text-left text-xs font-medium text-brand hover:text-brand-600 transition-colors"
            >
              ↑ Your new lesson is ready — confirm it at the top of the page.
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-3">
              <input
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendRefine()}
                placeholder="Tell me what you were hoping to learn…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand"
              />
              <button onClick={sendRefine} disabled={refineLoading || !refineInput.trim()}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
