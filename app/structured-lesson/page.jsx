'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  BookOpen, ChevronRight, ChevronLeft, Check,
  Loader2, Send, Sparkles, ArrowRight,
  Eye, Pencil, GitCompare, Rocket, Brain,
} from 'lucide-react';

const STEPS = ['Read', 'Try', 'Compare', 'Ship', 'Reflect'];

const STEP_ICONS = {
  Read: Eye,
  Try: Pencil,
  Compare: GitCompare,
  Ship: Rocket,
  Reflect: Brain,
};

const TECH_NOTE =
  "cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit";

const TONE_COLORS = {
  warm: 'bg-rose-50 border-rose-200 text-rose-700',
  concise: 'bg-brand-50 border-brand-200 text-brand-700',
  playful: 'bg-amber-50 border-amber-200 text-amber-700',
};

export default function StructuredLessonPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [submission, setSubmission] = useState('');
  const [grade, setGrade] = useState(null);
  const [grading, setGrading] = useState(false);
  const [tones, setTones] = useState(null);
  const [loadingTones, setLoadingTones] = useState(false);
  const [shipChoice, setShipChoice] = useState(null);
  const [reflection, setReflection] = useState('');

  const step = STEPS[stepIdx];

  useEffect(() => {
    if (stepIdx >= 2 && !tones && !loadingTones) {
      setLoadingTones(true);
      fetch('/api/lesson/tones')
        .then(r => r.json())
        .then(d => setTones(d.tones))
        .catch(() => setTones([]))
        .finally(() => setLoadingTones(false));
    }
  }, [stepIdx, tones, loadingTones]);

  async function submitForGrade() {
    if (!submission.trim()) return;
    setGrading(true);
    try {
      const res = await fetch('/api/lesson/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: submission }),
      });
      const data = await res.json();
      setGrade(data);
    } catch (error) {
      console.error('Grading error:', error);
    } finally {
      setGrading(false);
    }
  }

  function goNext() {
    setStepIdx(prev => Math.min(STEPS.length - 1, prev + 1));
  }
  function goBack() {
    setStepIdx(prev => Math.max(0, prev - 1));
  }

  const progressPercent = (stepIdx / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={BookOpen}
        title="Structured Lesson"
        subtitle="Writing better customer follow-ups with AI"
      />

      {/* Step indicator */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, i) => {
              const Icon = STEP_ICONS[s];
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand text-white'
                      : isDone
                      ? 'bg-green-50 text-green-700'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {isDone ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{s}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full ${
                      isDone ? 'bg-green-300' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div key={stepIdx} className="animate-fade-in">
          {step === 'Read' && <ReadStep onNext={goNext} />}
          {step === 'Try' && (
            <TryStep
              submission={submission}
              setSubmission={setSubmission}
              grade={grade}
              grading={grading}
              onSubmit={submitForGrade}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 'Compare' && (
            <CompareStep
              userMessage={submission}
              tones={tones}
              loading={loadingTones}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 'Ship' && (
            <ShipStep
              tones={tones || []}
              userMessage={submission}
              choice={shipChoice}
              setChoice={setShipChoice}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 'Reflect' && (
            <ReflectStep
              reflection={reflection}
              setReflection={setReflection}
              grade={grade}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ReadStep({ onNext }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wide mb-4">
          <Eye className="w-3.5 h-3.5" /> Step 1: Read
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-4">
          Turn a messy tech note into a customer message
        </h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          Home service technicians write quick shorthand notes after every job. These notes are
          accurate but not customer-friendly. Your job: rewrite this note into a message the
          customer would actually want to read.
        </p>

        <div className="bg-slate-900 rounded-xl p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Technician's note
          </p>
          <p className="text-slate-100 font-mono text-sm leading-relaxed">
            {TECH_NOTE}
          </p>
        </div>

        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-brand-800 mb-1">What makes a good rewrite?</p>
          <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>Explain what you found and what you did (no jargon)</li>
            <li>Mention the recommended next step</li>
            <li>Keep it friendly and brief (2-3 sentences)</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 transition-all"
        >
          I've read it — let me try
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TryStep({ submission, setSubmission, grade, grading, onSubmit, onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-cta-50 text-cta-700 text-xs font-bold uppercase tracking-wide mb-4">
          <Pencil className="w-3.5 h-3.5" /> Step 2: Try
        </div>
        <h2 className="text-xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          Write your customer message
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Rewrite the technician's note as a friendly message to the customer (Mrs. Henderson).
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
          {TECH_NOTE}
        </div>

        <textarea
          value={submission}
          onChange={e => setSubmission(e.target.value)}
          placeholder="Hi Mrs. Henderson..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm leading-relaxed resize-none"
        />

        {!grade && (
          <div className="flex justify-end mt-3">
            <button
              onClick={onSubmit}
              disabled={!submission.trim() || grading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {grading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Grading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for feedback
                </>
              )}
            </button>
          </div>
        )}

        {grade && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <ScoreRing score={grade.score} />
              <div>
                <p className="text-lg font-bold text-ink dark:text-slate-200">{grade.score}/100</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {grade.score >= 80 ? 'Excellent work!' :
                   grade.score >= 60 ? 'Good start — room to improve.' :
                   'Keep practicing — you\'ll get there.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Strength</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{grade.strength}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">To improve</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{grade.improvement}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {grade && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
          >
            See AI versions
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function CompareStep({ userMessage, tones, loading, onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide mb-4">
          <GitCompare className="w-3.5 h-3.5" /> Step 3: Compare
        </div>
        <h2 className="text-xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          Compare your version with AI alternatives
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Here's what AI wrote in three different tones. Notice how the same information lands differently.
        </p>

        {/* User's version */}
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Your version</p>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{userMessage}</p>
          </div>
        </div>

        {/* AI versions */}
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Generating AI versions...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {(tones || []).map((tone, i) => (
              <div key={i} className={`rounded-xl border p-4 ${TONE_COLORS[tone.tone] || 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 opacity-80">
                  {tone.tone}
                </p>
                <p className="text-sm text-ink dark:text-slate-200 leading-relaxed mb-2">{tone.message}</p>
                <p className="text-xs opacity-70 italic">{tone.whyItWorks}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
        >
          Pick one to ship
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ShipStep({ tones, userMessage, choice, setChoice, onNext, onBack }) {
  const options = [
    { id: 'mine', label: 'My version', message: userMessage },
    ...tones.map(t => ({ id: t.tone, label: `AI — ${t.tone}`, message: t.message })),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wide mb-4">
          <Rocket className="w-3.5 h-3.5" /> Step 4: Ship
        </div>
        <h2 className="text-xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          Which version would you actually send?
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Pick the one that feels right for this customer. There's no wrong answer — the goal is to think about why.
        </p>

        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setChoice(opt.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                choice === opt.id
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                choice === opt.id ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {opt.label}
              </p>
              <p className="text-sm leading-relaxed">{opt.message}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!choice}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
        >
          Reflect & finish
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ReflectStep({ reflection, setReflection, grade }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide mb-4">
          <Brain className="w-3.5 h-3.5" /> Step 5: Reflect
        </div>
        <h2 className="text-xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          What did you take away?
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          One sentence is enough. What will you do differently next time you write a customer message?
        </p>

        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="Next time I'll..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm leading-relaxed resize-none mb-6"
        />

        {/* Summary */}
        <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-brand" />
            <span className="text-sm font-bold text-ink dark:text-slate-200">Lesson Complete</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand">{grade?.score || '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand">50</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">XP Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand">5m</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Time Spent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
        >
          Back to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
    </div>
  );
}
