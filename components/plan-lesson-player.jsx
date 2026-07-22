'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FormattedContent } from '@/components/lesson-slide';
import LessonInteractive from '@/components/lesson-interactive';
import LessonActivity from '@/components/lesson-activity';
import OpenToolLink, { mentionsOpenTool } from '@/components/open-tool-link';
import ConfettiBurst from '@/components/confetti-burst';
import { getPausedLesson, upsertPausedLesson, removePausedLesson } from '@/lib/paused-lessons';
import BookLoader from '@/components/book-loader';
import { useProfile } from '@/components/profile-provider';
import { useActiveTool } from '@/components/active-tool-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { onLessonComplete, normalizeTopic, PASS_THRESHOLD } from '@/lib/progression';
import { useProgression } from '@/components/progression-provider';
import { emitXp } from '@/lib/xp-bus';
import { trackLessonComplete } from '@/lib/track';
import {
  Target, ChevronRight, ChevronLeft, Send, Loader2, Trophy, Pause, Lightbulb, Check, RotateCcw, MessageSquare, RefreshCw,
  Hammer, Copy, Download, Sparkles, LifeBuoy, ExternalLink, ArrowUp, MousePointerClick,
} from 'lucide-react';

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
  const { tools, primaryTool } = useActiveTool();
  const { lessonHistory } = useProgression();
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
  // stepId -> true once the learner has explored every interactive element on a
  // teach step (all tabs/cards/reveals). Gates Continue so they don't skip past
  // the interactive teaching without engaging it.
  const [teachEngaged, setTeachEngaged] = useState({});
  // We only nudge the learner to open their AI tool ONCE per lesson — after they
  // open it (the window is reused/refocused on later steps), we stop showing the
  // Open button so it isn't asked again and again.
  const [toolOpened, setToolOpened] = useState(false);
  // Which section of a teach step is showing (Concept → Vocabulary → Key points),
  // so we present one section at a time instead of a wall of content. Reset on
  // every step change.
  const [panelIdx, setPanelIdx] = useState(0);
  const markTeachEngaged = useCallback((id) => {
    setTeachEngaged((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);
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
  // Collapse the chat history (not the input) so it stops eating the screen
  // after a long back-and-forth. The thread itself is retained in qaThread.
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  // The tool the lesson is actually built around (recommended-if-owned, else the
  // learner's starred tool). Sent first so generation centers on it.
  const [lessonToolIds, setLessonToolIds] = useState(null);
  // The resolved tool OBJECT the lesson is built around — powers the "Open" button
  // and tool labels so they name the same tool the content was written for.
  const [lessonTool, setLessonTool] = useState(null);
  const startedAt = useRef(new Date().toISOString());
  const recorded = useRef(false);

  // "This isn't what I was looking for" refinement chat. We ask follow-up
  // questions until we can name a sharper topic, then offer to regenerate the
  // whole lesson around it (with an overwrite warning).
  // refineOpen also acts as the chat MODE: when true, the single in-lesson chat
  // box switches from "ask the coach" to "find a better fit" (shared input).
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineMessages, setRefineMessages] = useState([]); // {role, content}
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineReady, setRefineReady] = useState(null); // { message, newTopic } once we have enough
  const refineBannerRef = useRef(null);
  // A tool the learner explicitly asked for during the refine chat. Applied to
  // the NEXT rebuild's tool recommendation so the lesson switches tools without
  // changing the topic, then consumed once.
  const refinePreferredToolRef = useRef(null);

  // Project Quest build engine: each build step captures a real piece the
  // learner makes; pieces accumulate into `artifact` (stepId -> {name, content})
  // and assemble into a deliverable at the end. Drafts/feedback are per-step.
  const isQuest = format === 'project_quest';
  const [artifact, setArtifact] = useState({});         // stepId -> { name, content }
  const [buildDraft, setBuildDraft] = useState({});      // stepId -> textarea string
  const [buildReview, setBuildReview] = useState({});    // stepId -> { feedback, suggestions, looksGood }
  const [buildReviewing, setBuildReviewing] = useState(null); // stepId currently being reviewed
  const [copied, setCopied] = useState(false);
  // Celebratory confetti when the learner reaches the recap — fire once.
  const [showConfetti, setShowConfetti] = useState(false);
  const celebratedRef = useRef(false);

  // End-of-lesson: claim XP first, THEN run the "did this help?" checkpoint.
  const [claimed, setClaimed] = useState(false);      // XP recorded, lesson done
  const [award, setAward] = useState(null);           // result of onLessonComplete
  const [helpful, setHelpful] = useState(null);       // null | 'yes' | 'no'
  const [stillUnclear, setStillUnclear] = useState('');
  const [nextSteps, setNextSteps] = useState(null);   // { intro, steps, prompt }
  const [nextLoading, setNextLoading] = useState(false);
  const [nextCopied, setNextCopied] = useState(false);

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
        const saved = getPausedLesson(format, topic)?.state || null;
        if (saved && saved.plan) {
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
          if (saved.lessonToolIds) {
            setLessonToolIds(saved.lessonToolIds);
            const savedTool = (tools || []).find((t) => t.id === saved.lessonToolIds[0]);
            if (savedTool) setLessonTool(savedTool);
          }
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
      // Consume any tool the learner asked for in the refine chat — applies to
      // this one rebuild so the recommendation matches what they said.
      const preferredTool = refinePreferredToolRef.current;
      refinePreferredToolRef.current = null;
      let recTool = null;
      try {
        const rr = await fetch('/api/lesson/recommend-tool', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, preferredTool }),
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
      if (active) { setLessonToolIds(lessonTools); setLessonTool(primary); }

      // Try up to twice on the client too — if the first request fails (the
      // server already retries internally), a fresh attempt usually succeeds
      // before we ever show an error.
      let planData = null;
      let planErr = null;
      // Per-attempt timeout so a hung server call (the route's own budget is 120s
      // via maxDuration) can't leave the learner spinning on the browser default
      // forever — it falls into the retry, then the existing error UI. Generous
      // enough (90s) that a normal deep-dive generation is never aborted.
      const PLAN_TIMEOUT_MS = 90000;
      for (let attempt = 1; attempt <= 2 && active; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PLAN_TIMEOUT_MS);
        try {
          const res = await fetch('/api/lesson/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, format, tools: lessonTools }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to plan lesson');
          planData = data;
          planErr = null;
          break;
        } catch (err) {
          clearTimeout(timer);
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

  // Celebrate the moment they reach the recap — confetti, once per lesson.
  useEffect(() => {
    if (step?.kind === 'recap' && !celebratedRef.current) {
      celebratedRef.current = true;
      setShowConfetti(true);
    }
  }, [step]);

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
    // `topic` here is still the lesson being left (regenerateWithTopic sets the
    // new topic just before this, but the closure keeps the old value), so this
    // clears the OLD paused entry; the new topic gets its own on next persist.
    removePausedLesson(format, topic);
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
    setToolOpened(false);
    // Reset the end-of-lesson checkpoint so the regenerated lesson earns its own
    // XP and gets a fresh "did this help?" prompt.
    setClaimed(false);
    setHelpful(null);
    setStillUnclear('');
    setNextSteps(null);
    celebratedRef.current = false;
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
    setQuestion('');
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
      // A tool the learner named applies to the rebuild — it changes the tool,
      // never the topic.
      if (d?.tool) refinePreferredToolRef.current = d.tool;
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
    setQuestion('');
    if (refineMessages.length === 0) runRefineStep([]);
    setTimeout(() => {
      try { document.getElementById('lesson-coach')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
    }, 50);
  }

  // Send a turn in the unified chat's "find a better fit" mode, reading the same
  // input the coach uses so there's only ever one box.
  function sendRefine() {
    const text = question.trim();
    if (!text || refineLoading) return;
    setQuestion('');
    setRefineReady(null);
    const next = [...refineMessages, { role: 'user', content: text }];
    setRefineMessages(next);
    runRefineStep(next);
  }

  // ---- Persist progress (pause/resume) --------------------------------------
  const persist = useCallback((next = {}) => {
    // Once XP is claimed the lesson is complete and claimXp() has already removed
    // its paused entry. Never re-persist after that — the lesson stays on screen
    // for the "did this help?" checkpoint, and any interaction there (e.g. asking
    // the coach, which persists the Q&A thread) would otherwise silently re-add a
    // finished lesson to the resume queue. Same guard the conversational player has.
    if (recorded.current) return;
    const sIdx = next.stepIdx ?? stepIdx;
    const sArr = next.steps || steps;
    upsertPausedLesson({
      format,
      topic,
      startedAt: startedAt.current,
      stepLabel: sArr.length ? `Step ${sIdx + 1} of ${sArr.length}` : '',
      state: {
        topic, format, plan,
        steps: sArr,
        stepIdx: sIdx,
        teachContent: next.teachContent || teachContent,
        resolved: next.resolved || resolved,
        artifact: next.artifact || artifact,
        qaThread: next.qaThread || qaThread,
        lessonToolIds,
        recommendation,
        startedAt: startedAt.current,
      },
    });
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
  // A teach step is "ready" once its content has loaded AND — if it carries
  // interactive blocks — the learner has explored them all.
  const isTeachStep = step?.kind === 'teach';
  const teachData = isTeachStep ? teachContent[step?.id] : null;
  const teachBlocks = Array.isArray(teachData?.blocks) ? teachData.blocks : [];
  // Interactive blocks the learner must engage to continue: flip cards, compare
  // tabs, clickable diagrams. Examples ("reveal") are OPTIONAL and never gate.
  const INTERACTIVE_TYPES = ['flashcards', 'tabs', 'diagram'];
  const teachInteractiveTypes = teachBlocks.filter((b) => INTERACTIVE_TYPES.includes(b?.type)).map((b) => b.type);
  const teachInteractive = teachInteractiveTypes.length > 0;
  // The gate prompt must match what's actually on screen — only say "card" when
  // there are real flip cards; tabs/diagrams get their own wording.
  const exploreGateMsg = (() => {
    const kinds = new Set(teachInteractiveTypes);
    if (kinds.size === 1) {
      if (kinds.has('flashcards')) return 'Flip every card above to continue';
      if (kinds.has('tabs')) return 'Open every tab above to continue';
      if (kinds.has('diagram')) return 'Explore the diagram above to continue';
    }
    return 'Explore everything above to continue';
  })();
  // The panel label + intro must also match the real blocks — "Vocabulary" /
  // "Tap each card" only fit flashcards; tabs and diagrams get their own wording.
  const interactiveKindLabel = (() => {
    const kinds = new Set(teachInteractiveTypes);
    if (kinds.size === 1) {
      if (kinds.has('flashcards')) return 'Key terms';
      if (kinds.has('tabs')) return 'Compare';
      if (kinds.has('diagram')) return 'How it works';
    }
    return 'Explore';
  })();
  const interactiveIntro = (() => {
    const kinds = new Set(teachInteractiveTypes);
    if (kinds.size === 1) {
      if (kinds.has('flashcards')) return 'Tap each card to reveal its meaning. Flip them all to unlock the next section.';
      if (kinds.has('tabs')) return 'Tap each tab to compare them — open them all to unlock the next section.';
      if (kinds.has('diagram')) return 'Tap through the diagram to explore it, then continue.';
    }
    return 'Tap each item below to explore it — open them all to unlock the next section.';
  })();
  // Ordered sections of a teach step, shown ONE AT A TIME so the learner isn't
  // hit with everything at once: Concept → Vocabulary (cards) → Key points.
  const teachPanels = (() => {
    if (!isTeachStep || !teachData) return [];
    const p = [];
    if (teachData.message) p.push('concept');
    if (teachBlocks.length) p.push('cards');
    if (Array.isArray(teachData.keyPoints) && teachData.keyPoints.length) p.push('keypoints');
    return p.length ? p : ['concept'];
  })();
  const safePanelIdx = Math.min(panelIdx, Math.max(0, teachPanels.length - 1));
  const currentPanel = teachPanels[safePanelIdx] || null;
  const onLastPanel = !isTeachStep || teachPanels.length <= 1 || safePanelIdx >= teachPanels.length - 1;
  // The vocabulary section blocks advancing until every required card is engaged.
  const cardsGate = isTeachStep && currentPanel === 'cards' && teachInteractive && !teachEngaged[step.id];
  // Can the bottom button advance (to the next section or, on the last one, the
  // next step)? Activities/builds gate on being settled; teach gates on the
  // current section being ready; recap never auto-advances.
  const canAdvance = step?.kind === 'recap' ? false
    : (isActivity || isBuild) ? stepSettled
    : isTeachStep ? (!!teachData && !cardsGate)
    : true;
  const builtCount = steps.filter((s) => s.kind === 'build' && artifact[s.id]?.content).length;
  // Did this learner already PASS this exact lesson before? If so, finishing
  // again earns no new XP. (Merely finishing without passing still leaves the
  // full amount on the table, so that doesn't count as "already earned".)
  const alreadyEarned = (lessonHistory || []).some(
    (l) => normalizeTopic(l.topic) === normalizeTopic(topic)
      && (l.format || 'quick_lesson') === format
      && (l.correctness ?? 0) >= PASS_THRESHOLD,
  );

  function goNext() {
    if (stepIdx < total - 1) {
      const ni = stepIdx + 1;
      setStepIdx(ni);
      setPanelIdx(0);
      persist({ stepIdx: ni });
    }
  }
  function goBack() {
    if (stepIdx > 0) { const ni = stepIdx - 1; setStepIdx(ni); setPanelIdx(0); persist({ stepIdx: ni }); }
  }
  // The bottom button: advance to the next SECTION within a teach step, or — on
  // the last section (or any non-teach step) — advance to the next STEP.
  function advance() {
    if (onLastPanel) goNext();
    else setPanelIdx((p) => p + 1);
  }
  // Back steps within sections first, then to the previous step.
  function back() {
    if (isTeachStep && safePanelIdx > 0) setPanelIdx((p) => Math.max(0, p - 1));
    else goBack();
  }

  function pauseAndExit() {
    persist();
    if (onExit) onExit();
    else router.push('/');
  }

  // Ask a question without leaving the step: the answer threads in below the
  // chat. The full lesson-so-far is sent so the answer is grounded (the model
  // is NOT stateless from the learner's point of view anymore).
  async function askQuestion(qOverride, displayOverride) {
    const q = (typeof qOverride === 'string' ? qOverride : question).trim();
    if (!q || asking) return;
    // `display` is what shows in the chat bubble; `q` is the full prompt sent to
    // the coach. They differ for actions like "Why this score?" that bake score
    // context into the prompt but should show a short, clean question.
    let display = (typeof displayOverride === 'string' && displayOverride.trim()) || q;
    // Safety net: if a multi-line, context-baked prompt ever arrives WITHOUT an
    // explicit short display, never dump the whole block into the blue bubble —
    // show only its final line (the actual question). Typed questions are
    // single-line, so this only ever trims baked prompts like "Why this score?".
    if (!(typeof displayOverride === 'string' && displayOverride.trim()) && q.includes('\n')) {
      const lastLine = q.split('\n').map((s) => s.trim()).filter(Boolean).pop();
      if (lastLine) display = lastLine;
    }
    setQuestion('');
    setChatCollapsed(false); // a new message always reopens the thread
    setAsking(true);
    const id = `q_${stepIdx}_${q.length}_${qaThread.length}`;
    setQaThread((prev) => {
      const next = [...prev, { id, q: display, a: '', loading: true }];
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

  // ---- End-of-lesson checkpoint ---------------------------------------------
  async function getNextSteps() {
    if (nextLoading) return;
    setNextLoading(true);
    try {
      const res = await fetch('/api/lesson/next-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, format, objectives, stillUnclear }),
      });
      const d = res.ok ? await res.json() : null;
      if (d) setNextSteps(d);
    } catch {
      // best-effort; leave nextSteps null and let them try again
    } finally {
      setNextLoading(false);
    }
  }

  // Reuse the refine→regenerate flow for "take a more focused lesson", seeding it
  // with what they said is still unclear so it gets to a sharper topic faster.
  function startBetterLesson() {
    const seed = stillUnclear.trim();
    setRefineOpen(true);
    setRefineReady(null);
    if (seed && refineMessages.length === 0) {
      const msgs = [{ role: 'user', content: seed }];
      setRefineMessages(msgs);
      runRefineStep(msgs);
    } else if (refineMessages.length === 0) {
      runRefineStep([]);
    }
    // The chat now lives inside the lesson card — bring it into view.
    setTimeout(() => {
      try { document.getElementById('lesson-coach')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
    }, 50);
  }

  // The single in-lesson chat box routes to the right backend by mode: "find a
  // better fit" while refining, otherwise the lesson coach.
  function submitChat() {
    if (refineOpen) sendRefine();
    else askQuestion();
  }

  // Every in-lesson "ask about this" action (e.g. "Why this score?") funnels
  // into the SAME coach thread instead of its own box. The caller passes a
  // fully-formed question with any context baked in, so there's one chat bucket.
  function askCoach(text, display) {
    if (!text) return;
    setRefineOpen(false);
    askQuestion(text, display);
    setTimeout(() => {
      try { document.getElementById('lesson-coach')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
    }, 50);
  }

  async function copyNextPrompt() {
    if (!nextSteps?.prompt) return;
    try {
      await navigator.clipboard.writeText(nextSteps.prompt);
      setNextCopied(true);
      setTimeout(() => setNextCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  // Claim XP and complete the lesson, but DON'T leave — we then show the
  // "did this help?" checkpoint so they can grab resources after earning XP.
  function claimXp() {
    if (recorded.current) { setClaimed(true); return; }
    recorded.current = true;
    try {
      removePausedLesson(format, topic);
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
        setAward(result);
        trackLessonComplete(topic, format, durationMs);
      }
    } catch {
      // best-effort
    }
    setClaimed(true);
  }

  // Retake: redo this same lesson from the top so a passing attempt can top the
  // XP up to the full amount. Keeps the generated content; only resets progress.
  function retakeLesson() {
    recorded.current = false;
    startedAt.current = new Date().toISOString();
    setStepIdx(0);
    setResolved({});
    setClaimed(false);
    setHelpful(null);
    setAward(null);
    persist({ stepIdx: 0, resolved: {} });
  }

  // Leave the lesson once they're done with the checkpoint.
  function exitLesson() {
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

  // Shown AFTER they claim XP: did the lesson answer what they came for? "Yes,
  // I'm all set" just exits; "Not quite" surfaces tailored resources or a more
  // focused lesson. Their XP is already banked, so nothing here gates it.
  const checkpointBlock = (
    <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-5">
      {helpful !== 'no' ? (
        <>
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400 mb-3">
            <Trophy className="w-4 h-4" /> {alreadyEarned ? 'Already earned — nice refresher!' : 'XP earned — nice work!'}
          </p>
          <p className="text-center text-sm font-semibold text-ink dark:text-slate-200 mb-1">
            One more thing — did this help with what you came to learn?
          </p>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">{topic}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={exitLesson} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all">
              <Check className="w-4 h-4" /> Yes, I&rsquo;m all set
            </button>
            <button onClick={() => setHelpful('no')} className="px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              Not quite
            </button>
          </div>
        </>
      ) : (
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">No problem — let&rsquo;s get you unstuck.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">What were you still hoping to figure out? (optional — makes the help more specific)</p>
          <input
            value={stillUnclear}
            onChange={(e) => setStillUnclear(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') getNextSteps(); }}
            placeholder="e.g., I still don't know how to connect the Slack node"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand mb-3"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={getNextSteps} disabled={nextLoading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all">
              {nextLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding resources…</> : <><LifeBuoy className="w-3.5 h-3.5" /> Get troubleshooting resources</>}
            </button>
            <button onClick={startBetterLesson} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-all">
              <RotateCcw className="w-3.5 h-3.5" /> Take a more focused lesson
            </button>
          </div>

          {nextSteps && (
            <div className="mt-4 rounded-xl bg-bg-subtle dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
              {nextSteps.intro && <p className="text-sm text-ink dark:text-slate-200 mb-2">{nextSteps.intro}</p>}
              <ul className="space-y-2">
                {nextSteps.steps?.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-semibold text-ink dark:text-slate-200">{s.title}</span>
                    {s.detail ? <span className="text-slate-600 dark:text-slate-400"> — {s.detail}</span> : null}
                    {s.url ? <> <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-0.5">open <ExternalLink className="w-3 h-3" /></a></> : null}
                  </li>
                ))}
              </ul>
              {nextSteps.prompt && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paste this into your AI tool</p>
                    <button onClick={copyNextPrompt} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-600">
                      {nextCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <div className="rounded-lg bg-ink/90 dark:bg-slate-950 text-slate-100 text-xs p-3 whitespace-pre-wrap">{nextSteps.prompt}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-center">
            <button onClick={exitLesson} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              Back to lessons
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Recap footer: claim XP first; once claimed, the checkpoint takes its place.
  const recapFooter = !claimed ? (
    <div className="mt-5 text-center">
      <button onClick={claimXp} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all">
        <Trophy className="w-4 h-4" /> {alreadyEarned ? 'Finish lesson' : 'Finish & earn XP'}
      </button>
      {alreadyEarned && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          You already earned XP for this lesson — no new XP, but great to review!
        </p>
      )}
    </div>
  ) : (
    <>
      {/* Finished but didn't pass: they got the floor; nudge a retake for full XP. */}
      {award && award.passed === false && !alreadyEarned && (
        <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <p className="text-sm text-ink dark:text-slate-200">
            You earned <span className="font-bold">{award.xpAwarded} XP</span> for finishing. Score{' '}
            {Math.round(PASS_THRESHOLD * 100)}%+ to earn the full <span className="font-bold">{award.maxXp} XP</span>.
          </p>
          <button
            onClick={retakeLesson}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Retake to earn full XP
          </button>
        </div>
      )}
      {checkpointBlock}
    </>
  );

  return (
    <div className="space-y-5">
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

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

      {/* Chapter progress rail — accent gradient, sleeker than a plain bar. */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((stepIdx + 1) / total) * 100}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))' }} />
        </div>
        <span className="text-xs font-medium whitespace-nowrap tabular-nums" style={{ color: 'var(--ink-dim)' }}>{stepIdx + 1} / {total}</span>
        <button onClick={pauseAndExit} className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <Pause className="w-3.5 h-3.5" /> Pause
        </button>
      </div>

      {/* Chapter hero — eyebrow + big gradient topic title, pinned on every
          screen so the learner always sees what they're in. Objectives show on
          the opening step only, like a chapter intro. */}
      <div className="text-center pt-4 pb-1">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[.18em] mb-4" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--accent)' }}>
          {FORMAT_LABEL[format] || 'Lesson'} · Step {stepIdx + 1} of {total}
        </span>
        <h1 className="font-display font-extrabold leading-[1.04] tracking-tight cine-grad-flow mx-auto max-w-3xl" style={{ fontSize: 'clamp(28px,4vw,48px)' }}>{topic}</h1>
        {stepIdx === 0 && objectives.length > 0 && (
          <ul className="mt-5 max-w-md mx-auto space-y-1.5 text-left">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-dim)' }}>
                <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--good)' }} />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

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
              {/* Section progress for multi-section teach steps. */}
              {isTeachStep && teachPanels.length > 1 && (
                <div className="flex items-center gap-1.5 mb-3">
                  {teachPanels.map((p, i) => (
                    <span
                      key={p}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safePanelIdx ? 'w-6 bg-brand' : i < safePanelIdx ? 'w-3 bg-brand/40' : 'w-3 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {currentPanel === 'concept' ? 'Concept' : currentPanel === 'cards' ? interactiveKindLabel : 'Key points'}
                  </span>
                </div>
              )}

              {/* qa answers render whole; teach steps render one section at a time. */}
              {(!isTeachStep || currentPanel === 'concept') && (
                <FormattedContent text={teach?.message || ''} tool={lessonTool} />
              )}

              {(!isTeachStep || currentPanel === 'cards') && teachBlocks.length > 0 && (
                <>
                  {(() => {
                    const hasExample = teachBlocks.some((b) => b?.type === 'reveal');
                    return (
                      <p className="mb-3 flex items-start gap-1.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                        <MousePointerClick className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {teachInteractive && `${interactiveIntro} `}
                          {hasExample && 'Open “Show me an example” for an optional walkthrough — it’s not required to continue.'}
                        </span>
                      </p>
                    );
                  })()}
                  <LessonInteractive
                    blocks={teach?.blocks}
                    onEngagementChange={(done) => { if (done) markTeachEngaged(step.id); }}
                  />
                </>
              )}

              {(!isTeachStep || currentPanel === 'keypoints') && teach?.keyPoints?.length > 0 && (
                <div className="rounded-xl bg-brand-50 dark:bg-slate-700/50 p-4">
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
          <>
            {/* The ONE place we nudge the learner to open their AI tool: a
                prompt-writing activity needs it. Shown once per lesson (the
                window is reused on later steps), with a short line naming the
                tool so they know exactly where to do the work. */}
            {!toolOpened && !(step.id in resolved) && step.activityType === 'write' && (lessonTool || primaryTool)?.url && (
              <div className="mb-3 rounded-xl border border-brand-200 dark:border-slate-600 bg-brand-50/70 dark:bg-slate-800 p-3">
                <p className="text-sm text-ink dark:text-slate-200 mb-2">
                  This part is hands-on in <span className="font-semibold">{(lessonTool || primaryTool).emoji} {(lessonTool || primaryTool).label}</span>. Open it in a separate window and do the work there — then come back here.
                </p>
                <OpenToolLink tool={lessonTool} onOpened={() => setToolOpened(true)} />
              </div>
            )}
          <LessonActivity
            activityType={step.activityType}
            activity={step.activity}
            objective={objectives.find((o) => o.id === step.objectiveId)?.text}
            resolved={step.id in resolved}
            passed={resolved[step.id] === true}
            onResolve={(p) => resolveActivity(step.id, p)}
            toolLabel={(lessonTool || primaryTool)?.label}
            onAskCoach={askCoach}
          />
          </>
        )}

        {step?.kind === 'build' && (
          <div>
            <FormattedContent text={step.build?.brief || ''} tool={lessonTool} />
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
              </div>
              {recapFooter}
            </div>
          ) : (
            <div className="py-4">
              <div className="text-center">
                <Trophy className="w-10 h-10 text-cta-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">You did it!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{isQuest ? 'You worked through every step of your project.' : 'You completed every activity and proved each objective.'}</p>
              </div>
              {recapFooter}
            </div>
          )
        )}

        {/* In-lesson chat — ONE box for everything: ask the coach, or switch to
            "find a better fit" to retarget the lesson. Kept in the SAME card as
            the content so it reads as one unit, not a detached window. */}
        <div id="lesson-coach" className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
        {refineOpen ? (
          <div className="flex items-start justify-between gap-2 mb-2 px-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink dark:text-slate-200">
              <RotateCcw className="w-3.5 h-3.5 text-brand shrink-0" /> Let&rsquo;s find a better fit — tell me what you were hoping to learn.
            </p>
            <button onClick={() => setRefineOpen(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">Back to lesson help</button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 mb-2 px-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Need a hand? Ask about the lesson, how to use your AI tool, or anything you&apos;re stuck on — I&apos;ll help right here without losing your place.</p>
            {(qaThread.length > 0 || refineMessages.length > 0) && (
              <button
                onClick={() => setChatCollapsed((v) => !v)}
                className="shrink-0 text-xs font-medium text-brand hover:text-brand-600 transition-colors"
              >
                {chatCollapsed ? `Show chat (${qaThread.length + refineMessages.length})` : 'Hide chat'}
              </button>
            )}
          </div>
        )}

        {/* Input — hidden only once a better-fit topic is ready to confirm. */}
        {!(refineOpen && refineReady) && (
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitChat()}
            placeholder={refineOpen ? 'Tell me what you were hoping to learn…' : "Ask a question or tell me what you're stuck on…"}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand"
          />
          <button onClick={submitChat} disabled={(refineOpen ? refineLoading : asking) || !question.trim()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all">
            {(refineOpen ? refineLoading : asking) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        )}

        {/* One thread: coach Q&A first, then the find-a-better-fit turns.
            Hidden (but retained) when the learner collapses it. */}
        {(qaThread.length > 0 || refineMessages.length > 0) && (!chatCollapsed || refineOpen) && (
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

            {refineMessages.map((m, i) => (
              m.role === 'assistant' ? (
                <div key={`r${i}`} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-bg-subtle dark:bg-slate-900 px-3 py-2 text-sm text-ink dark:text-slate-200">
                    <FormattedContent text={m.content} />
                  </div>
                </div>
              ) : (
                <div key={`r${i}`} className="flex justify-end">
                  <div className="max-w-[85%] bg-brand text-white px-3 py-2 rounded-2xl rounded-br-md text-sm">{m.content}</div>
                </div>
              )
            ))}
            {refineOpen && refineLoading && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm pl-8">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            )}

            {refineOpen && refineReady && (
              <div className="rounded-xl border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 p-3">
                <p className="text-sm text-ink dark:text-slate-200 mb-2">
                  Ready: a new lesson on <span className="font-semibold text-brand">{refineReady.newTopic}</span>. This replaces the current one.
                </p>
                <button onClick={() => regenerateWithTopic(refineReady.newTopic)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all">
                  <RotateCcw className="w-4 h-4" /> Start the better-fit lesson
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {step?.kind !== 'recap' && (
        <div className="flex items-center justify-between gap-3">
          <button onClick={back} disabled={stepIdx === 0 && (!isTeachStep || safePanelIdx === 0)}
            className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            {isQuest && builtCount > 0 && (
              <span className="text-xs font-medium text-brand">{builtCount} {builtCount === 1 ? 'piece' : 'pieces'} in your project</span>
            )}
            {!canAdvance ? (
              (isActivity || isBuild || cardsGate) ? (
                // An actionable gate — make it bold and prominent so it's clear
                // what to finish before they can move on.
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <ArrowUp className="w-4 h-4" />
                  {isActivity ? 'Complete the activity above to continue'
                    : isBuild ? 'Add or skip your piece above to continue'
                    : exploreGateMsg}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Loading this step…</span>
              )
            ) : (
              <button onClick={advance}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all">
                {onLastPanel ? 'Continue' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* "This isn't what I was looking for" flips the single chat box above
          into find-a-better-fit mode (no separate window). */}
      {!refineOpen && (
        <div className="text-center">
          <button
            onClick={openRefine}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> This isn&rsquo;t what I was looking for
          </button>
        </div>
      )}
    </div>
  );
}
