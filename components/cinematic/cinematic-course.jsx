'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Target, Sparkles, RotateCcw, Lightbulb, RefreshCw, List } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';
import LessonInteractive from '@/components/lesson-interactive';
import LessonActivity from '@/components/lesson-activity';
import ConfettiBurst from '@/components/confetti-burst';
import BookLoader from '@/components/book-loader';
import CompletionFeedback from '@/components/completion-feedback';
import { useProfile } from '@/components/profile-provider';
import { useActiveTool } from '@/components/active-tool-provider';
import { takePrefetchedPlan } from '@/lib/lesson-prefetch';
import { getPausedLesson, upsertPausedLesson, removePausedLesson } from '@/lib/paused-lessons';
import { resolveLearnerId } from '@/lib/learner-id';
import { onLessonComplete } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';

const FORMAT_META = {
  standard: { label: 'Quick Lesson', mins: '3–5 min' },
  deep_dive: { label: 'Deep Dive', mins: '15–20 min' },
};

// A full-scroll, "chapter" lesson reader (matches the cinematic design): a
// 100vh hero, the whole lesson laid out as scroll sections that reveal in, a
// scroll-driven progress bar + side rail, and a celebratory completion. It
// reuses the same APIs and activity/teach components as the step player, so the
// content + grading + XP are identical — only the presentation is the scroll.
export default function CinematicCourse({ topic, format = 'standard', onExit, onFocusedLesson }) {
  const { profile } = useProfile();
  const { tools, primaryTool } = useActiveTool();
  const meta = FORMAT_META[format] || FORMAT_META.standard;
  // Quick Lessons are short enough (1-2 objectives) to keep the objectives
  // permanently visible rather than behind a toggle — longer formats keep
  // the collapsible behavior so the sticky bar doesn't get crowded.
  const alwaysShowObjectives = format === 'standard';
  // Quick Lesson (3-5 min) and Deep Dive (15-20 min) share this component but
  // must FEEL like different-sized commitments: Quick Lesson reads as a compact,
  // minimal single-column note (no big hero, no chapter nav); Deep Dive leans
  // into the full "course" treatment — a tall hero, a table of contents, numbered
  // chapter dividers, and a clickable chapter rail. isDeepDive gates all of that.
  const isDeepDive = format === 'deep_dive';

  const [plan, setPlan] = useState(null);            // { objectives, steps }
  const [teach, setTeach] = useState({});            // stepId -> { message, blocks, keyPoints }
  const [teachErr, setTeachErr] = useState({});      // stepId -> true
  const [resolved, setResolved] = useState({});      // activity stepId -> passed(bool)
  const [loading, setLoading] = useState(true);
  const [teachTotal, setTeachTotal] = useState(0); // teach sections to write (for the loader progress)
  const [teachDone, setTeachDone] = useState(0);   // teach sections finished so far
  const [lessonTool, setLessonTool] = useState(null); // best-of-their-tools this lesson is built around
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [award, setAward] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showObjectives, setShowObjectives] = useState(false);
  const [activeSecId, setActiveSecId] = useState(null); // deep-dive chapter rail: which chapter is centered

  const startedAt = useRef(null);
  const heroRef = useRef(null);
  const rootRef = useRef(null);

  // ---- Generate the lesson plan, then all teach content -------------------
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setPlan(null); setTeach({}); setResolved({}); setCompleted(false);
    startedAt.current = new Date().toISOString();

    (async () => {
      // Resume an in-progress session for this exact lesson if one exists —
      // reuses its plan (and whatever teach content it already has) instead of
      // regenerating from scratch, so exiting and reopening — even mid-generation,
      // e.g. before every section finished writing — never loses progress or
      // re-spends an AI generation (mirrors PlanLessonPlayer). Anything the saved
      // session is still missing gets backfilled below like a fresh lesson would.
      let planData = null;
      let existingTeach = {};
      let existingResolved = {};
      let existingToolId = null;
      try {
        const saved = getPausedLesson(format, topic)?.state || null;
        if (saved && saved.plan) {
          planData = saved.plan;
          existingTeach = saved.teach || {};
          existingResolved = saved.resolved || {};
          existingToolId = saved.lessonToolId || null;
          startedAt.current = saved.startedAt || startedAt.current;
        }
      } catch {
        // ignore bad save
      }

      if (planData) {
        if (!active) return;
        setPlan(planData);
        setTeach(existingTeach);
        setResolved(existingResolved);
      } else {
        // Reuse a plan the picker may have already started generating the moment
        // the topic was chosen (hides the plan latency behind the mount).
        const prefetched = takePrefetchedPlan(topic, format, tools);
        if (prefetched) planData = await prefetched;
        if (!active) return;
        for (let attempt = 1; attempt <= 2 && active && !planData; attempt++) {
          try {
            const res = await fetch('/api/lesson/plan', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic, format, tools }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to plan lesson');
            planData = data; break;
          } catch (err) { if (attempt === 2) { if (active) { setError(err.message || 'Failed to design the lesson.'); setLoading(false); } } }
        }
        if (!active || !planData) return;
        setPlan(planData);
      }

      // The plan picks the best of the learner's tools for this topic and returns
      // it as primaryTool. Reorder our tools to match so teach content is written
      // around the same tool, and point the "Open" button at it.
      const orderedTools = (() => {
        const idx = tools.findIndex((t) => t.id === planData.primaryTool);
        return idx > 0 ? [tools[idx], ...tools.slice(0, idx), ...tools.slice(idx + 1)] : tools;
      })();
      let toolAlreadySet = false;
      if (existingToolId) {
        const savedTool = (tools || []).find((t) => t.id === existingToolId);
        if (savedTool) { setLessonTool(savedTool); toolAlreadySet = true; }
      }
      if (active && !toolAlreadySet) setLessonTool(orderedTools[0] || primaryTool);

      // Write whatever teach content this lesson is still missing — normally
      // all of it for a fresh lesson, or just the gap left by an earlier exit
      // mid-generation — before revealing the reader, so it's never half-empty.
      // Steps run in parallel; a step that fails after retries resolves into
      // teachErr so the gate can never hang.
      const steps = planData.steps || [];
      const teachSteps = steps.filter((s) => (s.kind === 'teach' || s.kind === 'qa') && !existingTeach[s.id]);
      setTeachTotal(teachSteps.length);
      setTeachDone(0);
      let finished = 0;

      await Promise.all(teachSteps.map((step) => {
        const idx = steps.findIndex((s) => s.id === step.id);
        const priorTitles = steps.slice(0, idx).filter((s) => s.kind === 'teach').map((s) => s.title);
        const upcoming = steps[idx + 1]?.title || '';
        return (async () => {
          for (let attempt = 1; attempt <= 3 && active; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30000);
            try {
              const res = await fetch('/api/lesson/teach', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, format, objectives: planData.objectives, step, priorTitles, priorContent: '', upcoming, tools: orderedTools }),
                signal: controller.signal,
              });
              clearTimeout(timer);
              if (!res.ok) throw new Error('failed');
              const d = await res.json();
              if (!d?.message) throw new Error('empty');
              if (!active) return;
              setTeach((prev) => ({ ...prev, [step.id]: { message: d.message, blocks: d.blocks || [], keyPoints: d.keyPoints || [] } }));
              break;
            } catch {
              clearTimeout(timer);
              if (!active) return;
              if (attempt < 3) { await new Promise((r) => setTimeout(r, 1200 * attempt)); continue; }
              setTeachErr((prev) => ({ ...prev, [step.id]: true }));
            }
          }
          finished += 1;
          if (active) setTeachDone(finished);
        })();
      }));

      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [topic, format]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Scroll-driven progress bar + side rail + hero parallax -------------
  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY || doc.scrollTop || 0;
      const p = max > 0 ? Math.min(1, y / max) : 0;
      setProgress(8 + p * 92);
      // Parallax the hero only for Deep Dive — Quick Lesson has no tall hero.
      if (isDeepDive && heroRef.current) {
        heroRef.current.style.transform = `translateY(${y * 0.3}px)`;
        heroRef.current.style.opacity = String(Math.max(0, 1 - y / 520));
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [plan, completed, isDeepDive]);

  // ---- Deep Dive: track which chapter is centered, to light its rail dot -----
  useEffect(() => {
    if (!isDeepDive || !rootRef.current) return;
    const secs = Array.from(rootRef.current.querySelectorAll('[data-sec]'));
    if (!secs.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActiveSecId(e.target.getAttribute('data-sec')); });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [isDeepDive, plan, teach, completed]);

  // ---- Reveal sections as they enter the viewport -------------------------
  useEffect(() => {
    if (!rootRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.12 });
    const els = rootRef.current.querySelectorAll('.reveal:not(.in)');
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [plan, teach, completed]);

  // ---- Persist progress (pause/resume) --------------------------------------
  // Keeps this lesson resumable from the header bell / picker's paused-lessons
  // list even if the learner closes the tab mid-generation (not just after it
  // finishes reading) — finish() clears the entry once actually complete.
  useEffect(() => {
    if (!plan || completed) return;
    const activitySteps = (plan.steps || []).filter((s) => s.kind === 'activity');
    const passedCount = Object.values(resolved).filter(Boolean).length;
    upsertPausedLesson({
      format,
      topic,
      startedAt: startedAt.current,
      stepLabel: activitySteps.length ? `${passedCount}/${activitySteps.length} activities done` : 'In progress',
      state: {
        topic, format, plan, teach, resolved,
        lessonToolId: lessonTool?.id || null,
        startedAt: startedAt.current,
      },
    });
  }, [plan, teach, resolved, completed, format, topic, lessonTool]);

  const objectives = plan?.objectives || [];
  const steps = plan?.steps || [];
  const activitySteps = steps.filter((s) => s.kind === 'activity');
  const allActivitiesDone = activitySteps.every((s) => s.id in resolved);

  // "Chapters" = the teach steps (the concepts), numbered in order. Drives the
  // Deep Dive table of contents, the chapter dividers, and the chapter rail.
  const chapters = steps.filter((s) => s.kind === 'teach');
  const conceptNumber = {};
  chapters.forEach((s, i) => { conceptNumber[s.id] = i + 1; });
  const totalChapters = chapters.length;

  // Deep Dive breathes (tall sections, big headings); Quick Lesson is tight.
  const secPad = isDeepDive ? 'py-14 sm:py-20' : 'py-7';
  const headFs = isDeepDive ? 'clamp(28px,3.6vw,46px)' : 'clamp(22px,3vw,32px)';

  const resolveActivity = useCallback((id, passed) => {
    setResolved((prev) => ({ ...prev, [id]: passed }));
  }, []);

  // Smooth-scroll a chapter into view (TOC + rail), clearing the sticky sub-bar.
  const scrollToSec = useCallback((id) => {
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function finish() {
    const passedCount = Object.values(resolved).filter(Boolean).length;
    const correctness = activitySteps.length ? passedCount / activitySteps.length : 1;
    const result = onLessonComplete(resolveLearnerId(profile), topic, startedAt.current, {
      format, correctness, quizCorrect: passedCount,
    });
    setAward(result);
    if (result) emitXp(result);
    removePausedLesson(format, topic);
    setCompleted(true);
    setShowConfetti(true);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }

  // ---- Loading / error ----------------------------------------------------
  if (loading) {
    // First "Designing…" while the plan is generated, then a live section count
    // while the full lesson is written (we hold the reader until it's complete).
    const loaderMsg = teachTotal > 0
      ? `Writing your lesson… (${teachDone} of ${teachTotal} sections)`
      : `Designing your lesson on ${topic}…`;
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <BookLoader message={loaderMsg} size="lg" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-center px-6">
        <div>
          <p className="text-base mb-4" style={{ color: 'var(--ink-dim)' }}>{error}</p>
          <button onClick={onExit} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* Sticky progress sub-bar (sits under the cinematic top nav) — pinned
          for the whole scroll, so the topic + objectives toggle stay reachable
          even after the hero (which shows them once) scrolls away. */}
      <div className="sticky top-16 z-30 -mx-6 px-6 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)', borderBottom: '1px solid var(--line)' }}>
        <div className="py-2.5 flex items-center gap-3">
          <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--ink-dim)' }}>
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
          <span className="text-xs font-bold uppercase tracking-wide shrink-0" style={{ color: 'var(--ink-dim)' }}>{meta.label}</span>
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }} title={topic}>{topic}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))' }} />
          </div>
          <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--ink-dim)' }}>{Math.round(progress)}%</span>
          {objectives.length > 0 && (
            alwaysShowObjectives ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: 'var(--accent)' }}>
                <Target className="w-3.5 h-3.5" /> Objectives
              </span>
            ) : (
              <button
                onClick={() => setShowObjectives((v) => !v)}
                aria-expanded={showObjectives}
                className="inline-flex items-center gap-1 text-xs font-medium shrink-0 transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <Target className="w-3.5 h-3.5" /> Objectives
                {showObjectives ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )
          )}
        </div>
        {(alwaysShowObjectives || showObjectives) && objectives.length > 0 && (
          <ul className="pb-3 pt-1 space-y-1.5">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-dim)' }}>
                <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--good)' }} />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chapter rail (desktop, Deep Dive only) — clickable chapter dots that
          jump to each concept and light up as you pass through them. Quick
          Lesson is too short to warrant navigation, so it gets no rail. */}
      {isDeepDive && totalChapters > 1 && (
        <nav className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-20 flex-col gap-3.5" aria-label="Chapters">
          {chapters.map((c, ci) => {
            const active = activeSecId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => scrollToSec(c.id)}
                title={`${ci + 1}. ${c.title}`}
                aria-current={active ? 'true' : undefined}
                className="group flex items-center gap-2.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full transition-all duration-200"
                  style={{ background: active ? 'var(--accent)' : 'var(--line)', transform: active ? 'scale(1.35)' : 'scale(1)' }}
                />
                <span
                  className="text-xs font-medium max-w-[140px] truncate transition-opacity duration-200"
                  style={{ color: 'var(--ink-dim)', opacity: active ? 0.9 : 0 }}
                >
                  {c.title}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <div className={`relative z-10 mx-auto px-2 sm:px-6 ${isDeepDive ? 'max-w-[860px]' : 'max-w-[680px]'}`}>
        {isDeepDive ? (
          <>
            {/* Deep Dive HERO — tall, cinematic, with a "scroll to begin" cue. */}
            <section className="min-h-[64vh] flex flex-col justify-center items-center text-center">
              <div ref={heroRef} className="flex flex-col items-center">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[.18em] mb-5" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--accent)' }}>
                  {meta.label} · {meta.mins}
                </span>
                <h1 className="font-display font-extrabold tracking-tight max-w-3xl" style={{ fontSize: 'clamp(34px,5.5vw,64px)', lineHeight: 1.04, letterSpacing: '-.03em', color: 'var(--ink)' }}>
                  {topic}
                </h1>
                {objectives.length > 0 && (
                  <ul className="mt-6 max-w-md mx-auto space-y-1.5 text-left">
                    {objectives.map((o) => (
                      <li key={o.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-dim)' }}>
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--good)' }} />
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="absolute bottom-10 flex flex-col items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] animate-bounce" style={{ color: 'var(--ink-dim)' }}>
                Scroll to begin
                <ChevronDown className="w-5 h-5" />
              </div>
            </section>

            {/* Table of contents — sets the expectation that this is a longer,
                multi-chapter read, and lets the learner jump around. */}
            {totalChapters > 1 && (
              <section className="reveal pb-2">
                <div className="cine-glass rounded-2xl p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--accent2)' }}>
                    <List className="w-4 h-4" /> In this Deep Dive · {totalChapters} chapters
                  </p>
                  <ol className="space-y-2.5">
                    {chapters.map((c, ci) => (
                      <li key={c.id}>
                        <button onClick={() => scrollToSec(c.id)} className="group w-full flex items-center gap-3 text-left">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--accent)' }}>{ci + 1}</span>
                          <span className="text-[15px] group-hover:opacity-70 transition-opacity" style={{ color: 'var(--ink)' }}>{c.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </>
        ) : (
          /* Quick Lesson HEADER — compact, no theatrics: eyebrow + title, then
             straight into the (single) concept. Objectives already sit in the
             sticky sub-bar for this format, so we don't repeat them here. */
          <section className="pt-6 pb-1 text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[.18em] mb-3" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--accent)' }}>
              {meta.label} · {meta.mins}
            </span>
            <h1 className="font-display font-extrabold tracking-tight mx-auto max-w-xl" style={{ fontSize: 'clamp(24px,4vw,38px)', lineHeight: 1.1, letterSpacing: '-.02em', color: 'var(--ink)' }}>
              {topic}
            </h1>
          </section>
        )}

        {/* SECTIONS — every step, laid out as a scroll-document */}
        {steps.map((step, i) => {
          if (step.kind === 'teach' || step.kind === 'qa') {
            const t = teach[step.id];
            return (
              <section key={step.id} id={`sec-${step.id}`} data-sec={step.id} className={`reveal scroll-mt-28 ${secPad}`}>
                {isDeepDive && step.kind === 'teach' ? (
                  // Numbered chapter divider — reads like a book/course.
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[12px] font-bold uppercase tracking-[.22em] whitespace-nowrap" style={{ color: 'var(--accent2)' }}>
                      Chapter {conceptNumber[step.id]} of {totalChapters}
                    </span>
                    <span className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                  </div>
                ) : (
                  <div className="text-[13px] font-bold uppercase tracking-[.18em] mb-3" style={{ color: 'var(--accent2)' }}>
                    {step.kind === 'qa' ? 'Your question' : `Concept ${conceptNumber[step.id] || i + 1}`}
                  </div>
                )}
                <h2 className="font-display font-bold tracking-tight mb-6" style={{ fontSize: headFs, lineHeight: 1.06, letterSpacing: '-.03em' }}>
                  {step.title}
                </h2>
                {!t && !teachErr[step.id] && <div className="py-6"><BookLoader message="Preparing…" size="sm" /></div>}
                {teachErr[step.id] && (
                  <p className="text-sm italic" style={{ color: 'var(--ink-dim)' }}>This section didn’t load — scroll on, or exit and retry.</p>
                )}
                {t && (
                  <div className="cine-prose text-[17px] leading-relaxed">
                    <FormattedContent text={t.message || ''} tool={lessonTool} />
                    {t.blocks?.length > 0 && (
                      <div className="mt-6"><LessonInteractive blocks={t.blocks} /></div>
                    )}
                    {t.keyPoints?.length > 0 && (
                      <div className="mt-6 cine-glass rounded-2xl p-5">
                        <p className="flex items-center gap-1.5 text-sm font-bold mb-2" style={{ color: 'var(--accent2)' }}>
                          <Lightbulb className="w-4 h-4" /> Key points
                        </p>
                        <ul className="space-y-1.5">
                          {t.keyPoints.map((k, ki) => (
                            <li key={ki} className="flex items-start gap-2 text-[15px]" style={{ color: 'var(--ink)' }}>
                              <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--good)' }} /> <span>{k}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          }
          if (step.kind === 'activity') {
            return (
              <section key={step.id} className={`reveal scroll-mt-28 ${secPad}`}>
                <div className="text-[13px] font-bold uppercase tracking-[.18em] mb-3" style={{ color: 'var(--accent)' }}>Your move</div>
                <h2 className="font-display font-bold tracking-tight mb-6" style={{ fontSize: headFs, lineHeight: 1.06, letterSpacing: '-.03em' }}>
                  {step.title}
                </h2>
                <LessonActivity
                  activityType={step.activityType}
                  activity={step.activity}
                  objective={objectives.find((o) => o.id === step.objectiveId)?.text}
                  resolved={step.id in resolved}
                  passed={resolved[step.id] === true}
                  onResolve={(p) => resolveActivity(step.id, p)}
                  toolLabel={(lessonTool || primaryTool)?.label}
                  onAskCoach={() => {}}
                />
              </section>
            );
          }
          // recap / other: render its prose if present, else skip.
          if (step.recap || step.body || step.title) {
            return (
              <section key={step.id} className="reveal py-12">
                <h2 className="font-display font-bold tracking-tight mb-4" style={{ fontSize: 'clamp(24px,3vw,38px)' }}>{step.title || 'Recap'}</h2>
                {(step.recap || step.body) && <div className="cine-prose text-[17px] leading-relaxed"><FormattedContent text={step.recap || step.body} /></div>}
              </section>
            );
          }
          return null;
        })}

        {/* COMPLETION */}
        <section className="reveal py-16 text-center">
          {!completed ? (
            <>
              {!allActivitiesDone && activitySteps.length > 0 && (
                <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>Finish the activities above to lock in full XP — or complete now.</p>
              )}
              <button onClick={finish} className="cine-pill cine-lift inline-flex items-center gap-2 h-13 px-8 font-bold text-lg" style={{ height: 56 }}>
                Complete lesson <Check className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 grid place-items-center mb-2">
                <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, var(--gold), transparent 65%)', opacity: 0.6 }} />
                <div className="relative w-[74px] h-[74px] rounded-[22px] grid place-items-center" style={{ background: 'linear-gradient(135deg,var(--gold),var(--accent2))', boxShadow: '0 0 36px var(--gold)' }}>
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
              </div>
              <div className="text-[13px] font-bold uppercase tracking-[.2em] mb-2" style={{ color: 'var(--accent)' }}>Lesson complete</div>
              <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: 'clamp(34px,5vw,56px)', lineHeight: 0.98 }}>Nice work.</h2>
              {award && (award.xpAwarded ?? award.amount) ? (
                <div className="inline-flex items-center gap-2 font-display font-bold text-2xl mt-4" style={{ color: 'var(--good)' }}>
                  +{award.xpAwarded ?? award.amount} XP
                </div>
              ) : (
                <p className="text-base mt-3" style={{ color: 'var(--ink-dim)' }}>Progress saved.</p>
              )}
              <div className="flex gap-3 justify-center mt-8">
                <button onClick={onExit} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">
                  Back to lessons <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => { setCompleted(false); setResolved({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
              </div>
              <div className="w-full max-w-md mt-8 text-left">
                <CompletionFeedback
                  kind="lesson"
                  topic={topic}
                  format={format}
                  objectives={objectives}
                  onFocusedLesson={onFocusedLesson}
                />
              </div>
            </div>
          )}
        </section>

        <div className="h-24" />
      </div>
    </div>
  );
}
