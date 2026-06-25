'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import {
  getScores, saveScores,
  SCORE_LABELS, DIMENSION_LABELS, getOverallLevel,
} from '@/lib/scoring-store';
import {
  RefreshCw, ChevronRight, ChevronLeft, Check,
  Loader2, User, Users, Building2, Brain,
  ArrowRight, TrendingUp, ArrowDown, Minus,
} from 'lucide-react';

const DIMENSION_ICONS = {
  personal: User,
  team: Users,
  org: Building2,
  development: Brain,
};

const CHECKIN_QUESTIONS = [
  {
    dimension: 'personal',
    question: 'Since your last check-in, has the way you use AI in your own work changed?',
    options: [
      { label: 'Not much — about the same as before', value: 'A', delta: 0 },
      { label: "Yes — I'm using it more consistently now", value: 'B', delta: 1 },
      { label: "Yes — I'm using it for things I wasn't doing before", value: 'C', delta: 1 },
      { label: "Yes — I've delivered something I can point to as a real AI-driven outcome", value: 'D', delta: null },
    ],
    followUp: {
      trigger: 'D',
      question: 'Describe the outcome you delivered with AI.',
      scoringDimension: 'personal',
    },
  },
  {
    dimension: 'team',
    question: 'Has anything changed in how AI is used across your team?',
    options: [
      { label: 'Not really — still mostly individual', value: 'A', delta: 0 },
      { label: "Yes — I've shared more or helped a colleague apply AI", value: 'B', delta: 1 },
      { label: "Yes — there's now a more consistent approach on my team and I helped create it", value: 'C', delta: 2 },
    ],
  },
  {
    dimension: 'blocker',
    question: "What's been getting in the way of using AI more?",
    conditional: true,
    options: [
      { label: "Too busy — haven't had time to focus on it", value: 'A' },
      { label: 'Not sure how to apply it to my actual work', value: 'B' },
      { label: "I've been using it the same amount, just not leveling up", value: 'C' },
      { label: 'Something else', value: 'D' },
    ],
  },
];

export default function CheckInPage() {
  return <CinematicFrame><CheckInPageInner /></CinematicFrame>;
}

function CheckInPageInner() {
  const router = useRouter();
  const [previousScores, setPreviousScores] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [newScores, setNewScores] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [noImprovement, setNoImprovement] = useState(false);

  useEffect(() => {
    const existing = getScores();
    if (existing) {
      setPreviousScores(existing);
    }
  }, []);

  const visibleQuestions = CHECKIN_QUESTIONS.filter(q => {
    if (q.conditional && q.dimension === 'blocker') {
      return noImprovement;
    }
    return true;
  });

  const currentQuestion = visibleQuestions[step];
  const totalSteps = visibleQuestions.length;

  function handleOptionSelect(option) {
    const { dimension, followUp } = currentQuestion;

    if (followUp && option.value === followUp.trigger) {
      setShowFollowUp(true);
      return;
    }

    setAnswers(prev => ({ ...prev, [dimension]: option }));

    if (dimension === 'personal' && option.delta === 0) {
      setNoImprovement(true);
    }
    if (dimension === 'team' && option.delta === 0 && answers.personal?.delta === 0) {
      setNoImprovement(true);
    }

    advanceStep();
  }

  async function handleFollowUpSubmit() {
    if (!followUpText.trim()) return;
    setIsScoring(true);

    try {
      const { dimension, followUp } = currentQuestion;
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: followUp.scoringDimension,
          text: followUpText.trim(),
        }),
      });
      const data = await res.json();
      const score = data.score || 4;

      setAnswers(prev => ({
        ...prev,
        [dimension]: { value: 'D', delta: score - (previousScores?.[dimension] || 3) },
        [`${dimension}_score_override`]: score,
      }));
      setShowFollowUp(false);
      setFollowUpText('');
      advanceStep();
    } catch {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.dimension]: { value: 'D', delta: 1 },
      }));
      setShowFollowUp(false);
      setFollowUpText('');
      advanceStep();
    } finally {
      setIsScoring(false);
    }
  }

  function advanceStep() {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
    } else {
      finishCheckIn();
    }
  }

  function finishCheckIn() {
    const prev = previousScores || { personal: 2, team: 2, org: 2, development: 2 };
    const updated = { ...prev };

    for (const dim of ['personal', 'team']) {
      const answer = answers[dim];
      const override = answers[`${dim}_score_override`];
      if (override) {
        updated[dim] = override;
      } else if (answer?.delta) {
        updated[dim] = Math.min(5, (prev[dim] || 2) + answer.delta);
      }
    }

    saveScores(updated);
    setNewScores(updated);
    setCompleted(true);
  }

  function goBack() {
    if (showFollowUp) {
      setShowFollowUp(false);
      setFollowUpText('');
      return;
    }
    if (step > 0) setStep(prev => prev - 1);
  }

  if (!previousScores) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader
          icon={RefreshCw}
          title="6-Week Check-In"
          subtitle="Track your AI progress over time"
        />
        <main className="max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10">
            <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">No previous scores found</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Complete the AI Impact Assessment first so we have a baseline to compare against.
            </p>
            <button
              onClick={() => router.push('/scoring')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              Take the Assessment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (completed && newScores) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader
          icon={RefreshCw}
          title="6-Week Check-In"
          subtitle="Your updated scores"
        />
        <main className="max-w-2xl mx-auto px-6 py-10">
          <CheckInResults previous={previousScores} current={newScores} />
          <div className="flex justify-center mt-8">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              Back to home
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={RefreshCw}
        title="6-Week Check-In"
        subtitle="Quick progress update — takes ~2 minutes"
      />

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Question {step + 1} of {totalSteps}
            </p>
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div key={`${step}-${showFollowUp}`} className="animate-fade-in">
          {!showFollowUp ? (
            <QuestionCard question={currentQuestion} onSelect={handleOptionSelect} />
          ) : (
            <div className="max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-ink dark:text-slate-200 tracking-tight mb-4 text-center">
                {currentQuestion.followUp.question}
              </h2>
              <textarea
                value={followUpText}
                onChange={e => setFollowUpText(e.target.value)}
                placeholder="Describe what you accomplished..."
                rows={4}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm leading-relaxed resize-none"
              />
              <div className="text-center mt-6">
                <button
                  onClick={handleFollowUpSubmit}
                  disabled={!followUpText.trim() || isScoring}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 transition-all"
                >
                  {isScoring ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuestionCard({ question, onSelect }) {
  const Icon = DIMENSION_ICONS[question.dimension] || RefreshCw;
  const label = DIMENSION_LABELS[question.dimension] || 'Check-In';

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium mb-4">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">
          {question.question}
        </h2>
      </div>
      <div className="space-y-3 max-w-lg mx-auto">
        {question.options.map(option => (
          <button
            key={option.value}
            onClick={() => onSelect(option)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50"
          >
            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand font-bold text-sm flex items-center justify-center shrink-0">
              {option.value}
            </span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckInResults({ previous, current }) {
  const dimensions = ['personal', 'team', 'org', 'development'];
  const anyImproved = dimensions.some(d => (current[d] || 0) > (previous[d] || 0));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
            {anyImproved ? 'Nice growth since last time!' : "Your scores haven't changed — that's okay."}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {anyImproved
              ? 'Keep building on the momentum.'
              : 'Focus on completing the next module in your learning path.'}
          </p>
        </div>

        <div className="space-y-4">
          {dimensions.map(dim => {
            const prev = previous[dim] || 0;
            const curr = current[dim] || 0;
            const delta = curr - prev;
            const Icon = DIMENSION_ICONS[dim];
            const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? ArrowDown : Minus;

            return (
              <div
                key={dim}
                className="flex items-center gap-4 p-4 rounded-xl bg-bg-warm dark:bg-slate-900 border border-slate-100"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink dark:text-slate-200">
                      {DIMENSION_LABELS[dim]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{prev}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-ink dark:text-slate-200">{curr}</span>
                    {delta !== 0 && (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                        delta > 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        <DeltaIcon className="w-3 h-3" />
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{SCORE_LABELS[curr] || ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
