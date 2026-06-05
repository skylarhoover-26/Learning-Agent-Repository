'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Swords, ChevronRight, RotateCcw, Loader2, Lightbulb,
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 1,
    department: 'Customer Success',
    title: 'Summarize a customer complaint email',
    context:
      'You received a long, emotional email from a customer about a billing issue, a missed appointment, and poor communication. You need a concise summary for your team lead.',
    task: 'Write a prompt that would get an AI to produce a clear, actionable summary of the complaint email.',
  },
  {
    id: 2,
    department: 'People / HR',
    title: 'Draft a job posting for a new role',
    context:
      'Your team is hiring a Senior Customer Success Manager. The role requires 3+ years in SaaS, strong communication skills, and CRM experience. The posting should feel welcoming and inclusive.',
    task: 'Write a prompt that would get an AI to draft a compelling, inclusive job posting.',
  },
  {
    id: 3,
    department: 'Sales',
    title: 'Analyze quarterly sales data',
    context:
      'You have Q1 sales numbers across 4 regions. Revenue is up 12% overall, but the West region dropped 8%. Leadership wants to understand why and what to do.',
    task: 'Write a prompt that would get an AI to analyze this data and surface insights for leadership.',
  },
  {
    id: 4,
    department: 'Enablement',
    title: 'Create a training outline for a new feature',
    context:
      'Your company just launched an AI-powered scheduling feature. You need to train 200+ field service pros on how to use it. Many are not tech-savvy.',
    task: 'Write a prompt that would get an AI to create a clear, practical training outline.',
  },
  {
    id: 5,
    department: 'Operations',
    title: 'Write a project status update for leadership',
    context:
      'You are managing a CRM migration. It is 60% complete, 1 week behind schedule due to a data mapping issue (now resolved). Two milestones are coming up next week.',
    task: 'Write a prompt that would get an AI to draft a concise, professional status update for the exec team.',
  },
];

function ScoreBar({ label, score, feedback, animate }) {
  const pct = (score / 5) * 100;
  const barColor =
    score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-cta' : 'bg-orange-500';

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-ink dark:text-slate-200">{label}</span>
        <span className="text-sm font-bold text-ink dark:text-slate-200">{score}/5</span>
      </div>
      <div className="h-3 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
          style={{ width: animate ? `${pct}%` : '0%' }}
        />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">{feedback}</p>
    </div>
  );
}

export default function PromptBattle() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animate, setAnimate] = useState(false);

  const scenario = SCENARIOS[scenarioIdx];

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setScores(null);
    setAnimate(false);

    try {
      const res = await fetch('/api/games/score-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: `${scenario.title}: ${scenario.context} ${scenario.task}`,
          prompt: prompt.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to score prompt');
      }

      const data = await res.json();
      setScores(data);

      // trigger bar animation after a small delay
      setTimeout(() => setAnimate(true), 100);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTryAgain() {
    setPrompt('');
    setScores(null);
    setAnimate(false);
    setError(null);
  }

  function handleNextScenario() {
    setScenarioIdx((prev) => (prev + 1) % SCENARIOS.length);
    setPrompt('');
    setScores(null);
    setAnimate(false);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
      <PageHeader
        icon={Swords}
        title="Prompt Battle"
        subtitle="Write the best prompt for the scenario"
      />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Scenario card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              {scenario.department}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Scenario {scenarioIdx + 1} of {SCENARIOS.length}
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">{scenario.title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-3">{scenario.context}</p>
          <p className="text-sm font-medium text-ink dark:text-slate-200">{scenario.task}</p>
        </div>

        {/* Prompt input */}
        {!scores && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <label
              htmlFor="user-prompt"
              className="block text-sm font-semibold text-ink dark:text-slate-200 mb-2"
            >
              Your prompt
            </label>
            <textarea
              id="user-prompt"
              className="w-full h-36 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-ink dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
              placeholder="Type the prompt you would give to an AI..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scoring...
                  </>
                ) : (
                  <>
                    Submit
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Scores */}
        {scores && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-ink dark:text-slate-200 text-lg mb-4">Your Scores</h3>

            <ScoreBar
              label="Clarity"
              score={scores.clarity?.score ?? 0}
              feedback={scores.clarity?.feedback ?? ''}
              animate={animate}
            />
            <ScoreBar
              label="Specificity"
              score={scores.specificity?.score ?? 0}
              feedback={scores.specificity?.feedback ?? ''}
              animate={animate}
            />
            <ScoreBar
              label="Effectiveness"
              score={scores.effectiveness?.score ?? 0}
              feedback={scores.effectiveness?.feedback ?? ''}
              animate={animate}
            />

            {scores.overallTip && (
              <div className="mt-4 p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <p className="text-sm text-ink dark:text-slate-200">{scores.overallTip}</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleTryAgain}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-bg-subtle dark:bg-slate-700 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleNextScenario}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
              >
                Next Scenario
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/games"
            className="text-sm text-brand font-medium hover:underline"
          >
            Back to all games
          </Link>
        </div>
      </main>
    </div>
  );
}
