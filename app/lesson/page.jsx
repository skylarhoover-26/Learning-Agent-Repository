'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { SlideCard, RecapCard } from '@/components/lesson-slide';
import {
  BookOpen, ChevronRight, ChevronLeft, Zap, BookMarked, Trophy,
  Loader2, Send,
} from 'lucide-react';

const SUGGESTED_TOPICS = [
  { label: '🎯 Prompt Basics', topic: 'How to write clear, specific prompts that get useful results' },
  { label: '📧 AI for Email', topic: 'Using AI to draft, reply to, and summarize emails faster' },
  { label: '📊 Data Summaries', topic: 'Turning raw data and notes into executive-ready summaries' },
  { label: '🤖 What Are AI Agents?', topic: 'Understanding AI agents and how they can automate multi-step workflows' },
  { label: '✅ Verifying AI Output', topic: 'How to fact-check and validate AI-generated content before using it' },
  { label: '💬 Better Conversations', topic: 'How to have productive back-and-forth conversations with AI assistants' },
];

function LessonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get('topic');

  const [view, setView] = useState(initialTopic ? 'lesson' : 'picker');
  const [topic, setTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState('');
  const [format, setFormat] = useState('standard');

  // Lesson state
  const [slides, setSlides] = useState([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userInput, setUserInput] = useState('');
  const slideRef = useRef(null);

  // Auto-scroll to slide card on slide change
  useEffect(() => {
    if (slideRef.current) {
      slideRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentSlideIdx]);

  // If we arrive with a topic from URL, kick off the lesson
  const hasStarted = useRef(false);
  useEffect(() => {
    if (initialTopic && !hasStarted.current && slides.length === 0) {
      hasStarted.current = true;
      fetchStartLesson(initialTopic);
    }
  }, [initialTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStartLesson(t) {
    setIsLoading(true);
    setError(null);
    setSlides([]);
    setCurrentSlideIdx(0);
    setMessages([]);

    try {
      const res = await fetch('/api/lesson/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start lesson');

      const { messages: newMessages, ...slide } = data;
      setSlides([slide]);
      setMessages(newMessages);
      setCurrentSlideIdx(0);
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

  async function continueLesson(input) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleButtonClick(btn) {
    continueLesson(`[I clicked: ${btn.action}]`);
  }

  function handleSubmitInput(e) {
    e.preventDefault();
    const text = userInput.trim();
    if (!text || isLoading) return;
    setUserInput('');
    continueLesson(text);
  }

  function resetToPickerView() {
    setView('picker');
    setTopic('');
    setSlides([]);
    setMessages([]);
    setCurrentSlideIdx(0);
    setError(null);
  }

  if (view === 'picker') {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-ink mb-2">What do you want to learn?</h2>
          <p className="text-slate-600">Pick from popular topics or type your own.</p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-3 font-semibold">
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
                onClick={() => setFormat(f.key)}
                className={`group p-4 rounded-xl border text-left transition-all ${
                  format === f.key
                    ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-100 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-brand-200 hover:shadow-card'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    format === f.key ? 'bg-brand text-white' : 'bg-bg-subtle text-slate-600'
                  }`}>
                    <f.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{f.duration}</span>
                </div>
                <div className="font-bold text-ink">{f.label}</div>
                <p className="text-xs text-slate-600 mt-0.5">{f.desc}</p>
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
          <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-3 font-semibold">
            Suggested for you
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTED_TOPICS.map((s, i) => (
              <button
                key={i}
                onClick={() => startLesson(s.topic)}
                className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all text-left"
              >
                <span className="text-2xl">{s.label.split(' ')[0]}</span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 mb-0.5">{s.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{s.topic}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-3 font-semibold">
            Or type your own
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customTopic.trim()) startLesson(customTopic.trim()); }}
              placeholder="e.g., 'how to use AI for budget forecasting'"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
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
    );
  }

  // --- Lesson view ---
  const currentSlide = slides[currentSlideIdx];
  const isComplete = currentSlide?.phase === 'complete' && currentSlide?.recap;
  const isOnLatestSlide = currentSlideIdx === slides.length - 1;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      {/* Slide progress dots */}
      {slides.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIdx(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentSlideIdx
                  ? 'bg-brand scale-125'
                  : idx < currentSlideIdx
                    ? 'bg-brand-200'
                    : 'bg-slate-200'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
          {isLoading && (
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 animate-pulse" />
          )}
        </div>
      )}

      {/* Back/Next navigation */}
      {slides.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentSlideIdx((i) => Math.max(0, i - 1))}
            disabled={currentSlideIdx === 0}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-xs text-slate-400 font-medium">
            {currentSlideIdx + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
            disabled={currentSlideIdx === slides.length - 1}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && slides.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Generating your lesson...</p>
          <p className="text-sm text-slate-400 mt-1">{topic}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
          <p className="text-red-700 text-sm font-medium">{error}</p>
          <button
            onClick={() => fetchStartLesson(topic)}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Slide content */}
      <div ref={slideRef}>
        {currentSlide && !isComplete && (
          <SlideCard
            slide={currentSlide}
            onButtonClick={handleButtonClick}
            isLatest={isOnLatestSlide && !isLoading}
          />
        )}

        {isComplete && (
          <RecapCard
            recap={currentSlide.recap}
            onPickAnother={resetToPickerView}
            onDashboard={() => router.push('/')}
          />
        )}
      </div>

      {/* Loading indicator for continuation */}
      {isLoading && slides.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      )}

      {/* Free-text input */}
      {slides.length > 0 && !isComplete && (
        <form onSubmit={handleSubmitInput} className="mt-4 flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a question or response..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || isLoading}
            className="px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Back to topic picker (non-complete state) */}
      {slides.length > 0 && !isComplete && (
        <div className="mt-6 text-center">
          <button
            onClick={resetToPickerView}
            className="text-sm text-slate-400 hover:text-slate-600 transition-all"
          >
            Exit lesson
          </button>
        </div>
      )}
    </main>
  );
}

export default function LessonPage() {
  return (
    <div className="min-h-screen">
      <PageHeader icon={BookOpen} title="Quick Lesson" subtitle="Pick a topic — 3-5 minute hands-on lesson" />
      <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-10 text-center text-slate-500">Loading...</div>}>
        <LessonContent />
      </Suspense>
    </div>
  );
}
