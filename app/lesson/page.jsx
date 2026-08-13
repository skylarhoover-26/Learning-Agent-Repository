'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import { SlideCard, RecapCard } from '@/components/lesson-slide';
import CompletionFeedback from '@/components/completion-feedback';
import LessonQuiz from '@/components/lesson-quiz';
import PlanLessonPlayer from '@/components/plan-lesson-player';
import { emitXp } from '@/lib/xp-bus';
import { useProgression } from '@/components/progression-provider';
import { onLessonComplete, getLessonHistory } from '@/lib/progression';
import { recordActivityScore } from '@/lib/adaptive-store';
import { tierForBand, levelChangeMessage, ADAPTIVE_LADDER } from '@/lib/adaptive-level';
import { addNotification } from '@/lib/notifications-store';
import { contentDayKey, REFRESH_LABEL } from '@/lib/content-day';
import { useProfile } from '@/components/profile-provider';
import { saveLessonState, clearSavedLesson } from '@/lib/lesson-store';
import BookLoader from '@/components/book-loader';
import {
  BookOpen, ChevronRight, Zap, BookMarked, Trophy,
  Loader2, Send, Mic, MicOff, MessageSquare, PlayCircle, Sparkles,
  Target, BarChart3, Bot, CheckCircle2, MessagesSquare, Lightbulb, Search, Mail, PenLine, Brain, Rocket, Check,
} from 'lucide-react';
import { useStt } from '@/lib/use-stt';
import { useTts } from '@/lib/use-tts';
import { trackLessonComplete } from '@/lib/track';
import { resolveLearnerId } from '@/lib/learner-id';
import VideoLessonPlayer from '@/components/video-lesson-player';
import PausedLessonsBox from '@/components/paused-lessons-box';
import { getPausedLesson, listPausedLessons, upsertPausedLesson, removePausedLesson } from '@/lib/paused-lessons';
import { QUESTS } from '@/lib/quest-data';
import { useActiveTool } from '@/components/active-tool-provider';
import { prefetchPlan } from '@/lib/lesson-prefetch';

// Prefilled into the chat bar at the lesson's first practice point so the learner
// can hit enter to kick off an interactive, personalized scenario.
const SCENARIO_PROMPT = "I'd like to try a scenario based on my work.";

// Small numbered badge for the picker's step headers.
// The lesson picker is a 3-step wizard: choose depth → choose format → pick a
// topic (picking the topic launches the lesson). As you advance, each completed
// step collapses into a grayed-out summary row (the "ladder") that shows the
// choice you made; click a row to jump back and change it.
const DEPTH_SUMMARY = {
  quick_tip: 'Quick Tip · 60 seconds',
  standard: 'Quick Lesson · 3–5 min',
  deep_dive: 'Deep Dive · 15–20 min',
  project_quest: 'Project Quest · 20–60 min',
};

// The four depth cards double as a difficulty scale (easy → advanced), so each
// gets its own color: green → amber → orange → red. The color shows even when
// unselected (tinted icon tile) so the row reads as a scale at a glance, and
// the selected card lights up loudly (solid tile + ring + glow + check badge).
const DEPTH_OPTIONS = [
  { key: 'quick_tip', icon: Zap, label: 'Quick Tip', duration: '60 seconds', desc: 'One bite-sized insight you can read and apply right away. No exercise.', tone: 'green' },
  { key: 'standard', icon: BookOpen, label: 'Quick Lesson', duration: '3-5 min', desc: 'A focused walkthrough with one hands-on exercise to practice the skill.', tone: 'amber' },
  { key: 'deep_dive', icon: BookMarked, label: 'Deep Dive', duration: '15-20 min', desc: 'A thorough, step-by-step lesson with multiple exercises to master the topic.', tone: 'orange' },
  { key: 'project_quest', icon: Trophy, label: 'Project Quest', duration: '20-60 min', desc: 'Build something real start to finish, guided the whole way.', tone: 'red' },
];

// Static class strings per tone (kept whole so Tailwind's JIT sees them). `glow`
// feeds the inline boxShadow on the selected card.
const DEPTH_TONES = {
  green: { ring: 'ring-green-400 dark:ring-green-500', glow: 'rgba(34,197,94,0.5)', solid: '#22C55E', iconOn: 'bg-green-500 text-white', iconOff: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400', badge: 'bg-green-500' },
  amber: { ring: 'ring-amber-400 dark:ring-amber-500', glow: 'rgba(245,158,11,0.5)', solid: '#F59E0B', iconOn: 'bg-amber-500 text-white', iconOff: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', badge: 'bg-amber-500' },
  orange: { ring: 'ring-orange-400 dark:ring-orange-500', glow: 'rgba(249,115,22,0.5)', solid: '#F97316', iconOn: 'bg-orange-500 text-white', iconOff: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', badge: 'bg-orange-500' },
  red: { ring: 'ring-red-400 dark:ring-red-500', glow: 'rgba(239,68,68,0.5)', solid: '#EF4444', iconOn: 'bg-red-500 text-white', iconOff: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400', badge: 'bg-red-500' },
};

// Step 2 (format) has two cards, so each gets its own identity color and the
// same loud selected treatment (ring + glow + check badge + scale) as the depth
// step. Read = blue, Narrated = violet.
const FORMAT_TONES = {
  read: { ring: 'ring-blue-400 dark:ring-blue-500', glow: 'rgba(59,130,246,0.5)', solid: '#3B82F6', iconOn: 'bg-blue-500 text-white', iconOff: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', badge: 'bg-blue-500' },
  watch: { ring: 'ring-violet-400 dark:ring-violet-500', glow: 'rgba(139,92,246,0.5)', solid: '#8B5CF6', iconOn: 'bg-violet-500 text-white', iconOff: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', badge: 'bg-violet-500' },
};

// Step 3 (topics) isn't a scale, so tiles cycle through a 6-color palette by
// position — every tile reads as its own category, and the selected one lights
// up with a ring + glow + check badge. `tile` tints the emoji chip.
const TOPIC_TONES = [
  { ring: 'ring-blue-400 dark:ring-blue-500', glow: 'rgba(59,130,246,0.5)', solid: '#3B82F6', tile: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', badge: 'bg-blue-500', chevron: 'text-blue-400' },
  { ring: 'ring-teal-400 dark:ring-teal-500', glow: 'rgba(20,184,166,0.5)', solid: '#14B8A6', tile: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800', badge: 'bg-teal-500', chevron: 'text-teal-400' },
  { ring: 'ring-violet-400 dark:ring-violet-500', glow: 'rgba(139,92,246,0.5)', solid: '#8B5CF6', tile: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800', badge: 'bg-violet-500', chevron: 'text-violet-400' },
  { ring: 'ring-amber-400 dark:ring-amber-500', glow: 'rgba(245,158,11,0.5)', solid: '#F59E0B', tile: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', badge: 'bg-amber-500', chevron: 'text-amber-400' },
  { ring: 'ring-rose-400 dark:ring-rose-500', glow: 'rgba(244,63,94,0.5)', solid: '#F43F5E', tile: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800', badge: 'bg-rose-500', chevron: 'text-rose-400' },
  { ring: 'ring-emerald-400 dark:ring-emerald-500', glow: 'rgba(16,185,129,0.5)', solid: '#10B981', tile: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', badge: 'bg-emerald-500', chevron: 'text-emerald-400' },
];

// One collapsed rung of the wizard ladder: a completed step, grayed out, showing
// the learner's choice. Clicking it reopens that step so they can change it.
function LadderRow({ label, value, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl cine-glass text-left opacity-75 hover:opacity-100 transition-all"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white shrink-0">
        <Check className="w-3.5 h-3.5" />
      </span>
      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold w-14 shrink-0">{label}</span>
      <span className="flex-1 font-medium text-slate-600 dark:text-slate-300 truncate">{value}</span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-brand transition-colors shrink-0">
        <PenLine className="w-3.5 h-3.5" /> Edit
      </span>
    </button>
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

// Adaptive difficulty: fold a finished lesson's quiz performance (correctness
// 0..1) into the learner's rolling score, and drop a bell notification if their
// effective lesson level shifted up or down. Best-effort — never blocks or breaks
// lesson completion.
function applyAdaptivePerformance(profile, correctness) {
  try {
    const declared = profile?.tier;
    if (!declared) return;
    const score = (typeof correctness === 'number' ? correctness : 1) * 100;
    const res = recordActivityScore(score, { tier: declared });
    if (!res?.bandChanged) return;
    const fromTier = tierForBand(declared, res.prevBand);
    const toTier = tierForBand(declared, res.band);
    const msg = levelChangeMessage(fromTier, toTier);
    if (!msg) return;
    const up = ADAPTIVE_LADDER.indexOf(toTier) > ADAPTIVE_LADDER.indexOf(fromTier);
    addNotification({
      type: 'level',
      title: up ? 'Your lessons leveled up' : 'Lesson level adjusted',
      detail: msg,
      emoji: up ? '🚀' : '🎯',
    });
  } catch {
    // adaptive tracking is best-effort
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

// Worked examples for the "type your own" box, mirroring Discovery's "Or start
// from one of these examples" (feedback #60). The topic cards above show WHAT you
// can learn; these show how specific a custom topic should be, which is the thing
// people guess wrong — a vague one gets bounced by the clarify gate. Written as
// concrete tasks rather than roles, since the role is scenery, not the lesson.
const TOPIC_EXAMPLES = [
  'How to write a prompt that turns messy meeting notes into a clear list of action items.',
  'Using AI to draft a first reply to an unhappy customer, then editing it so it still sounds like me.',
  'How to check whether an AI answer is actually correct before I pass it on to someone else.',
];

// Monochrome line-icon (stencil) equivalents for topic emojis — the app-wide
// preference is lucide line icons, not colorful iOS emojis. Covers the static
// topics + common emojis the personalized-suggestion API returns; anything else
// falls back to a neutral Lightbulb so it's never a color emoji.
const TOPIC_ICON = {
  '🎯': Target, '🧵': MessageSquare, '📊': BarChart3, '🤖': Bot, '✅': CheckCircle2,
  '💬': MessagesSquare, '📧': Mail, '✉️': Mail, '🔍': Search, '📝': PenLine,
  '🧠': Brain, '🚀': Rocket, '⚡': Zap, '💡': Lightbulb, '📈': BarChart3, '📚': BookOpen,
};
function TopicIcon({ emoji }) {
  const Ic = TOPIC_ICON[emoji] || Lightbulb;
  return <Ic className="w-5 h-5" style={{ color: 'var(--accent2)' }} />;
}

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
  // Step in the 3-step picker wizard (1 = depth, 2 = format, 3 = topic). Depth
  // and format both have defaults, so Next is never a dead end. On step 3 the
  // learner selects a topic (which just highlights it) and then presses
  // "Generate lesson" to actually build it — clicking a card no longer launches
  // straight away, which was jarring.
  const [wizardStep, setWizardStep] = useState(1);
  // The suggested topic highlighted on step 3, and whether generation is firing.
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [generating, setGenerating] = useState(false);
  // Short beat between pressing "Generate lesson" and the lesson opening, so the
  // generating popup is actually visible and "Go back" can cancel before launch.
  const generateTimerRef = useRef(null);
  const [videoTopic, setVideoTopic] = useState(null);
  // When resuming a paused narrated lesson, holds its saved { script, scene } so
  // the player reuses them instead of regenerating a brand-new script.
  const [videoResume, setVideoResume] = useState(null);
  // When the narrated player is showing a Project Quest, this holds the quest id so
  // the script is sourced from the quest's curated steps.
  const [videoQuestId, setVideoQuestId] = useState(null);
  // "Surprise me" auto-picks a personalized topic, then runs it as a normal
  // Quick Tip lesson (so it gets a finish button, saves to resume, and honors
  // read/narrated mode). These track that one-shot pick.
  const [surpriseError, setSurpriseError] = useState(null);
  const surpriseStartedRef = useRef(false);

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
  // Narrated ("watch") lessons award XP just like the read version; guard against
  // double-awarding within a single viewing.
  const videoStartedAt = useRef(null);
  const videoCompletedRef = useRef(false);

  // End-of-lesson quiz (gates XP for standard/deep_dive; quick tips skip it).
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Correctness (0..1) from the quiz, read when completion is recorded.
  const quizCorrectnessRef = useRef(1);
  const quizCorrectRef = useRef(0);
  // How many questions there were, so the log records "3 of 5" rather than a
  // bare percentage with no idea how much it was measured over.
  const quizTotalRef = useRef(0);
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
  }, [profile, initialTopic, view]);

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
    // A finished lesson must leave the paused list — never (re)persist it. Without
    // this, the debounced save that the final "complete" slide triggers fires
    // ~500ms after handleLessonComplete clears the entry and silently re-adds it,
    // so a completed Quick Tip keeps showing as paused.
    if (slides.some((s) => s?.phase === 'complete')) return;
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
      // Launched in watch mode → open the narrated video. All read-mode formats
      // (Quick Tip, Quick Lesson, Deep Dive, Project Quest) fall through: the
      // plan-driven step player mounts on view==='lesson' and handles its own start.
      if (initialMode === 'watch') {
        launchVideo(initialTopic);
      }
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
    quizTotalRef.current = 0;
    setFinishing(false);

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
    // Mirror the active lesson into the URL (replace, so we don't stack history)
    // so clicking "Lesson" in the menu — which goes to a bare /lesson — is a real
    // navigation the sync effect above catches, returning to the picker.
    const params = new URLSearchParams();
    params.set('topic', t);
    if (format && format !== 'standard') params.set('format', format);
    router.replace(`/lesson?${params.toString()}`, { scroll: false });
    // All read-mode formats (Quick Tip, Quick Lesson, Deep Dive, Project Quest)
    // now use the plan-driven step player, which fetches its own plan on mount.
  }

  // Entry point from the picker: watch a narrated video or start a read lesson.
  function chooseTopic(t) {
    if (learnMode === 'watch') {
      launchVideo(t);
    } else {
      // Prefetch the plan for the reader (covers typed / surprise / clarified
      // topics that don't go through generateSelected). Dedupes by key.
      if (format === 'quick_tip' || format === 'standard' || format === 'deep_dive') {
        prefetchPlan(t, format, tools);
      }
      startLesson(t);
    }
  }

  // Step 3 "Generate lesson": build the highlighted suggested topic. Shows a
  // generating popup with a "Go back", then opens the lesson after a short beat
  // (the destination's own loader — plan player / narrated player — continues
  // from there). Go back cancels before the launch fires, so nothing is built.
  function generateSelected() {
    if (!selectedTopic) return;
    // Warm the plan request, then go STRAIGHT into the lesson view — the player's
    // own loader (which now waits until the lesson is fully ready) is the single
    // loading screen. We used to show a separate "Generating…" modal for a beat
    // first, which read as two back-to-back loaders.
    if (learnMode === 'read' && (format === 'standard' || format === 'deep_dive')) {
      prefetchPlan(selectedTopic, format, tools);
    }
    chooseTopic(selectedTopic);
  }

  function cancelGenerate() {
    if (generateTimerRef.current) {
      clearTimeout(generateTimerRef.current);
      generateTimerRef.current = null;
    }
    setGenerating(false);
  }

  useEffect(() => () => {
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
  }, []);

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

  // "Take a more focused lesson" from the end-of-lesson feedback: start a sharper
  // lesson anchored to the current topic and seeded with what the learner said
  // they still wanted. Starts directly (no vagueness re-check) so it's one click;
  // changing the topic remounts the lesson player via its key.
  function startFocusedLesson(note) {
    const refined = note ? `${topic} — specifically, ${note}` : topic;
    chooseTopic(refined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Escalate a Quick Tip into a full Deep Dive on the same topic. Surfaced as a
  // persistent "Go deeper" button so the option survives after the tip finishes —
  // the in-lesson "Want to go deeper?" chat unmounts once the tip completes.
  function goDeeper() {
    setLearnMode('read');
    setFormat('deep_dive');
    setView('lesson');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      quizTotalRef.current = 0;
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
    quizTotalRef.current = stats?.total || 0;
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
    setGenerating(false);
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
        applyAdaptivePerformance(profile, quizCorrectnessRef.current);
        refreshProgression?.();
        trackLessonComplete(topic, format, durationMs, {
          correctness: quizCorrectnessRef.current,
          quizCorrect: quizCorrectRef.current,
          quizTotal: quizTotalRef.current,
        });
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

  // Open a narrated ("watch") lesson, stamping a fresh start time so its XP/
  // duration are recorded just like a read lesson. For a Project Quest, if the
  // topic matches a curated quest we pass its id so the narration walks the
  // quest's REAL steps (matching the read version); custom topics stay generic.
  const launchVideo = useCallback((t, fmt = format) => {
    videoCompletedRef.current = false;
    const norm = (s) => (s || '').trim().toLowerCase();
    const quest = fmt === 'project_quest'
      ? QUESTS.find((q) => norm(q.title) === norm(t))
      : null;
    setVideoQuestId(quest ? quest.id : null);

    // RESUME, don't regenerate: if this narrated lesson was paused earlier and we
    // saved its script, reuse it (same lesson, at the saved scene) — matches how
    // re-opening a read lesson resumes. This is the path most people take (re-pick
    // the lesson / Today's Pick / Surprise me) rather than the "Continue" box, so
    // without this a narrated lesson always came back as a brand-new script.
    const saved = getPausedLesson(fmt, t)?.state;
    if (saved?.learnMode === 'watch' && saved.videoScript?.scenes?.length) {
      videoStartedAt.current = saved.lessonStartedAt || new Date().toISOString();
      setVideoResume({ script: saved.videoScript, scene: saved.videoScene || 0, time: saved.videoTime || 0 });
      setVideoTopic(t);
      return;
    }

    // No saved script → genuinely new narrated lesson.
    videoStartedAt.current = new Date().toISOString();
    setVideoResume(null);
    setVideoTopic(t);
    // Seed a paused entry immediately so it shows up in the resume list; the
    // player's onProgress then upgrades it with the real script + scene.
    try {
      upsertPausedLesson({
        format: fmt,
        topic: t,
        state: { topic: t, format: fmt, learnMode: 'watch', lessonStartedAt: videoStartedAt.current },
        stepLabel: 'Narrated',
        startedAt: videoStartedAt.current,
      });
    } catch { /* resume persistence is best-effort */ }
  }, [format]);

  // Persist the narrated lesson's exact script + current scene as it plays, so
  // resuming reuses them (fixes "a completely new lesson is generated").
  const handleVideoProgress = useCallback((script, sceneIdx, time = 0) => {
    const t = videoTopic;
    if (!t || !script?.scenes?.length) return;
    try {
      upsertPausedLesson({
        format,
        topic: t,
        state: {
          topic: t, format, learnMode: 'watch',
          lessonStartedAt: videoStartedAt.current,
          videoScript: script, videoScene: sceneIdx, videoTime: time,
        },
        stepLabel: `Narrated · scene ${sceneIdx + 1} of ${script.scenes.length}`,
        startedAt: videoStartedAt.current,
      });
    } catch { /* best-effort */ }
  }, [videoTopic, format]);

  // "Surprise me": pick a personalized topic (same source as the old quick-win
  // surprise), then launch it in the format the learner ALREADY CHOSE — narrated
  // when they're in watch mode, otherwise the reader. Routing through the real
  // lesson flow is what gives it a Finish button, a saved resume entry, and
  // correct narrated behavior.
  //
  // This used to force setFormat('quick_tip'), a leftover from when surprise lived
  // at /quick-win. The button sits under "Generate lesson" *after* a format is
  // picked, so silently swapping it meant choosing Project Quest and being handed a
  // quick tip (feedback #166). Surprise picks the TOPIC; the format is the
  // learner's. Note this also removed a stale-closure bug: launchVideo defaults its
  // format argument to the `format` state, which hadn't re-rendered yet when
  // setFormat was called on the line above, so the two paths disagreed.
  async function startSurprise() {
    setSurpriseError(null);
    try {
      const res = await fetch('/api/quick-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools }),
      });
      const data = await res.json();
      const t = data?.quickWin?.title;
      if (!res.ok || !t) throw new Error(data?.error || 'Could not find a tip just now.');
      setTopic(t);
      setSurpriseMode(false);
      if (learnMode === 'watch') {
        launchVideo(t, format);
      } else {
        prefetchPlan(t, format, tools);
        setView('lesson');
      }
    } catch (err) {
      setSurpriseError(err.message || 'Something went wrong. Please try again.');
    }
  }

  // Kick off the surprise pick once when entering surprise mode.
  useEffect(() => {
    if (!surpriseMode || surpriseStartedRef.current) return;
    surpriseStartedRef.current = true;
    startSurprise();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surpriseMode]);

  // Resume a paused lesson in-place. All read-mode formats (Quick Tip, Quick
  // Lesson, Deep Dive, Project Quest) now rehydrate from their own saved state
  // when the plan-driven step player mounts, so we just restore topic/format and
  // open the lesson view. Shared by the picker box and the header bell (via the
  // ?resume=<key> deep link below).
  const resumeEntry = useCallback((entry) => {
    if (!entry) return;
    const s = entry.state || {};
    setTopic(entry.topic);
    setFormat(entry.format || 'standard');
    // Narrated ("watch") lessons resume with their SAVED script + scene when we
    // have them (so it's the same lesson, not a fresh one); older entries that
    // predate script persistence fall back to regenerating.
    if (s.learnMode === 'watch') {
      setLearnMode('watch');
      setView('picker'); // the narrated player is a modal layered over the picker
      if (s.videoScript?.scenes?.length) {
        videoStartedAt.current = s.lessonStartedAt || new Date().toISOString();
        videoCompletedRef.current = false;
        setVideoResume({ script: s.videoScript, scene: s.videoScene || 0, time: s.videoTime || 0 });
        setVideoQuestId(null);
        setFormat(entry.format || 'standard');
        setVideoTopic(entry.topic);
      } else {
        launchVideo(entry.topic, entry.format || 'standard');
      }
      return;
    }
    setLearnMode('read');
    setView('lesson');
  }, [launchVideo]);

  // Deep link from the header bell: /lesson?resume=<entryKey> resumes that exact
  // paused lesson. Runs once per distinct key so navigating here jumps straight in.
  const resumedKeyRef = useRef(null);
  const resumeParam = searchParams.get('resume');
  useEffect(() => {
    if (!resumeParam || resumedKeyRef.current === resumeParam) return;
    const entry = listPausedLessons().find((e) => e.key === resumeParam);
    if (entry) {
      resumedKeyRef.current = resumeParam;
      resumeEntry(entry);
    }
  }, [resumeParam, resumeEntry]);

  // Companion to the deep link above: the bell also fires a `lesson:resume`
  // event so clicking resume while ALREADY on /lesson works (the URL/key may
  // be unchanged, so the effect above won't re-fire). Keep resumedKeyRef in
  // sync so the deep-link effect doesn't then resume the same entry twice.
  useEffect(() => {
    function onResume(e) {
      const key = e.detail?.key;
      if (!key) return;
      const entry = listPausedLessons().find((x) => x.key === key);
      if (entry) {
        resumedKeyRef.current = key;
        resumeEntry(entry);
      }
    }
    window.addEventListener('lesson:resume', onResume);
    return () => window.removeEventListener('lesson:resume', onResume);
  }, [resumeEntry]);

  // "View all in lessons" from the bell: /lesson?paused=1 shows the picker (where
  // the full paused-lessons box lives) and scrolls to it — even if we were mid-
  // lesson. We only switch the view; we never clear the current lesson's progress.
  const pausedViewParam = searchParams.get('paused');
  useEffect(() => {
    if (pausedViewParam !== '1') return;
    setView('picker');
    const t = setTimeout(() => {
      document.getElementById('paused-lessons')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => clearTimeout(t);
  }, [pausedViewParam]);

  // Keep the view in sync with the URL's topic. Clicking "Lesson" in the menu
  // navigates to a bare /lesson (no topic) — return to the picker even if we were
  // mid-lesson (progress is auto-saved and resumable), instead of leaving the
  // learner stranded in the current lesson. `startLesson` mirrors the active
  // topic into the URL, so this transition fires reliably. Resume/paused deep
  // links manage the view themselves, so defer to them.
  const topicParam = searchParams.get('topic');
  useEffect(() => {
    if (resumeParam || pausedViewParam === '1') return;
    if (topicParam) {
      setTopic(topicParam);
      setView('lesson');
    } else {
      setView('picker');
      setWizardStep(1);
      setSelectedTopic(null);
      setVideoTopic(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicParam]);

  // Record a narrated-lesson completion. correctness comes from the end quiz
  // (1 for quick tips, which are completion-only) — same award path as reading.
  const handleVideoComplete = useCallback(({ correctness = 1, quizCorrect = 0 } = {}) => {
    if (videoCompletedRef.current) return;
    videoCompletedRef.current = true;
    try {
      // A finished narrated lesson must leave the resume list.
      if (videoTopic) removePausedLesson(format, videoTopic);
      if (profile && videoTopic) {
        const startedAt = videoStartedAt.current;
        const durationMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
        const result = onLessonComplete(resolveLearnerId(profile), videoTopic, startedAt, {
          format,
          correctness,
          quizCorrect,
        });
        emitXp(result);
        applyAdaptivePerformance(profile, correctness);
        refreshProgression?.();
        trackLessonComplete(videoTopic, format, durationMs, { correctness, quizCorrect });
      }
    } catch {
      // progression is best-effort
    }
  }, [profile, videoTopic, format, refreshProgression]);

  if (view === 'picker') {
    if (surpriseMode) {
      return (
        <>
          <PageHeader icon={Zap} title="Quick Tip" subtitle="One thing you can do with AI right now" />
          <main className="max-w-3xl mx-auto px-6 pt-6 pb-10">
            <button
              onClick={() => { surpriseStartedRef.current = false; setSurpriseError(null); setSurpriseMode(false); }}
              className="inline-flex items-center gap-1.5 mb-6 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to lessons
            </button>
            {surpriseError ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 shadow-card p-10 max-w-xl mx-auto text-center">
                <p className="text-red-600 font-medium mb-4">{surpriseError}</p>
                <button
                  onClick={() => { setSurpriseError(null); startSurprise(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 max-w-xl mx-auto">
                <BookLoader message={`Finding a surprise ${FORMAT_META[format].title} for you…`} size="lg" />
              </div>
            )}
          </main>
        </>
      );
    }

    // Resume a paused lesson from the Paused lessons box — in-page (no URL
    // navigation), so it works even though we're already on /lesson. Plan
    // lessons (standard/deep_dive/project_quest) restore inside the plan player
    // from the store; quick tips restore their conversational state here.
    return (
      <>
      <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
      {/* max-w-5xl + CinematicPageHero, matching every other framed tab, so the
          title and content start at the same place whichever tab you click. This
          was max-w-4xl with its own centred icon-and-h2 header, which is what made
          the eye jump between Lesson and the other pages. */}
      <main data-tour="lesson-main" className="max-w-5xl mx-auto px-6 pt-6 pb-10">
        <CinematicPageHero
          eyebrow="Lesson"
          title="What do you want to learn?"
          subtitle={initialPrefill && customTopic === initialPrefill
            ? 'Your topic is set — choose how deep to go and how you want to learn it.'
            : 'Pick from popular topics or type your own.'}
          icon={BookOpen}
          gradient
        />

        {/* Arriving from an AI news item (or anywhere else that passes ?prefill=),
            the topic is already chosen — but the wizard opens on step 1 (Depth) and
            the prefilled input lives on step 3, so the article was invisible for two
            steps and the selection looked like it hadn't stuck. Pinning it at the top
            keeps it on screen the whole way through; Edit jumps to the topic step. */}
        {initialPrefill && customTopic === initialPrefill && wizardStep !== 3 && (
          <LadderRow
            label="Topic"
            value={initialPrefill}
            onEdit={() => setWizardStep(3)}
          />
        )}

        {/* Ladder: completed steps collapse into grayed-out summary rows that
            stack above the active step; click one to jump back and edit it. */}
        {wizardStep > 1 && (
          <LadderRow
            label="Depth"
            value={DEPTH_SUMMARY[format] || 'Quick Lesson'}
            onEdit={() => setWizardStep(1)}
          />
        )}
        {wizardStep > 2 && (
          <LadderRow
            label="Format"
            value={learnMode === 'watch'
              ? 'Narrated lesson'
              : (format === 'project_quest' ? 'Read & build' : 'Read & practice')}
            onEdit={() => setWizardStep(2)}
          />
        )}

        {wizardStep === 1 && (
        <div data-tour="page-lesson" className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            How deep do you want to go?
          </h3>
          {/* Project Quest is a depth too — selecting it shows the curated
              quests right here instead of jumping to another page. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEPTH_OPTIONS.map(f => {
              const selected = format === f.key;
              const tone = DEPTH_TONES[f.tone];
              return (
                <button
                  key={f.key}
                  onClick={() => selectFormat(f.key)}
                  className={`group relative overflow-hidden p-4 rounded-2xl text-left transition-all cine-glass cine-tilt ${
                    selected ? `ring-2 ${tone.ring}` : ''
                  }`}
                  // --tilt-accent gets the SOLID colour, not `glow`. cine-tilt's
                  // hover rule mixes it at 38%, and `glow` is already rgba(...,0.5),
                  // so passing that gave ~19% — visibly fainter than Achievements,
                  // whose tints are solid hex. `glow` keeps its alpha for the
                  // selected box-shadow, where the softness is wanted.
                  style={selected
                    ? { boxShadow: `0 0 34px -6px ${tone.glow}`, '--tilt-accent': tone.solid }
                    : { '--tilt-accent': tone.solid }}
                  aria-pressed={selected}
                >
                  {selected && (
                    <span aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: tone.glow }} />
                  )}
                  {selected && (
                    <span className={`absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full text-white shadow-sm ${tone.badge}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selected ? tone.iconOn : tone.iconOff}`}>
                        <f.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{f.duration}</span>
                    </div>
                    <div className="font-bold text-ink dark:text-slate-200">{f.label}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 shadow-sm transition-all active:scale-[0.98]"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}

        {wizardStep === 2 && (
        <div data-tour="lesson-mode" className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">
            How do you want to learn?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            {[
              format === 'project_quest'
                ? { key: 'read', icon: BookOpen, label: 'Read & build', desc: 'Interactive lesson you work through step by step.' }
                : { key: 'read', icon: BookOpen, label: 'Read & practice', desc: 'Interactive, chat-driven lesson you work through.' },
              { key: 'watch', icon: PlayCircle, label: 'Narrated lesson', desc: 'Sit back and listen — slides read aloud to you.' },
            ].map((m) => {
              const selected = learnMode === m.key;
              const tone = FORMAT_TONES[m.key] || FORMAT_TONES.read;
              return (
                <button
                  key={m.key}
                  onClick={() => setLearnMode(m.key)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden p-4 rounded-2xl text-left transition-all cine-glass cine-tilt ${
                    selected ? `ring-2 ${tone.ring}` : ''
                  }`}
                  // --tilt-accent gets the SOLID colour, not `glow`. cine-tilt's
                  // hover rule mixes it at 38%, and `glow` is already rgba(...,0.5),
                  // so passing that gave ~19% — visibly fainter than Achievements,
                  // whose tints are solid hex. `glow` keeps its alpha for the
                  // selected box-shadow, where the softness is wanted.
                  style={selected
                    ? { boxShadow: `0 0 34px -6px ${tone.glow}`, '--tilt-accent': tone.solid }
                    : { '--tilt-accent': tone.solid }}
                >
                  {selected && (
                    <span aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: tone.glow }} />
                  )}
                  {selected && (
                    <span className={`absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full text-white shadow-sm ${tone.badge}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors ${selected ? tone.iconOn : tone.iconOff}`}>
                      <m.icon className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-ink dark:text-slate-200">{m.label}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {format === 'project_quest'
              ? (learnMode === 'watch'
                  ? 'Pick or type a project and we’ll generate a narrated walkthrough, read aloud to you.'
                  : 'Pick or type a project and we’ll build it with you for real, guided step by step.')
              : (learnMode === 'watch'
                  ? 'Pick a topic below and we’ll generate a short narrated lesson, read aloud to you.'
                  : 'Pick a topic below for a hands-on lesson you work through step by step.')}
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill cine-glass text-slate-600 dark:text-slate-300 font-semibold text-sm hover:opacity-80 transition-all"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setWizardStep(3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 shadow-sm transition-all active:scale-[0.98]"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}

        {wizardStep === 3 && (
        <>
        <div data-tour="lesson-topics" className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-3">
            Pick a topic
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(suggested || SUGGESTED_TOPICS).map((s, i) => {
              const selected = selectedTopic === s.topic;
              const tone = TOPIC_TONES[i % TOPIC_TONES.length];
              return (
                <button
                  key={i}
                  onClick={() => setSelectedTopic(s.topic)}
                  aria-pressed={selected}
                  className={`group relative overflow-hidden flex items-start gap-3 p-4 cine-glass cine-tilt rounded-2xl transition-all text-left ${
                    selected ? `ring-2 ${tone.ring}` : ''
                  }`}
                  // --tilt-accent gets the SOLID colour, not `glow`. cine-tilt's
                  // hover rule mixes it at 38%, and `glow` is already rgba(...,0.5),
                  // so passing that gave ~19% — visibly fainter than Achievements,
                  // whose tints are solid hex. `glow` keeps its alpha for the
                  // selected box-shadow, where the softness is wanted.
                  style={selected
                    ? { boxShadow: `0 0 34px -6px ${tone.glow}`, '--tilt-accent': tone.solid }
                    : { '--tilt-accent': tone.solid }}
                >
                  {selected && (
                    <span aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: tone.glow }} />
                  )}
                  <span className={`relative shrink-0 w-11 h-11 rounded-xl grid place-items-center border ${tone.tile}`}>
                    <TopicIcon emoji={s.emoji} />
                  </span>
                  <div className="relative flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200 mb-0.5">{s.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.topic}</div>
                  </div>
                  {selected
                    ? <span className={`relative self-center inline-flex items-center justify-center w-6 h-6 rounded-full text-white shadow-sm ${tone.badge}`}><Check className="w-4 h-4" /></span>
                    : <ChevronRight className={`relative self-center w-5 h-5 ${tone.chevron} opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-center gap-3 mt-6">
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-pill cine-glass text-slate-600 dark:text-slate-300 font-semibold text-sm hover:opacity-80 transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back
              </button>
              <button
                onClick={generateSelected}
                disabled={!selectedTopic || generating}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-pill bg-brand text-white font-semibold hover:bg-brand-600 shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating your lesson…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {learnMode === 'watch' ? 'Generate narrated lesson' : 'Generate lesson'}</>
                )}
              </button>
            </div>
            <button
              onClick={() => setSurpriseMode(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
            >
              <Zap className="w-4 h-4" />
              Or surprise me
            </button>
          </div>
        </div>

        <div className="cine-glass rounded-2xl p-6">
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

          {/* Same affordance as Discovery: click an example to load it into the
              box, then edit it. Only while the box is empty, so it never sits
              under something they're mid-way through typing. */}
          {!customTopic.trim() && !clarify && (
            <div className="mt-5">
              <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-2.5">
                Or start from one of these examples
              </h4>
              <div className="space-y-2">
                {TOPIC_EXAMPLES.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomTopic(example)}
                    className="cine-glass cine-tilt w-full text-left p-4 rounded-xl transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

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
          Suggested topics are personalized to your role and tasks · {REFRESH_LABEL}
        </p>
        </>
        )}

        {/* Unfinished lessons live at the bottom so the picker leads with new topics.
            The header bell / menu link to #paused-lessons, which scrolls here. */}
        <div id="paused-lessons" className="mt-10 scroll-mt-24">
          <PausedLessonsBox onResume={resumeEntry} />
        </div>
      </main>
      {videoTopic && (
        <VideoLessonPlayer
          topic={videoTopic}
          format={format}
          tools={tools}
          questId={videoQuestId}
          initialScript={videoResume?.script || null}
          initialScene={videoResume?.scene || 0}
          initialTime={videoResume?.time || 0}
          onProgress={handleVideoProgress}
          onComplete={handleVideoComplete}
          onClose={() => { setVideoTopic(null); setVideoQuestId(null); setVideoResume(null); setGenerating(false); }}
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
          ? 'Press enter or tap the arrow → to try a scenario based on your work — or ask a question / tell me what you\'re stuck on.'
          : 'Tap a suggestion, ask a question, or tell me what you\'re stuck on — I can help with the lesson or using your AI tool.'}
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

  // Quick Lessons, Deep Dives & Project Quests (read mode) all use the plan-driven
  // step player: Bloom objectives, one concept/activity per step (shown one at a
  // time, not a scroll), a persistent objectives header, Step X of N, required
  // interactive activities, pause/resume, and a recap. Same plan/teach/grading
  // APIs and XP across formats — only the step count scales by format.
  if (view === 'lesson' && learnMode === 'read' && (format === 'quick_tip' || format === 'standard' || format === 'deep_dive' || format === 'project_quest')) {
    return (
      <>
        <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
        <main data-tour="lesson-main" className="max-w-3xl mx-auto px-6 pt-6 pb-10">
          <PlanLessonPlayer key={`${format}__${topic}`} topic={topic} format={format} onExit={resetToPickerView} />
        </main>
      </>
    );
  }

  return (
    <>
    <PageHeader icon={BookOpen} title={FORMAT_META[format].title} subtitle={FORMAT_META[format].subtitle} />
    <main data-tour="lesson-main" className="max-w-3xl mx-auto px-6 pt-6 pb-10">

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
                <>
                  <RecapCard
                    recap={slide.recap}
                    format={format}
                    onPickAnother={resetToPickerView}
                    onDashboard={() => router.push('/')}
                  />
                  {/* Quick Tips are 60-second reads — keep a persistent way to go
                      deeper on the same topic even after the tip is finished. */}
                  {isQuickTip && (
                    <div className="mt-4 rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50/60 dark:bg-slate-800/60 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-slate-200">Want to go deeper?</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Turn this quick tip into a full, hands-on Deep Dive on the same topic.</p>
                      </div>
                      <button
                        onClick={goDeeper}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm shadow-sm hover:bg-brand-600 transition-all shrink-0"
                      >
                        <BookMarked className="w-4 h-4" /> Go deeper
                      </button>
                    </div>
                  )}
                  <CompletionFeedback
                    kind="lesson"
                    topic={topic}
                    format={format}
                    objectives={slide.recap?.keyPoints || []}
                    onFocusedLesson={startFocusedLesson}
                  />
                </>
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
  // Cinematic frame provides the top bar synchronously, so prod's
  // outside-Suspense <PageHeader> anti-flash trick isn't needed here — the
  // cinematic TopNav never goes blank on navigation.
  return (
    <CinematicFrame>
      <div className="min-h-screen">
        <Suspense fallback={<div className="max-w-4xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>}>
          <LessonContent />
        </Suspense>
      </div>
    </CinematicFrame>
  );
}
