'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { SlideCard, RecapCard } from '@/components/lesson-slide';
import LessonQuiz from '@/components/lesson-quiz';
import PlanLessonPlayer from '@/components/plan-lesson-player';
import { emitXp } from '@/lib/xp-bus';
import { useProgression } from '@/components/progression-provider';
import { onLessonComplete, getLessonHistory } from '@/lib/progression';
import { contentDayKey, REFRESH_LABEL } from '@/lib/content-day';
import { useProfile } from '@/components/profile-provider';
import { saveLessonState, clearSavedLesson } from '@/lib/lesson-store';
import BookLoader from '@/components/book-loader';
import {
  BookOpen, ChevronRight, Zap, BookMarked, Trophy,
  Loader2, Send, Mic, MicOff, MessageSquare, HelpCircle, PlayCircle, Sparkles,
} from 'lucide-react';
import { useStt } from '@/lib/use-stt';
import { useTts } from '@/lib/use-tts';
import { trackLessonComplete } from '@/lib/track';
import { resolveLearnerId } from '@/lib/learner-id';
import VideoLessonPlayer from '@/components/video-lesson-player';
import PausedLessonsBox from '@/components/paused-lessons-box';
import LlmWindowCallout from '@/components/llm-window-callout';
import { useActiveTool } from '@/components/active-tool-provider';
import SurpriseWin from '@/components/surprise-win';

// Prefilled into the chat bar at the lesson's first practice point so the learner
// can hit enter to kick off an interactive, personalized scenario.
const SCENARIO_PROMPT = "I'd like to try a scenario based on my work.";

// Small numbered badge for the picker's step headers.
function StepNum({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold shrink-0">{n}</span>
  );
}

const FORMAT_META = {
  quick_tip: { title: 'Quick Tip', subtitle: 'Pick a topic — 60-second insight' },
  standard: { title: 'Quick Lesson', subtitle: 'Pick a topic — 3-5 minute hands-on lesson' },
  deep_dive: { title: 'Deep Dive', subtitle: 'Pick a topic — 15-20 minute thorough lesson' },
  project_quest: { title: 'Project Quest', subtitle: 'Build something real, guided start to finish' },
};

function getSavedFormat() {
  try {
    const saved = localStorage.getItem('lesson_format');
    return FORMAT_META[saved] ? saved : null;
  } catch {
    return null;
  }
}

// Fallback shown instantly and used if personalized suggestions fail to load.
const SUGGESTED_TOPICS = [
  { emoji: '🎯', label: 'Prompt Basics', topic: 'How to write clear, specific prompts that get useful results' },
  { emoji: '🧵', label: 'AI for Slack', topic: 'Using AI to draft, summarize, and respond to Slack messages and threads faster' },
  { emoji: '📊', label: 'Data Summaries', topic: 'Turning raw data and notes into executive-ready summaries' },
  { emoji: '🤖', label: 'What Are AI Agents?', topic: 'Understanding AI agents and how they can automate multi-step workflows' },
  { emoji: '✅', label: 'Verifying AI Output', topic: 'How to fact-check and validate AI-generated content before using it' },
  { emoji: '💬', label: 'Better Conversations', topic: 'How to have productive back-and-forth conversations with AI assistants' },
];

function LessonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get('topic');
  const initialFormat = (() => {
    const f = searchParams.get('format');
    return ['quick_tip', 'standard', 'deep_dive', 'project_quest'].includes(f) ? f : null;
  })();
  const initialMode = searchParams.get('mode') === 'watch' ? 'watch' : 'read';
  // `prefill` carries a topic (e.g. from an AI News item) into the picker so the
  // learner can pick the depth, rather than auto-starting a lesson.
  const initialPrefill = searchParams.get('prefill') || '';
  // "Surprise me" mode shows an auto-picked Quick Win (relocated from /quick-win).
  const [surpriseMode, setSurpriseMode] = useState(searchParams.get('surprise') === '1');
  const [view, setView] = useState(initialTopic ? 'lesson' : 'picker');
  const [topic, setTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState(initialPrefill);
  const [format, setFormat] = useState(initialFormat || 'standard');
  // Vague-topic clarify step: when a typed topic is too broad, hold the AI's
  // clarifying question + pickable directions here and show a card instead of
  // starting the lesson straight away. `clarifying` is the in-flight check.
  const [clarify, setClarify] = useState(null);
  const [clarifying, setClarifying] = useState(false);
  const [clarifyRefine, setClarifyRefine] = useState('');

  // Learning mode: 'read' = interactive chat-driven lesson; 'watch' = narrated
  // video. In watch mode, selecting a topic opens the VideoLessonPlayer instead.
  const [learnMode, setLearnMode] = useState(initialMode);
  const [videoTopic, setVideoTopic] = useState(null);
  // When the narrated player is showing a Project Quest, this holds the quest id so
  // the script is sourced from the quest's curated steps.
  const [videoQuestId, setVideoQuestId] = useState(null);

  // Lesson state
  const [slides, setSlides] = useState([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userInputs, setUserInputs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userInput, setUserInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const pendingVoiceSubmitRef = useRef(null);
  const practicePrefilledRef = useRef(false);

  // TTS for voice conversation mode
  const { isSpeaking: ttsActive, speak: ttsSpeak, stop: ttsStop } = useTts();

  // Speech-to-text
  const { isListening, isSupported: sttSupported, transcript, start: sttStart, stop: sttStop, toggle: toggleStt } = useStt({
    onResult: (text) => {
      if (voiceModeRef.current) {
        pendingVoiceSubmitRef.current = text.trim();
      } else {
        setUserInput((prev) => (prev ? `${prev} ${text}` : text));
        inputRef.current?.focus();
      }
    },
  });

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    if (isListening && transcript) {
      setUserInput(transcript);
    }
  }, [isListening, transcript]);

  // Voice mode: auto-submit when STT finishes
  useEffect(() => {
    if (!isListening && pendingVoiceSubmitRef.current && voiceModeRef.current) {
      const text = pendingVoiceSubmitRef.current;
      pendingVoiceSubmitRef.current = null;
      setUserInput('');
      continueLesson(text);
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice mode: auto-read new slides, then re-listen
  const prevSlideCountRef = useRef(0);
  useEffect(() => {
    if (!voiceModeRef.current || slides.length === 0) {
      prevSlideCountRef.current = slides.length;
      return;
    }
    if (slides.length > prevSlideCountRef.current) {
      const latest = slides[slides.length - 1];
      if (latest.phase === 'complete') {
        setVoiceMode(false);
        ttsStop();
      } else {
        const text = [latest.message, ...(latest.keyPoints || [])].filter(Boolean).join('. ');
        ttsSpeak(text);
      }
    }
    prevSlideCountRef.current = slides.length;
  }, [slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice mode: after TTS finishes, auto-listen
  useEffect(() => {
    if (voiceModeRef.current && !ttsActive && slides.length > 0 && !isLoading && !isListening) {
      const latest = slides[slides.length - 1];
      if (latest.phase !== 'complete') {
        const timer = setTimeout(() => {
          if (voiceModeRef.current && !isListening) {
            sttStart();
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [ttsActive, slides.length, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleVoiceMode() {
    if (voiceMode) {
      setVoiceMode(false);
      ttsStop();
      sttStop();
    } else {
      setVoiceMode(true);
      if (slides.length > 0 && !isLoading) {
        sttStart();
      }
    }
  }

  const debounceSaveRef = useRef(null);

  // Progression state
  const lessonStartedAt = useRef(null);
  const hasRecordedCompletion = useRef(false);

  // End-of-lesson quiz (gates XP for standard/deep_dive; quick tips skip it).
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Correctness (0..1) from the quiz, read when completion is recorded.
  const quizCorrectnessRef = useRef(1);
  const quizCorrectRef = useRef(0);
  // Best-tool recommendation for THIS lesson ({ tool, why }).
  const [toolRec, setToolRec] = useState(null);
  const { refresh: refreshProgression } = useProgression() || {};
  const { profile } = useProfile();
  const { tools } = useActiveTool();

  useEffect(() => {
    if (initialTopic) {
      // Deep link / Today's Pick: default to the 3-5 min Quick Lesson unless the
      // URL explicitly asks for another depth. Do not inherit the saved picker choice.
      setFormat(initialFormat || 'standard');
    } else {
      const savedFormat = getSavedFormat();
      if (savedFormat) {
        setFormat(savedFormat);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Personalized "Suggested for you" topics, generated from the learner's profile.
  // Cached per day + profile + lessons-completed count, and keyed on the picker
  // view, so the list refreshes after someone finishes a lesson and the
  // generator is told which topics they've already done (keeps it fresh).
  // Seed from the last cached personalized list synchronously so a refresh
  // paints the real topics immediately instead of flashing the static fallback
  // first. The effect below still revalidates (sig/date) and refreshes if stale.
  // Safe to read localStorage here: this component is client-only (under
  // Suspense via useSearchParams), so there's no SSR/hydration mismatch.
  const [suggested, setSuggested] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('lesson_suggested_topics') || 'null');
      if (cached && Array.isArray(cached.topics) && cached.topics.length) return cached.topics;
    } catch {
      // ignore unreadable cache
    }
    return null;
  });

  useEffect(() => {
    if (initialTopic || !profile || view !== 'picker') return;

    let history = [];
    try { history = getLessonHistory(resolveLearnerId(profile)) || []; } catch { history = []; }
    const completedTopics = history.map((l) => l.topic).filter(Boolean);
    const recentCompleted = completedTopics.slice(-12);
    const lessonCount = history.length;

    // lessonCount in the signature means finishing a lesson invalidates the
    // cached list, so the next time they land on the picker it regenerates.
    const sig = `${profile.department || ''}|${profile.tier || ''}|${(profile.top_tasks || []).join(',')}|n${lessonCount}`;
    const today = contentDayKey(); // rolls over at 8 AM PT
    const cacheKey = 'lesson_suggested_topics';

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.sig === sig && cached.date === today && Array.isArray(cached.topics) && cached.topics.length) {
        setSuggested(cached.topics);
        return;
      }
    } catch {
      // ignore cache read errors
    }

    fetch('/api/lesson/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exclude: recentCompleted }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        if (Array.isArray(data.suggestions) && data.suggestions.length) {
          setSuggested(data.suggestions);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ sig, date: today, topics: data.suggestions }));
          } catch {
            // ignore cache write errors
          }
        }
      })
      .catch(() => {
        // fall back to the static SUGGESTED_TOPICS already shown
      });
  }, [profile, initialTopic, view]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectFormat(key) {
    setFormat(key);
    try {
      localStorage.setItem('lesson_format', key);
    } catch {
      // persistence is best-effort
    }
  }

  // Debounce-save lesson state when in lesson view
  useEffect(() => {
    if (view !== 'lesson' || slides.length === 0) return;
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
    }
    debounceSaveRef.current = setTimeout(() => {
      saveLessonState({
        topic,
        format,
        slides,
        currentSlideIdx,
        messages,
        userInputs,
        lessonStartedAt: lessonStartedAt.current,
      });
    }, 500);
    return () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
      }
    };
  }, [view, slides, currentSlideIdx, messages, userInputs, topic, format]);

  // Auto-scroll to bottom of conversation on new content
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [slides, userInputs, isLoading]);


  // If we arrive with a topic from URL, kick off the lesson
  const hasStarted = useRef(false);
  useEffect(() => {
    if (initialTopic && !hasStarted.current && slides.length === 0) {
      hasStarted.current = true;
      // Launched in watch mode → open the narrated video; otherwise start the
      // interactive read lesson.
      if (initialMode === 'watch') {
        setVideoTopic(initialTopic);
      } else if ((initialFormat || 'standard') === 'quick_tip') {
        fetchStartLesson(initialTopic, 'quick_tip');
      }
      // Quick Lesson / Deep Dive: the plan-driven player handles its own start.
    }
  }, [initialTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // There are no Continue buttons — the learner moves through the lesson and
  // engages entirely through the chat bar. Prefill it so they can hit enter to
  // advance, or type their own question/attempt. At the first practice point we
  // prefill the scenario prompt; on a scenario-attempt slide (no next button) we
  // leave it empty so they type their attempt.
  function prefillForSlide(slide) {
    if (voiceModeRef.current) return;
    const phase = slide?.phase;
    if (phase === 'complete') {
      setUserInput('');
      return;
    }
    const scenarioEntry =
      !practicePrefilledRef.current &&
      (format === 'quick_tip' || phase === 'practice' || phase === 'apply');
    if (scenarioEntry) {
      practicePrefilledRef.current = true;
      setUserInput(SCENARIO_PROMPT);
    } else {
      // Leave the input empty — the suggested next-step chips below guide the
      // learner instead of a bland prefilled "Continue".
      setUserInput('');
    }
  }

  async function fetchStartLesson(t, fmt = format) {
    setIsLoading(true);
    setError(null);
    setSlides([]);
    setCurrentSlideIdx(0);
    setMessages([]);
    setUserInputs([]);
    lessonStartedAt.current = new Date().toISOString();
    hasRecordedCompletion.current = false;
    practicePrefilledRef.current = false;
    setQuizQuestions(null);
    setQuizActive(false);
    quizCorrectnessRef.current = 1;
    quizCorrectRef.current = 0;
    setFinishing(false);
    // Ask which tool is best for this lesson (parallel, best-effort).
    setToolRec(null);
    fetch('/api/lesson/recommend-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: t }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.tool) setToolRec(d); })
      .catch(() => {});

    try {
      const res = await fetch('/api/lesson/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, format: fmt, tools }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start lesson');

      const { messages: newMessages, ...slide } = data;
      setSlides([slide]);
      setMessages(newMessages);
      setCurrentSlideIdx(0);
      prefillForSlide(slide);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function startLesson(t) {
    setTopic(t);
    setView('lesson');
    // Quick Lessons & Deep Dives use the plan-driven player (it fetches its own
    // plan). Only Quick Tips use the conversational start.
    if (format === 'quick_tip') fetchStartLesson(t);
  }

  // Entry point from the picker: watch a narrated video or start a read lesson.
  function chooseTopic(t) {
    if (learnMode === 'watch') {
      setVideoTopic(t);
    } else {
      startLesson(t);
    }
  }

  // Typed topics get a quick vagueness check first: if the topic is too broad,
  // show a clarify card so the learner can pick a sharper direction (which makes
  // the lesson far more useful). Specific topics start immediately. Suggested
  // topic chips skip this — they're already specific.
  //
  // A picked angle ("Connecting APIs and apps") is often still broad, so each
  // selection gets re-checked and can prompt one more round — capped so it never
  // turns into an interrogation.
  const MAX_CLARIFY_ROUNDS = 3;

  // `context` is the broader topic this input refines — sent so the check keeps
  // the original domain/tool (e.g. "n8n") instead of judging the bare refinement.
  // `rootContext` is the very first typed topic, kept stable across rounds so the
  // anchor never drifts to a later bare phrase.
  async function clarifyOrStart(trimmed, roundToShow, context, rootContext) {
    setClarifying(true);
    try {
      const res = await fetch('/api/lesson/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed, context }),
      });
      const data = res.ok ? await res.json() : { vague: false };
      if (roundToShow <= MAX_CLARIFY_ROUNDS && data?.vague && Array.isArray(data.angles) && data.angles.length) {
        setClarify({ original: trimmed, round: roundToShow, rootContext: rootContext || trimmed, ...data });
        setClarifyRefine('');
      } else {
        chooseClarified(trimmed);
      }
    } catch {
      chooseClarified(trimmed);
    } finally {
      setClarifying(false);
    }
  }

  function submitCustomTopic(t) {
    const trimmed = (t || '').trim();
    if (!trimmed || clarifying) return;
    clarifyOrStart(trimmed, 1, undefined, trimmed);
  }

  // The learner picked an angle or typed a sharper topic — re-check it (it may
  // still be broad) and prompt one more round, up to the cap. Anchor the re-check
  // to the original topic so a typed refinement keeps its domain/tool.
  function refineClarify(t) {
    const trimmed = (t || '').trim();
    if (!trimmed || clarifying) return;
    const root = clarify?.rootContext || clarify?.original;
    clarifyOrStart(trimmed, (clarify?.round || 1) + 1, root, root);
  }

  // Start immediately on this topic, no further re-check (used by "Just the
  // basics" and the "just teach me X" escape).
  function chooseClarified(t) {
    const trimmed = (t || '').trim();
    if (!trimmed) return;
    setClarify(null);
    chooseTopic(trimmed);
  }

  async function continueLesson(input, displayLabel) {
    setUserInputs((prev) => [...prev, displayLabel || input]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lesson/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, messages, userInput: input, format, tools }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to continue lesson');

      const { messages: newMessages, ...slide } = data;
      setSlides((prev) => [...prev, slide]);
      setMessages(newMessages);
      setCurrentSlideIdx((prev) => prev + 1);
      prefillForSlide(slide);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function wrapUpLesson() {
    continueLesson("I'm ready to wrap up the lesson.", 'Finish lesson');
  }

  async function finishLesson() {
    if (isLoading || quizLoading) return;

    // Quick tips are completion-only — no quiz, full XP.
    if (format === 'quick_tip') {
      quizCorrectnessRef.current = 1;
      quizCorrectRef.current = 0;
      wrapUpLesson();
      return;
    }

    // Standard / deep dive: gate XP behind a checkpoint quiz grounded in the
    // lesson. If the quiz can't be generated, never block finishing — fall back
    // to completing with full credit.
    setQuizLoading(true);
    try {
      const res = await fetch('/api/lesson/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, format, messages }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setQuizActive(true);
      } else {
        quizCorrectnessRef.current = 1;
        wrapUpLesson();
      }
    } catch {
      quizCorrectnessRef.current = 1;
      wrapUpLesson();
    } finally {
      setQuizLoading(false);
    }
  }

  // Called when the learner finishes the checkpoint quiz. correctness is 0..1.
  function handleQuizFinish(correctness, stats) {
    quizCorrectnessRef.current = correctness;
    quizCorrectRef.current = stats?.correctCount || 0;
    setFinishing(true);
    setQuizActive(false);
    wrapUpLesson();
  }

  function handleSubmitInput(e) {
    e.preventDefault();
    const text = userInput.trim();
    if (!text || isLoading) return;
    setUserInput('');
    continueLesson(text);
  }

  function resetToPickerView() {
    clearSavedLesson(topic, format);
    setView('picker');
    setClarify(null);
    setTopic('');
    setSlides([]);
    setMessages([]);
    setUserInputs([]);
    setCurrentSlideIdx(0);
    setError(null);
    hasRecordedCompletion.current = false;
    setQuizQuestions(null);
    setQuizActive(false);
    quizCorrectnessRef.current = 1;
    setFinishing(false);
  }

  // --- Progression: record completion (must be before any early return) ---
  const currentSlide = slides[currentSlideIdx];
  const isComplete = currentSlide?.phase === 'complete' && currentSlide?.recap;

  const handleLessonComplete = useCallback(() => {
    if (hasRecordedCompletion.current) return;
    hasRecordedCompletion.current = true;
    clearSavedLesson(topic, format);
    try {
      if (profile && topic) {
        const durationMs = lessonStartedAt.current ? Date.now() - lessonStartedAt.current : 0;
        const result = onLessonComplete(resolveLearnerId(profile), topic, lessonStartedAt.current, {
          format,
          correctness: quizCorrectnessRef.current,
          quizCorrect: quizCorrectRef.current,
        });
        emitXp(result);
        refreshProgression?.();
        trackLessonComplete(topic, format, durationMs);
      }
    } catch {
      // progression is best-effort
    } finally {
      setFinishing(false);
    }
  }, [topic, format, profile, refreshProgression]);

  useEffect(() => {
    if (isComplete) {
      handleLessonComplete();
    }
  }, [isComplete, handleLessonComplete]);

  if (view === 'picker') {
    if (surpriseMode) {
      return (
        <>
          <PageHeader icon={Zap} title="Quick Win" subtitle="One thing you can do with AI right now" />
          <main className="max-w-3xl mx-auto px-6 py-10">
            <button
              onClick={() => setSurpriseMode(false)}
              className="inline-flex items-center gap-1.5 mb-6 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to lessons
            </button>
            <SurpriseWin
              onStartLesson={(t) => { setSurpriseMode(false); startLesson(t); }}
            />
          </main>
        </>
      );
    }

    // Resume a paused lesson from the Paused lessons box — in-page (no URL
    // navigation), so it works even though we're already on /lesson. Plan
    // lessons (standard/deep_dive/project_quest) restore inside the plan player
    // from the store; quick tips restore their conversational state here.
    function handleResumeEntry(entry) {
      const s = entry.state || {};
      setTopic(entry.topic);
      setFormat(entry.format || 'standard');
      setLearnMode('read');
      if (entry.format === 'quick_tip') {
        setSlides(s.slides || []);
        setCurrentSlideIdx(s.currentSlideIdx || 0);
        setMessages(s.messages || []);
        setUserInputs(s.userInputs || []);
        lessonStartedAt.current = s.lessonStartedAt || new Date().toISOString();
        hasRecordedCompletion.current = false;
        practicePrefilledRef.current = true; // don't auto-prefill mid-lesson on resume
      }
      setView('lesson');
    }

    return (
      <>
      <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
      <main data-tour="lesson-main" className="max-w-4xl mx-auto px-6 py-10">
        <PausedLessonsBox onResume={handleResumeEntry} />

        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2">What do you want to learn?</h2>
          <p className="text-slate-600 dark:text-slate-400">Pick from popular topics or type your own.</p>
        </div>

        <div data-tour="page-lesson" className="mb-8">
          <h3 className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            <StepNum n={1} /> How deep do you want to go?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: 'quick_tip', icon: Zap, label: 'Quick Tip', duration: '60 seconds', desc: 'One bite-sized insight you can read and apply right away. No exercise.' },
              { key: 'standard', icon: BookOpen, label: 'Quick Lesson', duration: '3-5 min', desc: 'A focused walkthrough with one hands-on exercise to practice the skill.' },
              { key: 'deep_dive', icon: BookMarked, label: 'Deep Dive', duration: '15-20 min', desc: 'A thorough, step-by-step lesson with multiple exercises to master the topic.' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => selectFormat(f.key)}
                className={`group p-4 rounded-xl border text-left transition-all ${
                  format === f.key
                    ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 ring-2 ring-brand-100 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    format === f.key ? 'bg-brand text-white' : 'bg-bg-subtle dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    <f.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{f.duration}</span>
                </div>
                <div className="font-bold text-ink dark:text-slate-200">{f.label}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{f.desc}</p>
              </button>
            ))}
            {/* Project Quest is a depth too — selecting it shows the curated
                quests right here instead of jumping to another page. */}
            <button
              onClick={() => selectFormat('project_quest')}
              className={`group p-4 rounded-xl border text-left transition-all ${
                format === 'project_quest'
                  ? 'bg-cta-50 dark:bg-slate-700 border-cta-300 ring-2 ring-cta-100 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cta-300 hover:shadow-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${format === 'project_quest' ? 'bg-cta text-ink' : 'bg-cta-50 text-cta-700 dark:bg-slate-700 dark:text-cta-400'}`}>
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">20-60 min</span>
              </div>
              <div className="font-bold text-ink dark:text-slate-200">Project Quest</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Build something real start to finish, guided the whole way.</p>
            </button>
          </div>
        </div>

        <div data-tour="lesson-mode" className="mb-8">
          <h3 className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            <StepNum n={2} /> How do you want to learn?
          </h3>
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            {[
              format === 'project_quest'
                ? { key: 'read', icon: BookOpen, label: 'Read & build', desc: 'Interactive, step by step' }
                : { key: 'read', icon: BookOpen, label: 'Read & practice', desc: 'Interactive, chat-driven' },
              { key: 'watch', icon: PlayCircle, label: 'Narrated lesson', desc: 'Sit back & listen' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setLearnMode(m.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  learnMode === m.key
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                aria-pressed={learnMode === m.key}
              >
                <m.icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {format === 'project_quest'
              ? (learnMode === 'watch'
                  ? 'Pick or type a project and we’ll generate a narrated walkthrough — read aloud to you (it’s not a video).'
                  : 'Pick or type a project and we’ll build it with you for real, guided step by step.')
              : (learnMode === 'watch'
                  ? 'Pick a topic below and we’ll generate a short narrated lesson — slides read aloud to you (it’s not a video).'
                  : 'Pick a topic below for a hands-on lesson you work through step by step.')}
          </p>
        </div>

        <div data-tour="lesson-topics" className="mb-8">
          <h3 className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            <StepNum n={3} /> Pick a topic
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(suggested || SUGGESTED_TOPICS).map((s, i) => (
              <button
                key={i}
                onClick={() => chooseTopic(s.topic)}
                className="group flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 hover:shadow-md transition-all text-left"
              >
                <span className="text-2xl">{s.emoji || '💡'}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-0.5">{s.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{s.topic}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setSurpriseMode(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 shadow-sm transition-all active:scale-[0.98]"
            >
              <Zap className="w-4 h-4" />
              Surprise me
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            Or type your own
          </h3>
          <div className="flex gap-2">
            <input
              data-tour="lesson-custom-input"
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customTopic.trim()) submitCustomTopic(customTopic.trim()); }}
              placeholder="e.g., 'how to use AI for budget forecasting'"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            <button
              data-tour="lesson-start"
              onClick={() => customTopic.trim() && submitCustomTopic(customTopic.trim())}
              disabled={!customTopic.trim() || clarifying}
              className="px-5 py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5"
            >
              {clarifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
              ) : learnMode === 'watch' ? (
                <><PlayCircle className="w-4 h-4" /> Watch</>
              ) : 'Start'}
            </button>
          </div>

          {/* Vague topic → clarify card: pick a sharper direction or type one. */}
          {clarify && (
            <div className="mt-4 rounded-xl border border-brand-200 dark:border-slate-600 bg-brand-50/60 dark:bg-slate-900/60 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-ink dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                {clarify.question}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                A more specific topic makes for a much more useful lesson.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {clarify.angles.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => refineClarify(a.topic)}
                    disabled={clarifying}
                    title={a.topic}
                    className="px-3.5 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-all text-left"
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  onClick={() => chooseClarified(clarify.basics.topic)}
                  disabled={clarifying}
                  className="px-3.5 py-2 rounded-pill border border-brand-300 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
                >
                  {clarify.basics.label}
                </button>
                {clarifying && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={clarifyRefine}
                  onChange={(e) => setClarifyRefine(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && clarifyRefine.trim()) refineClarify(clarifyRefine.trim()); }}
                  placeholder="…or type something more specific"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 text-sm focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
                <button
                  onClick={() => clarifyRefine.trim() && refineClarify(clarifyRefine.trim())}
                  disabled={!clarifyRefine.trim() || clarifying}
                  className="px-4 py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {learnMode === 'watch' ? 'Watch' : 'Start'}
                </button>
              </div>
              <button
                onClick={() => chooseClarified(clarify.original)}
                disabled={clarifying}
                className="mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-50 transition-colors"
              >
                Just teach me “{clarify.original}” →
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          ✨ Suggested topics are personalized to your role and tasks · {REFRESH_LABEL}
        </p>
      </main>
      {videoTopic && (
        <VideoLessonPlayer
          topic={videoTopic}
          format={format}
          tools={tools}
          questId={videoQuestId}
          onClose={() => { setVideoTopic(null); setVideoQuestId(null); }}
        />
      )}
      </>
    );
  }

  // Quick Tips are a single 60-second insight, so finishing is the primary next
  // step — show it first and treat chat as the optional "go deeper" path below.
  // Longer formats are chat-driven, so the input leads and finish sits below.
  const isQuickTip = format === 'quick_tip';

  const chatArea = (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-brand shrink-0" />
        {userInput === SCENARIO_PROMPT
          ? 'Press enter or tap the arrow → to try a scenario based on your work — or type your own.'
          : 'Tap a suggestion to keep going, or type your own question or response.'}
      </p>
      {/* Suggested next-step chips from the current slide + a Show me how helper */}
      <div className="mb-2 flex flex-wrap gap-2">
        {(currentSlide?.buttons || [])
          .filter((b) => b.action !== 'complete' && b.label)
          .map((b, i) => {
            const isPrimary = b.action === 'next';
            return (
              <button
                key={i}
                type="button"
                onClick={() => !isLoading && continueLesson(b.label, b.label)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                  isPrimary
                    ? 'bg-brand text-white hover:bg-brand-600 border border-brand'
                    : 'border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 bg-brand-50 dark:bg-slate-700 hover:bg-brand-100 dark:hover:bg-slate-600'
                }`}
              >
                {b.label}
                {isPrimary && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        <button
          type="button"
          onClick={() => !isLoading && continueLesson('Show me how to do this, step by step.', 'Show me how')}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-200 hover:text-brand hover:bg-brand-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Show me how
        </button>
      </div>
      <form onSubmit={handleSubmitInput} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type a question or response...'}
          disabled={isLoading}
          className={`flex-1 px-4 py-3 rounded-xl border dark:bg-slate-900 dark:text-slate-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:opacity-50 shadow-sm ${
            isListening
              ? 'border-red-300 dark:border-red-700 ring-2 ring-red-100 dark:ring-red-900/30'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        />
        {sttSupported && (
          <button
            type="button"
            onClick={toggleStt}
            className={`px-3 py-3 rounded-xl transition-all shadow-sm ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          type="submit"
          disabled={!userInput.trim() || isLoading}
          className="px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </>
  );

  const finishCard = (
    <div className="rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50/60 dark:bg-slate-800/60 p-4">
      <p className="text-sm text-ink dark:text-slate-200 font-medium mb-1">
        {isQuickTip ? "That's the tip — nice work!" : 'Done, or want to go deeper?'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {isQuickTip
          ? <>Finish to lock in your progress — or keep learning in the chat below.</>
          : <>Keep the conversation going above to learn more — or finish your {FORMAT_META[format].title} when you&apos;re ready. You&apos;ll answer a couple of quick questions to earn your XP.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={finishLesson}
          disabled={isLoading || quizLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm shadow-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {quizLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {quizLoading
            ? 'Preparing quick check…'
            : (isQuickTip ? 'Finish' : `Finish ${FORMAT_META[format].title}`)}
        </button>
        <button
          onClick={resetToPickerView}
          className="text-sm text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-all"
        >
          Exit without finishing
        </button>
      </div>
    </div>
  );

  // Quick Lessons, Deep Dives & Project Quests (read mode) use the plan-driven
  // player: Bloom objectives, required interactive activities, Step X of N,
  // pause/resume.
  if (view === 'lesson' && learnMode === 'read' && (format === 'standard' || format === 'deep_dive' || format === 'project_quest')) {
    return (
      <>
        <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
        <main data-tour="lesson-main" className="max-w-3xl mx-auto px-6 py-10">
          <PlanLessonPlayer topic={topic} format={format} onExit={resetToPickerView} />
        </main>
      </>
    );
  }

  return (
    <>
    <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
    <main data-tour="lesson-main" className="max-w-3xl mx-auto px-6 py-10">

      {!isComplete && <LlmWindowCallout storageKey="lesson" recommendation={toolRec} className="mb-6" showOpen={false} />}

      {/* Progress bar + voice mode toggle */}
      {slides.length > 0 && (
        <div data-tour="lesson-content" className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${((currentSlideIdx + 1) / Math.max(slides.length + (isComplete ? 0 : 1), 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Step {currentSlideIdx + 1}
          </span>
          {sttSupported && !isComplete && (
            <button
              onClick={toggleVoiceMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                voiceMode
                  ? 'bg-red-500 text-white shadow-sm animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              aria-label={voiceMode ? 'Exit voice mode' : 'Enter voice mode'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {voiceMode ? 'Voice On' : 'Voice Mode'}
            </button>
          )}
        </div>
      )}

      {/* Loading state (initial) */}
      {isLoading && slides.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-12">
          <BookLoader message={`Preparing your lesson on ${topic}...`} size="lg" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-center">
          <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
          <button
            onClick={() => fetchStartLesson(topic)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Conversation thread */}
      <div className="space-y-4">
        {slides.map((slide, idx) => {
          const isLast = idx === slides.length - 1;
          const slideIsComplete = slide.phase === 'complete' && slide.recap;
          return (
            <div key={idx}>
              {/* User message that triggered this slide */}
              {userInputs[idx - 1] && (
                <div className="flex justify-end mb-4">
                  <div className="max-w-[80%] bg-brand text-white px-4 py-3 rounded-2xl rounded-br-md text-sm">
                    {userInputs[idx - 1]}
                  </div>
                </div>
              )}

              {/* AI slide */}
              {slideIsComplete && isLast ? (
                <RecapCard
                  recap={slide.recap}
                  format={format}
                  onPickAnother={resetToPickerView}
                  onDashboard={() => router.push('/')}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Step {idx + 1}
                    </span>
                  </div>
                  <SlideCard slide={slide} />
                </>
              )}
            </div>
          );
        })}

        {/* Pending user message while AI is thinking */}
        {isLoading && userInputs.length >= slides.length && userInputs[userInputs.length - 1] && (
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-brand text-white px-4 py-3 rounded-2xl rounded-br-md text-sm">
              {userInputs[userInputs.length - 1]}
            </div>
          </div>
        )}

        {/* Loading indicator for continuation */}
        {isLoading && slides.length > 0 && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Checkpoint quiz — shown when finishing a standard/deep-dive lesson.
          Replaces the chat/finish area until the learner finishes the quiz. */}
      {quizActive && quizQuestions && !isComplete && (
        <div className="mt-4">
          <LessonQuiz questions={quizQuestions} onFinish={handleQuizFinish} finishing={finishing} />
        </div>
      )}

      {/* Engagement area. Quick Tip: finish first, chat below as "go deeper".
          Longer formats: chat-driven practice leads, finish sits below. */}
      {slides.length > 0 && !isComplete && !quizActive && (
        <div className="mt-4">
          {isQuickTip ? (
            <>
              {finishCard}
              <div className="mt-6">
                <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-2">
                  Want to go deeper?
                </p>
                {chatArea}
              </div>
            </>
          ) : (
            <>
              {chatArea}
              <div className="mt-6">{finishCard}</div>
            </>
          )}
        </div>
      )}
    </main>
    </>
  );
}

export default function LessonPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>}>
        <LessonContent />
      </Suspense>
    </div>
  );
}
