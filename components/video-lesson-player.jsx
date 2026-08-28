'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, SkipBack, SkipForward, RotateCcw,
  Loader2, Volume2, CheckCircle, Gauge, Sparkles, MessageSquare, Send,
} from 'lucide-react';
import { useTts } from '@/lib/use-tts';
import { useSidebar } from '@/components/sidebar';
import BookLoader from '@/components/book-loader';
import GenTips from '@/components/gen-tips';
import { personalLine, statusLine } from '@/lib/loading-tips';
import { useProfile } from '@/components/profile-provider';
import LessonQuiz from '@/components/lesson-quiz';
import { FormattedContent } from '@/components/lesson-slide';

// Playback speeds the learner can cycle through. Kept tight and useful — slow
// for dense topics, fast for review.
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

// Split a spoken-narration string into one line per sentence so step-by-step
// instructions (e.g. "do X in Claude") render readably instead of as one dense
// block. Display-only — TTS still speaks the original string.
function splitIntoLines(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Loading estimate per format. Narrated genuinely takes longer than a read
// lesson because BOTH the script AND every scene's narration audio are made up
// front (audio is primed one scene at a time in lib/use-tts.js), so the estimate
// reflects that full end-to-end wait, not just the script. Scene counts scale by
// format (quick_tip 2 -> deep_dive 7-9 -> quest one-per-step), which is why the
// heavier formats are minutes, not seconds. `tau` shapes the script-phase
// progress bar so it approaches full as the script lands (the audio phase then
// shows its own real per-scene bar).
// Just past /api/lesson/quiz's own maxDuration (120s). The client abort must
// outlast the server or it kills a request that was still going to answer.
const QUIZ_TIMEOUT_MS = 125000;
// How long the wrap-up waits before offering a way out. Short, because the
// learner has already finished the lesson at this point — the check is a bonus.
const WRAP_SKIP_AFTER = 12;

const NARRATED_LOAD = {
  quick_tip:     { estimate: '20-40 seconds', tau: 10 },
  standard:      { estimate: '45-90 seconds', tau: 22 },
  deep_dive:     { estimate: '1.5-3 minutes', tau: 40 },
  project_quest: { estimate: '3-5 minutes',   tau: 70 },
};

// "M:SS" for the scrubber time labels.
function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Rough spoken-duration estimate from the total narration word count
// (~150 words/min). Shown so the learner knows the time commitment before
// starting. Returns e.g. "~30 sec" or "~3 min", or null if no narration.
function estimateNarrationTime(script) {
  if (!script?.scenes?.length) return null;
  const words = script.scenes.reduce(
    (n, s) => n + (s.narration ? s.narration.trim().split(/\s+/).filter(Boolean).length : 0),
    0,
  );
  if (!words) return null;
  const sec = Math.round(words / 2.5); // ~150 words per minute spoken
  if (sec < 75) return `~${Math.max(10, Math.round(sec / 10) * 10)} sec`;
  return `~${Math.round(sec / 60)} min`;
}

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
export default function VideoLessonPlayer({ topic, format = 'standard', tools, questId, initialScript = null, initialScene = 0, initialTime = 0, onProgress, onComplete, onClose }) {
  // Only read for the loading screen's tips — the script itself is personalized
  // server-side from the profile the API loads, not from this one.
  const { profile } = useProfile() || {};
  const [script, setScript] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sceneIdx, setSceneIdx] = useState(initialScene || 0);
  // On resume, seek the resumed scene to this saved time the first time it plays.
  const pendingSeekRef = useRef(initialTime > 0 ? initialTime : null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(1);
  // All scene audio is generated up front so playback never pauses to load
  // between scenes. The start screen waits until this is done.
  const [prepared, setPrepared] = useState(false);
  const [prepProgress, setPrepProgress] = useState({ done: 0, total: 0 });
  const [wrapElapsed, setWrapElapsed] = useState(0);
  // Guards the one-shot wrap-up run and holds its request for unmount teardown.
  const quizStartedRef = useRef(false);
  const quizAbortRef = useRef(null);
  // Seconds spent loading, for the progress bar on the loading screen (matches
  // the read-lesson loader). Ticks until the lesson is prepped or started.
  const [elapsed, setElapsed] = useState(0);
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

  const { isSpeaking, isPaused, isLoading: ttsLoading, currentTime, duration, speak, pause, resume, seek, stop, setRate, prime } = useTts();
  // Whether the slide-over menu is open — so the loading screen can center in the
  // same content area as the read-lesson loader (which is padded md:pl-80).
  const { open: sidebarOpen } = useSidebar() || {};

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
    // Resuming a paused narrated lesson → reuse the EXACT saved script rather
    // than regenerating a brand-new (and possibly different) one. The scene
    // index is restored from initialScene via useState above.
    if (initialScript?.scenes?.length) {
      setScript(initialScript);
      setLoadError(null);
      // Resume lands directly on the saved scene's slide, PAUSED — not the
      // "press play to start" screen, and NOT auto-narrating. Otherwise pressing
      // play re-reads a scene the learner already heard ("repeats the text at
      // me"). They can press play to re-hear it or skip ahead.
      setHasStarted(true);
      setIsPlaying(false);
      return () => { cancelled = true; };
    }
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

  // --- Persist a resumable entry (script + current scene + time). On a FRESH
  // lesson the first fire saves the script so it can be resumed; on a RESUME we
  // skip that first fire so we don't clobber the saved scene/time with zeros.
  // Later scene changes save the new scene at time 0. ---
  const firstPersistRef = useRef(true);
  useEffect(() => {
    if (!(script?.scenes?.length) || typeof onProgress !== 'function') return;
    if (firstPersistRef.current) {
      firstPersistRef.current = false;
      if (!initialScript) onProgress(script, sceneIdx, 0); // fresh lesson only
      return;
    }
    onProgress(script, sceneIdx, 0); // new scene → position 0
  }, [script, sceneIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Throttled save of the live playback position while playing, so a resume
  // (or even a hard tab-close after the last save) lands near where you were. ---
  const lastTimeSaveRef = useRef(0);
  useEffect(() => {
    if (!isPlaying || !(script?.scenes?.length) || typeof onProgress !== 'function') return;
    if (currentTime < lastTimeSaveRef.current || currentTime - lastTimeSaveRef.current >= 3) {
      lastTimeSaveRef.current = currentTime;
      onProgress(script, sceneIdx, currentTime);
    }
  }, [currentTime, isPlaying, script, sceneIdx, onProgress]);

  // --- On resume, once the resumed scene actually starts playing, seek to the
  // saved time (once). ---
  useEffect(() => {
    if (isSpeaking && pendingSeekRef.current != null) {
      const t = pendingSeekRef.current;
      pendingSeekRef.current = null;
      // small delay so the audio element has its metadata/duration ready
      setTimeout(() => seek(t), 120);
    }
  }, [isSpeaking, seek]);

  // --- Tick the loading-bar counter until the lesson is prepped or started ---
  useEffect(() => {
    if (prepared || hasStarted) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [prepared, hasStarted]);

  // --- Pre-generate scene audio. On a FRESH lesson we prime every scene up
  // front (blocking the start screen) so playback never stops to load. On RESUME
  // (we reused a saved script) we skip that gate — jump straight to the saved
  // scene and warm the audio in the BACKGROUND, so reopening doesn't look like a
  // full regeneration. Playback still works: a not-yet-primed scene falls back
  // to an on-demand fetch. ---
  useEffect(() => {
    if (!script) return;
    let cancelled = false;
    const isResume = !!initialScript?.scenes?.length;
    if (isResume) {
      setPrepared(true); // start screen shows immediately at the saved scene
    } else {
      setPrepared(false);
      setPrepProgress({ done: 0, total: script.scenes.length });
    }
    prime(
      script.scenes.map((s) => s.narration),
      (done, total) => { if (!cancelled && !isResume) setPrepProgress({ done, total }); }
    ).finally(() => { if (!cancelled) setPrepared(true); });
    return () => { cancelled = true; };
  }, [script, prime, initialScript]);

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
    // Heard this scene in full → save the NEXT scene as the resume point, so
    // reopening never replays a scene you already finished. (A mid-scene pause
    // leaves the current scene saved via the onProgress effect, so you don't
    // skip a scene you only partly heard.)
    if (script?.scenes?.length && typeof onProgress === 'function') {
      onProgress(script, Math.min(sceneIdx + 1, script.scenes.length - 1), 0);
    }
  }, [isSpeaking, ttsLoading, isPlaying, sceneIdx, script, onProgress]);

  // --- Completion: award XP the same way the read version does ---
  const award = useCallback((correctness, quizCorrect) => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    onComplete?.({ correctness, quizCorrect });
  }, [onComplete]);

  // THE bug behind feedback #167, and it fired on every narrated lesson longer
  // than a quick tip — not just Project Quest.
  //
  // This effect kicked off the wrap-up quiz and returned `() => { cancelled = true }`
  // as its cleanup, with `phase` in its own dependency array. Its first act is
  // setPhase('quiz-loading'), which changes `phase`, which re-runs the effect,
  // which runs the previous cleanup — flipping `cancelled` to true on the very
  // run that owns the in-flight request. The response then always landed in
  // `if (cancelled) return;` and `phase` stayed 'quiz-loading' forever. The
  // learner sat on "Wrapping up" at the end of a lesson they'd already finished.
  //
  // So the run is guarded by a ref instead of by the phase transition, and the
  // request is torn down when the PLAYER goes away rather than when the phase
  // moves. Nothing here may cancel on a re-render.
  useEffect(() => {
    if (!finished || phase !== 'narrating') return;
    if (quizStartedRef.current) return;
    quizStartedRef.current = true;
    // Quick tips are completion-only — full XP, no quiz (matches read mode).
    if (format === 'quick_tip') {
      award(1, 0);
      setPhase('done');
      return;
    }
    // Longer formats: short checkpoint quiz grounded in the narration, so XP
    // scales by correctness exactly like the read lesson. If the quiz can't be
    // built, never block completion — award full credit.
    setPhase('quiz-loading');
    setWrapElapsed(0);
    const messages = scenes.map((s) => ({
      role: 'assistant',
      content: JSON.stringify({ slideTitle: s.title, message: s.narration, keyPoints: s.keyPoints }),
    }));
    // The fetch also had no timeout, so even with the cancel bug fixed a request
    // that never settled would hang the same screen. The abort sits just past the
    // route's own maxDuration of 120s — long enough that a still-working request
    // is never killed early — and the catch treats any failure as full credit.
    const controller = new AbortController();
    quizAbortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), QUIZ_TIMEOUT_MS);
    fetch('/api/lesson/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, format, messages }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timer);
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setPhase('quiz');
        } else {
          award(1, 0);
          setPhase('done');
        }
      })
      .catch(() => {
        clearTimeout(timer);
        award(1, 0);
        setPhase('done');
      });
  }, [finished, phase, format, topic, scenes, award]);

  // Unmount only — never on a phase change. See the note above.
  useEffect(() => () => quizAbortRef.current?.abort(), []);

  // Finish now, skipping the check. Same outcome the timeout and error paths
  // give — full credit — surfaced as a button so nobody has to wait out the
  // abort just to leave a lesson they've already completed.
  const skipWrapUp = useCallback(() => {
    award(1, 0);
    setPhase('done');
  }, [award]);

  // Counts the wrap-up wait so the screen shows progress rather than an
  // indefinite spinner.
  useEffect(() => {
    if (phase !== 'quiz-loading') return;
    const id = setInterval(() => setWrapElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

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
      if (p) {
        // Playing → PAUSE in place (keep the audio position) instead of tearing
        // it down, so pressing play again resumes rather than restarting.
        pause();
        // Capture the exact position so resume lands here.
        if (script?.scenes?.length && typeof onProgress === 'function') {
          onProgress(script, sceneIdx, currentTime);
        }
        return false;
      }
      // Not playing → resume where we paused, or start the scene from the top
      // if it hasn't begun / already finished.
      if (isPaused) {
        resume();
      } else {
        setNarrationDone(false);
        startedSpeakingRef.current = false;
        if (scene) speak(scene.narration);
      }
      return true;
    });
  }, [finished, scene, speak, pause, resume, isPaused, script, sceneIdx, currentTime, onProgress]);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s);
      return SPEEDS[(idx + 1) % SPEEDS.length];
    });
  }, []);

  const goPrev = useCallback(() => {
    stop();
    pendingSeekRef.current = null; // a manual scene change cancels the resume-seek
    setFinished(false);
    setSceneIdx((i) => Math.max(0, i - 1));
    setIsPlaying(true);
  }, [stop]);

  const goNext = useCallback(() => {
    stop();
    pendingSeekRef.current = null; // a manual scene change cancels the resume-seek
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
    // Re-arm the wrap-up, or a replay would run to the end and stop at the last
    // scene without ever building its check.
    quizStartedRef.current = false;
  }, [stop]);

  const handleClose = useCallback(() => {
    // Capture the exact position before tearing down, so resume lands here.
    if (script?.scenes?.length && typeof onProgress === 'function') {
      onProgress(script, sceneIdx, currentTime);
    }
    stop();
    onClose?.();
  }, [stop, onClose, script, sceneIdx, currentTime, onProgress]);

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

  const showDone = finished && phase === 'done';
  // Between the last scene and the checkpoint quiz we build the quiz — show an
  // honest "building your check" state, not a premature "complete" screen.
  const quizLoading = finished && phase === 'quiz-loading';
  // Loading-bar values, matching the read-lesson loader's look.
  const load = NARRATED_LOAD[format] || NARRATED_LOAD.standard;
  const loadPct = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / load.tau))));
  const prepPct = prepProgress.total ? Math.round((prepProgress.done / prepProgress.total) * 100) : loadPct;
  // While the lesson is still generating we use the same light background as the
  // read-lesson loader; only the ready-to-play start screen + playback get the
  // dark "cinematic" scrim.
  const cinematic = (script && prepared) || hasStarted;

  return (
    <div className={`fixed flex items-center justify-center p-4 overflow-y-auto ${cinematic
        ? 'inset-0 z-50 bg-slate-950/90 backdrop-blur-sm'
        // While loading, sit BELOW the sticky top nav (h-16) and under its z so
        // the header/hamburger stay visible and usable — like the read loader —
        // and match the read loader's md:pl-80 offset when the menu is open so
        // the card centers in the content area, not the full viewport.
        : `inset-x-0 top-16 bottom-0 z-30 bg-bg-warm dark:bg-slate-900 ${sidebarOpen ? 'md:pl-80' : ''}`}`}>
      <div className="relative w-full max-w-3xl my-auto">
        {/* Close — hidden while loading (matches the read loader, which has no
            cancel mid-generation); shown once the lesson is ready to play. */}
        {cinematic && (
          <button
            onClick={handleClose}
            className="absolute -top-2 right-0 -translate-y-full sm:translate-y-0 sm:-top-12 text-slate-300 hover:text-white flex items-center gap-1.5 text-sm font-medium"
            aria-label="Close narrated lesson"
          >
            <X className="w-5 h-5" /> Close
          </button>
        )}

        {/* Loading the script — same look as the read-lesson loader. */}
        {!script && !loadError && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-12">
            <BookLoader message={personalLine(profile, format)} size="lg" />
            <div className="mt-6 max-w-md mx-auto">
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-1000 ease-out" style={{ width: `${loadPct}%` }} />
              </div>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-slate-400">
                {statusLine(elapsed, format, `${load.estimate} in total`)}
              </p>
              <GenTips profile={profile} className="mt-7" />
            </div>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 shadow-card text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-4">{loadError}</p>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* Generating audio — all scenes are primed before the lesson starts.
            Same loader look as above; the bar now tracks real scene progress. */}
        {script && !prepared && !hasStarted && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-12">
            <BookLoader message={script.title || 'Preparing your narrated lesson…'} size="lg" />
            <div className="mt-6 max-w-md mx-auto">
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-500 ease-out" style={{ width: `${prepPct}%` }} />
              </div>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-slate-400">
                Preparing the narration
                {prepProgress.total ? ` · ${prepProgress.done}/${prepProgress.total} scenes` : ''}
                {' · keep this tab open, leaving pauses it'}
              </p>
              <GenTips profile={profile} className="mt-7" />
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
                {total} {total === 1 ? 'scene' : 'scenes'}
                {estimateNarrationTime(script) ? ` · ${estimateNarrationTime(script)}` : ''}
                {' '}· read aloud · you advance each scene yourself
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
                  {showDone ? 'Complete' : quizLoading ? 'Wrapping up' : `Scene ${sceneIdx + 1} of ${total}`}
                </span>
              </div>

              {quizLoading ? (
                <div className="text-center py-6">
                  <p className="inline-flex items-center gap-2 text-slate-300 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Nice work — building a quick check to lock it in…
                  </p>
                  {/* A counter and a bar, so a slow wrap-up reads as progress
                      instead of a hang (feedback #167). */}
                  <div className="max-w-xs mx-auto mt-4">
                    <div className="h-1.5 rounded-full overflow-hidden bg-slate-700">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(95, Math.round(100 * (1 - Math.exp(-wrapElapsed / 8))))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {fmtTime(wrapElapsed)} · usually takes about 10 seconds
                    </p>
                  </div>
                  {/* Your XP is already safe either way — skipping here awards
                      full credit, exactly like a failed or timed-out build. */}
                  {wrapElapsed >= WRAP_SKIP_AFTER && (
                    <button
                      onClick={skipWrapUp}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-all"
                    >
                      Taking too long? Skip the check and finish
                    </button>
                  )}
                </div>
              ) : showDone ? (
                <div className="text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-1">Lesson complete!</h2>
                  <p className="text-slate-400 mb-2">{script.title}</p>
                  <p className="inline-flex items-center gap-1.5 text-brand-300 text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" /> XP added to your profile
                  </p>
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
                // Keyed on the scene so it re-animates on every scene change.
                <div key={sceneIdx}>
                  {scene.title && (
                    <h2 className="cine-rise text-2xl sm:text-3xl font-bold text-white mb-5 leading-tight">{scene.title}</h2>
                  )}
                  {scene.keyPoints && scene.keyPoints.length > 0 && (
                    <ul className="space-y-2.5">
                      {scene.keyPoints.map((pt, i) => (
                        // Stagger the bullets in one-by-one after the title.
                        <li
                          key={i}
                          className="cine-rise flex items-start gap-2.5 text-slate-200 text-lg"
                          style={{ animationDelay: `${140 + i * 110}ms` }}
                        >
                          <CheckCircle className="w-5 h-5 text-brand-400 mt-1 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Caption (the spoken narration). Split into sentences so any
                step-by-step instructions read as separate lines instead of one
                dense paragraph. This only affects display — TTS still speaks
                the full scene.narration string. */}
            {!showDone && !quizLoading && scene && (
              <div className="px-8 sm:px-14 pb-2">
                <div key={sceneIdx} className="cine-rise text-slate-300 text-sm leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 min-h-[3.5rem] space-y-1.5" style={{ animationDelay: '120ms' }}>
                  {splitIntoLines(scene.narration).map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Progress dots */}
            {!showDone && !quizLoading && (
              <div className="px-8 sm:px-14 pt-3 flex gap-1.5">
                {scenes.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i < sceneIdx || finished ? 'bg-brand' : i === sceneIdx ? 'bg-brand-400 animate-pulse' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Scrubber — YouTube-style time bar for the current scene's audio. */}
            {!showDone && !quizLoading && scene && (
              <div className="px-8 sm:px-14 pt-3 flex items-center gap-3">
                <span className="text-[11px] tabular-nums text-slate-400 w-9 text-right shrink-0">{fmtTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!duration}
                  aria-label="Seek within this scene"
                  className="flex-1 h-1.5 accent-brand cursor-pointer disabled:opacity-40 disabled:cursor-default"
                />
                <span className="text-[11px] tabular-nums text-slate-400 w-9 shrink-0">{fmtTime(duration)}</span>
              </div>
            )}

            {/* Controls */}
            {!showDone && !quizLoading && (
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
            {!showDone && !quizLoading && (
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
