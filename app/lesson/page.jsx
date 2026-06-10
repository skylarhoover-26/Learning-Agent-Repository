'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { SlideCard, RecapCard } from '@/components/lesson-slide';
import XpToast from '@/components/xp-toast';
import { useProgression } from '@/components/progression-provider';
import { onLessonComplete } from '@/lib/progression';
import { useProfile } from '@/components/profile-provider';
import { getSavedLesson, saveLessonState, clearSavedLesson } from '@/lib/lesson-store';
import BookLoader from '@/components/book-loader';
import {
  BookOpen, ChevronRight, Zap, BookMarked, Trophy,
  Loader2, Send, Mic, MicOff, MessageSquare,
} from 'lucide-react';
import { useStt } from '@/lib/use-stt';
import { useTts } from '@/lib/use-tts';
import { trackLessonComplete } from '@/lib/track';

// Prefilled into the chat bar at the lesson's first practice point so the learner
// can hit enter to kick off an interactive, personalized scenario.
const SCENARIO_PROMPT = "I'd like to try a scenario based on my work.";

const FORMAT_META = {
  quick_tip: { title: 'Quick Tip', subtitle: 'Pick a topic — 60-second insight' },
  standard: { title: 'Quick Lesson', subtitle: 'Pick a topic — 3-5 minute hands-on lesson' },
  deep_dive: { title: 'Deep Dive', subtitle: 'Pick a topic — 15-20 minute thorough lesson' },
};

function getSavedFormat() {
  try {
    const saved = localStorage.getItem('lesson_format');
    return FORMAT_META[saved] ? saved : null;
  } catch {
    return null;
  }
}

const SUGGESTED_TOPICS = [
  { label: '🎯 Prompt Basics', topic: 'How to write clear, specific prompts that get useful results' },
  { label: '🧵 AI for Slack', topic: 'Using AI to draft, summarize, and respond to Slack messages and threads faster' },
  { label: '📊 Data Summaries', topic: 'Turning raw data and notes into executive-ready summaries' },
  { label: '🤖 What Are AI Agents?', topic: 'Understanding AI agents and how they can automate multi-step workflows' },
  { label: '✅ Verifying AI Output', topic: 'How to fact-check and validate AI-generated content before using it' },
  { label: '💬 Better Conversations', topic: 'How to have productive back-and-forth conversations with AI assistants' },
];

function LessonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get('topic');
  const initialFormat = (() => {
    const f = searchParams.get('format');
    return ['quick_tip', 'standard', 'deep_dive'].includes(f) ? f : null;
  })();
  const [view, setView] = useState(initialTopic ? 'lesson' : 'picker');
  const [topic, setTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState('');
  const [format, setFormat] = useState('standard');

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

  // Saved lesson state (for resume banner)
  const [savedLesson, setSavedLesson] = useState(null);
  const debounceSaveRef = useRef(null);

  // Progression state
  const [progressionResult, setProgressionResult] = useState(null);
  const lessonStartedAt = useRef(null);
  const hasRecordedCompletion = useRef(false);
  const { refresh: refreshProgression } = useProgression() || {};
  const { profile } = useProfile();

  useEffect(() => {
    const saved = getSavedLesson();
    if (saved) {
      setSavedLesson(saved);
    }
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
      fetchStartLesson(initialTopic, initialFormat || 'standard');
    }
  }, [initialTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // The model suggests the next step via a "next"/"try_exercise" button label;
  // we surface it as a chat-bar prefill instead of a button.
  function nextActionLabel(slide) {
    const b = (slide?.buttons || []).find((x) => x.action === 'next' || x.action === 'try_exercise');
    return b ? b.label : null;
  }

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
      setUserInput(nextActionLabel(slide) || '');
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
    setProgressionResult(null);

    try {
      const res = await fetch('/api/lesson/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, format: fmt }),
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
    fetchStartLesson(t);
  }

  async function continueLesson(input, displayLabel) {
    setUserInputs((prev) => [...prev, displayLabel || input]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lesson/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, messages, userInput: input, format }),
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

  function finishLesson() {
    if (isLoading) return;
    continueLesson("I'm ready to wrap up the lesson.", 'Finish lesson');
  }

  function handleSubmitInput(e) {
    e.preventDefault();
    const text = userInput.trim();
    if (!text || isLoading) return;
    setUserInput('');
    continueLesson(text);
  }

  function resetToPickerView() {
    clearSavedLesson();
    setView('picker');
    setTopic('');
    setSlides([]);
    setMessages([]);
    setUserInputs([]);
    setCurrentSlideIdx(0);
    setError(null);
    hasRecordedCompletion.current = false;
    setProgressionResult(null);
  }

  // --- Progression: record completion (must be before any early return) ---
  const currentSlide = slides[currentSlideIdx];
  const isComplete = currentSlide?.phase === 'complete' && currentSlide?.recap;

  const handleLessonComplete = useCallback(() => {
    if (hasRecordedCompletion.current) return;
    hasRecordedCompletion.current = true;
    clearSavedLesson();
    try {
      if (profile?.id && topic) {
        const durationMs = lessonStartedAt.current ? Date.now() - lessonStartedAt.current : 0;
        const result = onLessonComplete(profile.id, topic, lessonStartedAt.current);
        setProgressionResult(result);
        refreshProgression?.();
        trackLessonComplete(topic, format, durationMs);
      }
    } catch {
      // progression is best-effort
    }
  }, [topic, format, profile, refreshProgression]);

  useEffect(() => {
    if (isComplete) {
      handleLessonComplete();
    }
  }, [isComplete, handleLessonComplete]);

  if (view === 'picker') {
    function resumeSavedLesson() {
      if (!savedLesson) return;
      setTopic(savedLesson.topic);
      setFormat(savedLesson.format || 'standard');
      setSlides(savedLesson.slides || []);
      setCurrentSlideIdx(savedLesson.currentSlideIdx || 0);
      setMessages(savedLesson.messages || []);
      setUserInputs(savedLesson.userInputs || []);
      lessonStartedAt.current = savedLesson.lessonStartedAt || new Date().toISOString();
      hasRecordedCompletion.current = false;
      practicePrefilledRef.current = true; // don't auto-prefill mid-lesson on resume
      setProgressionResult(null);
      setView('lesson');
      setSavedLesson(null);
    }

    function dismissSavedLesson() {
      clearSavedLesson();
      setSavedLesson(null);
    }

    return (
      <>
      <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        {savedLesson && (
          <div className="mb-8 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              You have a lesson in progress: <strong className="text-ink dark:text-slate-200">{savedLesson.topic}</strong>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={resumeSavedLesson}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-600 transition-all"
              >
                Resume
              </button>
              <button
                onClick={dismissSavedLesson}
                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2">What do you want to learn?</h2>
          <p className="text-slate-600 dark:text-slate-400">Pick from popular topics or type your own.</p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            How deep do you want to go?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'quick_tip', icon: Zap, label: 'Quick Tip', duration: '60 seconds', desc: 'A single insight. No exercise.' },
              { key: 'standard', icon: BookOpen, label: 'Quick Lesson', duration: '3-5 min', desc: 'Hands-on, one exercise.' },
              { key: 'deep_dive', icon: BookMarked, label: 'Deep Dive', duration: '15-20 min', desc: 'Thorough, multiple exercises.' },
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
          </div>
          <Link
            href="/quests"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Trophy className="w-4 h-4" />
            Want to build something real instead? Try a Project Quest (20-60 min)
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            Suggested for you
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTED_TOPICS.map((s, i) => (
              <button
                key={i}
                onClick={() => startLesson(s.topic)}
                className="group flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 hover:shadow-md transition-all text-left"
              >
                <span className="text-2xl">{s.label.split(' ')[0]}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-200 mb-0.5">{s.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{s.topic}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            Or type your own
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customTopic.trim()) startLesson(customTopic.trim()); }}
              placeholder="e.g., 'how to use AI for budget forecasting'"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            <button
              onClick={() => customTopic.trim() && startLesson(customTopic.trim())}
              disabled={!customTopic.trim()}
              className="px-5 py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Start
            </button>
          </div>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
    <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
    <main className="max-w-3xl mx-auto px-6 py-10">
      <XpToast result={progressionResult} onDismiss={() => setProgressionResult(null)} />

      {/* Progress bar + voice mode toggle */}
      {slides.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
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
                <SlideCard slide={slide} />
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

      {/* Engagement area: encouragement + chat-driven practice, finish as a quiet link */}
      {slides.length > 0 && !isComplete && (
        <div className="mt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-brand shrink-0" />
            {userInput === SCENARIO_PROMPT
              ? 'Press enter or tap the arrow → to try a scenario based on your work — or type your own.'
              : 'Press enter or tap the arrow → to send. Ask a question or share your response anytime.'}
          </p>
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

          {/* Quiet finish + exit links */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={finishLesson}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand dark:text-slate-400 transition-all disabled:opacity-50"
            >
              Finish lesson
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetToPickerView}
              className="text-sm text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-all"
            >
              Exit lesson
            </button>
          </div>
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
