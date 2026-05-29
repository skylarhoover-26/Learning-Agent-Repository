'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  BookOpen, ChevronRight, Zap, BookMarked, Trophy,
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
  const initialTopic = searchParams.get('topic');

  const [view, setView] = useState(initialTopic ? 'lesson' : 'picker');
  const [topic, setTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState('');
  const [format, setFormat] = useState('standard');

  function startLesson(t) {
    setTopic(t);
    setView('lesson');
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

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="text-5xl mb-4">🎓</div>
        <h2 className="text-2xl font-bold text-ink mb-3">{topic}</h2>
        <p className="text-slate-600 mb-6">
          This lesson will be powered by AI once we connect the Claude API.
          You'll get an interactive, slide-based walkthrough with exercises and quizzes.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setView('picker'); setTopic(''); }}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium transition-all"
          >
            Pick another topic
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
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
