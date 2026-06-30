'use client';

import { useState, useEffect } from 'react';
import {
  getScores, saveScores,
  SCORE_LABELS, DIMENSION_LABELS, getOverallLevel,
} from '@/lib/scoring-store';
import {
  ChevronRight, ChevronLeft, Loader2, User, Users, Building2, Brain, RotateCcw,
} from 'lucide-react';

const DIMENSION_ICONS = {
  personal: User,
  team: Users,
  org: Building2,
  development: Brain,
};

const QUESTIONS = [
  {
    dimension: 'personal',
    question: 'Which of these best describes how AI affects your day-to-day output?',
    options: [
      { label: "I haven't really used AI in a meaningful way yet", value: 'A', score: 1 },
      { label: "I've tried a few things, but it hasn't changed how I work", value: 'B', score: 2 },
      { label: 'I use AI for specific tasks and it\'s saving me real time or improving quality', value: 'C', score: 3 },
      { label: 'AI has genuinely changed what I can produce — my work is noticeably better or faster', value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: 'Can you give me a quick example of how AI has changed what you produce or deliver?',
      scoringDimension: 'personal',
    },
  },
  {
    dimension: 'team',
    question: 'Which best describes what\'s happening on your team with AI?',
    options: [
      { label: "People are mostly figuring it out on their own — there's no shared approach", value: 'A', score: 1 },
      { label: "A few of us use AI, but we don't really talk about it or share what's working", value: 'B', score: 2 },
      { label: 'I sometimes share what I\'ve learned and help colleagues try things out', value: 'C', score: 3 },
      { label: 'I actively coach my team on AI — it\'s something I intentionally bring into our work', value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: "What's a recent example of you helping someone on your team use AI more effectively?",
      scoringDimension: 'team',
    },
  },
  {
    dimension: 'org',
    question: 'Can you connect your AI usage to any team goals or broader business outcomes?',
    options: [
      { label: "Not really — I use AI, but I haven't thought about it in terms of goals", value: 'A', score: 1 },
      { label: "Loosely — some of what I do with AI relates to our goals, but I can't point to clear results", value: 'B', score: 2 },
      { label: "Yes — I can point to specific ways AI has helped us move faster or deliver better", value: 'C', score: 3 },
      { label: "Definitely — I've built or shared AI practices that others now use, and I can show the impact", value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: "What's an example of AI helping you connect to team goals or broader business outcomes?",
      scoringDimension: 'org',
    },
  },
  {
    dimension: 'development',
    question: 'When it comes to understanding and experimenting with AI — which feels most like you?',
    options: [
      { label: "I know the basics, but I'm still learning what's out there", value: 'A', score: 2 },
      { label: "I use a handful of tools comfortably — I'm consistent but not experimenting much", value: 'B', score: 3 },
      { label: 'I actively try new things and can adapt AI tools to different situations', value: 'C', score: 4 },
      { label: 'I go deep — I understand how models work, I experiment with new techniques, and others come to me for guidance', value: 'D', score: 5 },
    ],
  },
];

// The AI Impact self-assessment behind the "My Impact" page. Still writes
// ai_impact_scores via saveScores, which the manager dashboard reads. If a
// profile already exists, we show it with a Retake option instead of forcing
// the wizard.
export default function AiImpactPanel() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [followUpText, setFollowUpText] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scores, setScores] = useState({});
  const [completed, setCompleted] = useState(false);
  const [existingScores, setExistingScores] = useState(null);

  useEffect(() => {
    const existing = getScores();
    if (existing) setExistingScores(existing);
  }, []);

  const currentQuestion = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const progressPercent = (step / totalSteps) * 100;

  function startAssessment() {
    setStarted(true);
    setStep(0);
    setAnswers({});
    setScores({});
    setShowFollowUp(false);
    setFollowUpText('');
    setCompleted(false);
  }

  function handleOptionSelect(option) {
    const { dimension, followUp } = currentQuestion;
    if (followUp && option.value === followUp.trigger) {
      setShowFollowUp(true);
      return;
    }
    setAnswers(prev => ({ ...prev, [dimension]: option.value }));
    setScores(prev => ({ ...prev, [dimension]: option.score }));
    advanceStep({ ...scores, [dimension]: option.score });
  }

  async function handleFollowUpSubmit() {
    if (!followUpText.trim()) return;
    setIsScoring(true);
    try {
      const { dimension, followUp } = currentQuestion;
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimension: followUp.scoringDimension, text: followUpText.trim() }),
      });
      const data = await res.json();
      const score = data.score || 3;
      setAnswers(prev => ({ ...prev, [dimension]: 'D' }));
      setScores(prev => ({ ...prev, [dimension]: score }));
      setShowFollowUp(false);
      setFollowUpText('');
      advanceStep({ ...scores, [dimension]: score });
    } catch (error) {
      console.error('Scoring error:', error);
      const fallback = { ...scores, [currentQuestion.dimension]: 3 };
      setScores(fallback);
      setShowFollowUp(false);
      setFollowUpText('');
      advanceStep(fallback);
    } finally {
      setIsScoring(false);
    }
  }

  function advanceStep(finalScores) {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
    } else {
      saveScores(finalScores);
      setExistingScores(finalScores);
      setCompleted(true);
    }
  }

  function goBack() {
    if (showFollowUp) {
      setShowFollowUp(false);
      setFollowUpText('');
      return;
    }
    if (step > 0) setStep(prev => prev - 1);
  }

  // Resting state: not in the wizard. Show existing results (with Retake) or an
  // intro to start the assessment.
  if (!started || completed) {
    return (
      <div>
        {existingScores ? (
          <>
            <ResultsCard scores={existingScores} previousScores={completed ? null : null} />
            <div className="flex justify-center mt-6">
              <button
                onClick={startAssessment}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Retake assessment
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8 text-center">
            <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">Measure your AI impact</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              A quick 4-question self-assessment across Personal, Team, Org, and AI Development. Your scores power your profile and your manager&apos;s team view.
            </p>
            <button
              onClick={startAssessment}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              Start the assessment <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Wizard.
  return (
    <div>
      <div className="mb-6">
        <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-brand rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">Question {step + 1} of {totalSteps}</p>
          {step > 0 && (
            <button onClick={goBack} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors">
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
          )}
        </div>
      </div>

      <div key={`${step}-${showFollowUp}`} className="animate-fade-in">
        {!showFollowUp ? (
          <QuestionCard question={currentQuestion} onSelect={handleOptionSelect} />
        ) : (
          <FollowUpCard
            question={currentQuestion.followUp.question}
            text={followUpText}
            onTextChange={setFollowUpText}
            onSubmit={handleFollowUpSubmit}
            isScoring={isScoring}
          />
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, onSelect }) {
  const Icon = DIMENSION_ICONS[question.dimension];
  const label = DIMENSION_LABELS[question.dimension];
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium mb-4">
          <Icon className="w-4 h-4" /> {label}
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">{question.question}</h2>
      </div>
      <div className="space-y-3 max-w-lg mx-auto">
        {question.options.map(option => (
          <button
            key={option.value}
            onClick={() => onSelect(option)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50"
          >
            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand font-bold text-sm flex items-center justify-center shrink-0">{option.value}</span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowUpCard({ question, text, onTextChange, onSubmit, isScoring }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">{question}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">The more specific you are, the more accurate your score will be.</p>
      </div>
      <textarea
        value={text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="Describe what you've done..."
        rows={4}
        autoFocus
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm leading-relaxed resize-none"
      />
      <div className="text-center mt-6">
        <button
          onClick={onSubmit}
          disabled={!text.trim() || isScoring}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isScoring ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>) : (<>Continue <ChevronRight className="w-4 h-4" /></>)}
        </button>
      </div>
    </div>
  );
}

function ResultsCard({ scores, previousScores }) {
  const overall = getOverallLevel(scores);
  const dimensions = ['personal', 'team', 'org', 'development'];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-3">Your AI Impact Profile</h2>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-bold ${overall.color}`}>
            Overall: {overall.level} Impact
          </span>
        </div>
        <div className="space-y-4">
          {dimensions.map(dim => {
            const score = scores[dim] || 0;
            const label = SCORE_LABELS[score] || 'Not Assessed';
            const Icon = DIMENSION_ICONS[dim];
            const prev = previousScores?.[dim];
            const delta = prev ? score - prev : null;
            return (
              <div key={dim} className="flex items-center gap-4 p-4 rounded-xl bg-bg-warm dark:bg-slate-900 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink dark:text-slate-200">{DIMENSION_LABELS[dim]}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={`text-xs font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>{delta > 0 ? '+' : ''}{delta}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-ink dark:text-slate-200 w-6 text-right">{score}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
