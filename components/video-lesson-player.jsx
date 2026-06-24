'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, SkipBack, SkipForward, RotateCcw,
  Loader2, Volume2, CheckCircle, Gauge, Sparkles, MessageSquare, Send,
} from 'lucide-react';
import { useTts } from '@/lib/use-tts';
import BookLoader from '@/components/book-loader';
import LessonQuiz from '@/components/lesson-quiz';
import { FormattedContent } from '@/components/lesson-slide';

// Playback speeds the learner can cycle through. Kept tight and useful — slow
// for dense topics, fast for review.
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

/**
 * VideoLessonPlayer — the "prefer to watch" alternative to a chat-driven lesson.
 * Fetches a linear narrated script for a topic, then plays it as an auto-advancing
 * narrated slideshow: each scene is read aloud (OpenAI TTS) and advances when the
 * narration finishes.
 *
 * Playback never auto-starts — the learner presses play to begin (clicking is the
 * user gesture browsers require for audio anyway). When the narration ends, the
 * lesson awards XP exactly like the read version: quick tips pay full on
 * completion; longer formats run a short checkpoint quiz that scales the XP.
 */
export default function VideoLessonPlayer({ topic, format = 'standard', tools, questId, onComplete, onClose }) {
  const [script, setScript] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(1);
  // All scene audio is generated up front so playback never pauses to load
  // between scenes. The start screen waits until this is done.
  const [prepared, setPrepared] = useState(false);
  const [prepProgress, setPrepProgress] = useState({ done: 0, total: 0 });
  // Whether the current scene's narration has finished. We DON'T auto-advance —
  // the learner reads/acts, then taps the next arrow when ready.
  const [narrationDone, setNarrationDone] = useState(false);

  // Completion / XP flow. After narration ends: quick tips award immediately;
  // other formats fetch a short quiz, and XP is awarded when it's finished.
  // 'narrating' → 'quiz-loading' → 'quiz' → 'done'
  const [phase, setPhase] = useState('narrating');
  const [quizQuestions, setQuizQuestions] = useState(null);
  const awardedRef = useRef(false);

  // In-player coach: a learner watching can still ask for help (about the lesson,
  // using their AI tool, or being stuck) without leaving. Opening it pauses the
  // narration so the answer doesn't get talked over.
  const [coachOpen, setCoachOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaThread, setQaThread] = useState([]);

  const { isSpeaking, isLoading: ttsLoading, speak, stop, setRate, prime } = useTts();

  // Tracks whether the CURRENT scene has actually started speaking, so we only
  // auto-advance on a real narration-end (not before audio has begun).
  const startedSpeakingRef = useRef(false);
  const playingRef = useRef(isPlaying);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  const scenes = script?.scenes || [];
  const scene = scenes[sceneIdx];
  const total = scenes.length;

  // --- Load the script once ---
  useEffect(() => {
    let cancelled = false;
    setScript(null);
    setLoadError(null);
    fetch('/api/lesson/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, format, tools, questId }),
    })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error || 'Failed')))))
      .then((data) => {
        if (cancelled) return;
        if (!data.scenes || !data.scenes.length) throw new Error('No scenes returned');
        setScript(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Failed to generate the narrated lesson.');
      });
    return () => { cancelled = true; };
  }, [topic, format]);

  // --- Pre-generate ALL scene audio before the lesson can start ---
  useEffect(() => {
    if (!script) return;
    let cancelled = false;
    setPrepared(false);
    setPrepProgress({ done: 0, total: script.scenes.length });
    prime(
      script.scenes.map((s) => s.narration),
      (done, total) => { if (!cancelled) setPrepProgress({ done, total }); }
    ).finally(() => { if (!cancelled) setPrepared(true); });
    return () => { cancelled = true; };
  }, [script, prime]);

  // --- Keep the TTS speed in sync with the chosen playback rate ---
  useEffect(() => { setRate(speed); }, [speed, setRate]);

  // --- Narrate the current scene whenever it changes (while playing) ---
  useEffect(() => {
    if (!scene || finished || !hasStarted) return;
    startedSpeakingRef.current = false;
    setNarrationDone(false);
    if (playingRef.current) {
      speak(scene.narration);
    }
    // Stop any audio when leaving this scene.
    return () => stop();
    // hasStarted is intentionally omitted: scene 0 is spoken from the play
    // click (a real user gesture, so the browser allows audio); the effect only
    // narrates subsequent scenes as sceneIdx advances.
  }, [sceneIdx, script, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Track that narration has begun for this scene ---
  useEffect(() => {
    if (isSpeaking) startedSpeakingRef.current = true;
  }, [isSpeaking]);

  // --- Narration finished for this scene: stop and WAIT for the learner ---
  // We deliberately do NOT auto-advance — so a "try this in your AI tool" step
  // stays on screen until they tap the next arrow.
  useEffect(() => {
    if (!isPlaying || ttsLoading || isSpeaking) return;
    if (!startedSpeakingRef.current) return; // hasn't spoken yet this scene
    setIsPlaying(false);
    setNarrationDone(true);
  }, [isSpeaking, ttsLoading, isPlaying]);

  // --- Completion: award XP the same way the read version does ---
  const award = useCallback((correctness, quizCorrect) => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    onComplete?.({ correctness, quizCorrect });
  }, [onComplete]);

  useEffect(() => {
    if (!finished || phase !== 'narrating') return;
    // Quick tips are completion-only — full XP, no quiz (matches read mode).
    if (format === 'quick_tip') {
      award(1, 0);
      setPhase('done');
      return;
    }
    // Longer formats: short checkpoint quiz grounded in the narration, so XP
    // scales by correctness exactly like the read lesson. If the quiz can't be
    // built, never block completion — award full credit.
    let cancelled = false;
    setPhase('quiz-loading');
    const messages = scenes.map((s) => ({
      role: 'assistant',
      content: JSON.stringify({ slideTitle: s.title, message: s.narration, keyPoints: s.keyPoints }),
    }));
    fetch('/api/lesson/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, format, messages }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setPhase('quiz');
        } else {
          award(1, 0);
          setPhase('done');
        }
      })
      .catch(() => {
        if (cancelled) return;
        award(1, 0);
        setPhase('done');
      });
    return () => { cancelled = true; };
  }, [finished, phase, format, topic, scenes, award]);

  const handleQuizFinish = useCallback((correctness, stats) => {
    award(correctness, stats?.correctCount || 0);
    setPhase('done');
  }, [award]);

  // --- Controls ---
  const handleStart = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(true);
    setNarrationDone(false);
    startedSpeakingRef.current = false;
    if (scene) speak(scene.narration);
  }, [scene, speak]);

  const togglePlay = useCallback(() => {
    if (finished) return;
    setIsPlaying((p) => {
      const next = !p;
      if (!next) {
        stop();
      } else {
        setNarrationDone(false);
        startedSpeakingRef.current = false;
        if (scene) speak(scene.narration);
      }
      return next;
    });
  }, [finished, scene, speak, stop]);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s);
      return SPEEDS[(idx + 1) % SPEEDS.length];
    });
  }, []);

  const goPrev = useCallback(() => {
    stop();
    setFinished(false);
    setSceneIdx((i) => Math.max(0, i - 1));
    setIsPlaying(true);
  }, [stop]);

  const goNext = useCallback(() => {
    stop();
    if (sceneIdx < total - 1) {
      setSceneIdx((i) => i + 1);
      setIsPlaying(true);
    } else {
      setFinished(true);
      setIsPlaying(false);
    }
  }, [stop, sceneIdx, total]);

  const replay = useCallback(() => {
    stop();
    setFinished(false);
    setPhase('narrating');
    setSceneIdx(0);
    setIsPlaying(true);
    startedSpeakingRef.current = false;
  }, [stop]);

  const handleClose = useCallback(() => {
    stop();
    onClose?.();
  }, [stop, onClose]);

  // Open the coach — pause the narration so it doesn't talk over the answer.
  const openCoach = useCallback(() => {
    setCoachOpen(true);
    setIsPlaying(false);
    stop();
  }, [stop]);

  // Ask the in-lesson coach. Grounded in the narrated script so answers tie back
  // to what the learner is watching. Reuses the read-lesson answer endpoint.
  const askQuestion = useCallback(async () => {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion('');
    setAsking(true);
    const id = `vq_${sceneIdx}_${qaThread.length}`;
    setQaThread((prev) => [...prev, { id, q, a: '', loading: true }]);
    try {
      const priorContent = (script?.scenes || []).slice(0, sceneIdx + 1).map((s) => ({
        title: s.title || '',
        message: [s.narration, (s.keyPoints || []).join('; ')].filter(Boolean).join('\n'),
      }));
      const recentQa = qaThread.filter((x) => x.a && !x.error).slice(-3).map((x) => ({ q: x.q, a: x.a }));
      const res = await fetch('/api/lesson/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, mode: 'answer', question: q,
          priorContent, currentStep: scene?.title || script?.title || '', recentQa, tools,
        }),
      });
      if (!res.ok) throw new Error('failed');
      const d = await res.json();
      const a = d.message || 'Here you go.';
      setQaThread((prev) => prev.map((x) => (x.id === id ? { ...x, a, loading: false } : x)));
    } catch {
      setQaThread((prev) => prev.map((x) => (
        x.id === id ? { ...x, a: 'Sorry — I couldn’t answer that just now. Please try again.', loading: false, error: true } : x
      )));
    } finally {
      setAsking(false);
    }
  }, [question, asking, sceneIdx, qaThread, script, scene, topic, tools]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const showDone = finished && (phase === 'done' || phase === 'quiz-loading');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute -top-2 right-0 -translate-y-full sm:translate-y-0 sm:-top-12 text-slate-300 hover:text-white flex items-center gap-1.5 text-sm font-medium"
          aria-label="Close narrated lesson"
        >
          <X className="w-5 h-5" /> Close
        </button>

        {/* Loading */}
        {!script && !loadError && (
          <div className="bg-slate-900 rounded-2xl p-12 border border-slate-800">
            <BookLoader message={`Preparing your narrated lesson on ${topic}...`} size="lg" />
            <p className="text-center text-slate-500 text-xs mt-4">Writing the script and preparing the narration.</p>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="bg-slate-900 rounded-2xl p-10 border border-slate-800 text-center">
            <p className="text-red-400 font-medium mb-4">{loadError}</p>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* Generating audio — all scenes are primed before the lesson starts */}
        {script && !prepared && !hasStarted && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="aspect-video flex flex-col items-center justify-center text-center px-8 py-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300 bg-brand-900/40 px-2.5 py-1 rounded-full mb-5">
                <Volume2 className="w-3.5 h-3.5" /> Narrated lesson
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">{script.title}</h2>
              <Loader2 className="w-6 h-6 animate-spin text-brand-300 mb-3" />
              <p className="text-slate-300 text-sm">Generating the narration…</p>
              <p className="text-slate-500 text-xs mt-1">
                Preparing all {prepProgress.total || total} scenes up front so playback never stops to load
                {prepProgress.total ? ` · ${prepProgress.done}/${prepProgress.total}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Start screen — playback waits for the learner to press play */}
        {script && prepared && !hasStarted && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="aspect-video flex flex-col items-center justify-center text-center px-8 py-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300 bg-brand-900/40 px-2.5 py-1 rounded-full mb-5">
                <Volume2 className="w-3.5 h-3.5" /> Narrated lesson · audio ready
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">{script.title}</h2>
              <p className="text-slate-400 mb-8 text-sm">
                {total} {total === 1 ? 'scene' : 'scenes'} · read aloud · you advance each scene yourself
              </p>
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-brand text-white font-semibold text-lg hover:bg-brand-600 transition-all shadow-lg"
              >
                <Play className="w-6 h-6 ml-0.5" /> Press play to start
              </button>
            </div>
          </div>
        )}

        {/* Checkpoint quiz (longer formats only) */}
        {script && hasStarted && phase === 'quiz' && quizQuestions && (
          <LessonQuiz questions={quizQuestions} onFinish={handleQuizFinish} finishing={false} />
        )}

        {/* Player + done state */}
        {script && hasStarted && phase !== 'quiz' && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            {/* Scene "stage" */}
            <div className="relative aspect-video flex flex-col justify-center px-8 sm:px-14 py-8">
              {/* Title chip */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300 bg-brand-900/40 px-2.5 py-1 rounded-full">
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  {showDone ? 'Complete' : `Scene ${sceneIdx + 1} of ${total}`}
                </span>
              </div>

              {showDone ? (
                <div className="text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-1">Lesson complete!</h2>
                  <p className="text-slate-400 mb-2">{script.title}</p>
                  {phase === 'quiz-loading' ? (
                    <p className="inline-flex items-center gap-2 text-slate-400 text-sm mb-5">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving your progress…
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1.5 text-brand-300 text-sm font-medium mb-6">
                      <Sparkles className="w-4 h-4" /> XP added to your profile
                    </p>
                  )}
                  {/* Clear next steps */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleClose}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand-600 transition-all shadow-lg"
                    >
                      Learn something else →
                    </button>
                    <button
                      onClick={replay}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Replay
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {scene.title && (
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5 leading-tight">{scene.title}</h2>
                  )}
                  {scene.keyPoints && scene.keyPoints.length > 0 && (
                    <ul className="space-y-2.5">
                      {scene.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-slate-200 text-lg">
                          <CheckCircle className="w-5 h-5 text-brand-400 mt-1 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Caption (the spoken narration) */}
            {!showDone && scene && (
              <div className="px-8 sm:px-14 pb-2">
                <p className="text-slate-300 text-sm leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 min-h-[3.5rem]">
                  {scene.narration}
                </p>
              </div>
            )}

            {/* Progress dots */}
            {!showDone && (
              <div className="px-8 sm:px-14 pt-3 flex gap-1.5">
                {scenes.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i < sceneIdx || finished ? 'bg-brand' : i === sceneIdx ? 'bg-brand-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Controls */}
            {!showDone && (
              <div className="px-8 sm:px-14 py-4 flex items-center justify-center gap-4">
                <button
                  onClick={goPrev}
                  disabled={sceneIdx === 0}
                  className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous scene"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-600 transition-all shadow-lg"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {ttsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={goNext}
                  className={`p-2.5 rounded-full transition-all ${
                    narrationDone
                      ? 'bg-brand text-white hover:bg-brand-600 shadow-lg ring-2 ring-brand-300/60 animate-pulse'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  aria-label={sceneIdx < total - 1 ? 'Next scene' : 'Finish lesson'}
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                {/* Speed control */}
                <button
                  onClick={cycleSpeed}
                  className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-semibold transition-all"
                  aria-label={`Playback speed ${speed}x. Tap to change.`}
                  title="Playback speed"
                >
                  <Gauge className="w-4 h-4" /> {speed}×
                </button>
              </div>
            )}

            {/* Manual-advance hint: stays put until the learner is ready */}
            {!showDone && (
              <p className="px-8 sm:px-14 pb-4 -mt-1 text-center text-xs text-slate-400">
                {narrationDone
                  ? (sceneIdx < total - 1
                      ? 'Take your time — tap the → arrow when you\'re ready for the next scene.'
                      : 'That\'s the last scene — tap the → arrow to wrap up.')
                  : 'Scenes don\'t auto-advance — you control when to move on.'}
              </p>
            )}
          </div>
        )}

        {/* In-lesson coach — available while watching so a learner can ask for
            help (lesson, AI-tool navigation, or being stuck) without leaving. */}
        {script && hasStarted && phase !== 'quiz' && (
          <div className="mt-3">
            {!coachOpen ? (
              <button
                onClick={openCoach}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Need a hand? Ask a question
              </button>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-1">Ask about the lesson, how to use your AI tool, or anything you&apos;re stuck on — narration is paused while we chat.</p>
                  <button onClick={() => setCoachOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0" aria-label="Close help">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                    placeholder="Ask a question or tell me what you're stuck on…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand"
                    autoFocus
                  />
                  <button onClick={askQuestion} disabled={asking || !question.trim()}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all">
                    {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                {qaThread.length > 0 && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3 max-h-72 overflow-y-auto">
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
