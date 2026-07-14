'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import {
  Swords, ChevronRight, RotateCcw, Loader2, Lightbulb, Trophy,
} from 'lucide-react';
import {
  saveGameResult, getGameStats, getInProgress, saveInProgress, clearInProgress,
} from '@/lib/game-store';
import GameInstructions from '@/components/game-instructions';
import SCENARIOS from './scenarios';

const HOW_TO_PLAY = [
  `Work through ${SCENARIOS.length} real-world scenarios, one at a time.`,
  'For each, write the best prompt you would give an AI to get the job done.',
  'AI scores your prompt on clarity, specificity, and effectiveness, with tips to improve.',
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

export default function PromptBattlePage() {
  return <CinematicFrame><PromptBattle /></CinematicFrame>;
}

function PromptBattle() {
  const [started, setStarted] = useState(false);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [stats, setStats] = useState(null);
  const [showResume, setShowResume] = useState(false);

  // Check for in-progress state and load stats on mount
  useEffect(() => {
    try {
      const s = getGameStats('prompt-battle');
      if (s && s.gamesPlayed > 0) {
        setStats(s);
      }
      const progress = getInProgress('prompt-battle');
      if (progress && progress.scenarioIdx !== undefined) {
        setShowResume(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  function handleResume() {
    try {
      const progress = getInProgress('prompt-battle');
      if (progress) {
        setScenarioIdx(progress.scenarioIdx);
        setCompletedScenarios(progress.completedScenarios || []);
      }
    } catch {
      // localStorage unavailable
    }
    setShowResume(false);
    setStarted(true);
  }

  function handleStartFresh() {
    try {
      clearInProgress('prompt-battle');
    } catch {
      // localStorage unavailable
    }
    setShowResume(false);
    setScenarioIdx(0);
    setCompletedScenarios([]);
    setStarted(true);
  }

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setScores(null);
    setAnimate(false);

    const scenario = SCENARIOS[scenarioIdx];

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

      // Calculate total score for this scenario
      const scenarioScore =
        (data.clarity?.score ?? 0) +
        (data.specificity?.score ?? 0) +
        (data.effectiveness?.score ?? 0);

      const updatedCompleted = [
        ...completedScenarios,
        {
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          score: scenarioScore,
          maxScore: 15,
        },
      ];
      setCompletedScenarios(updatedCompleted);

      // Save in-progress
      try {
        saveInProgress('prompt-battle', {
          scenarioIdx,
          completedScenarios: updatedCompleted,
        });
      } catch {
        // localStorage unavailable
      }

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
    const nextIdx = scenarioIdx + 1;
    if (nextIdx >= SCENARIOS.length) {
      // All scenarios completed
      setGameOver(true);
      const totalScore = completedScenarios.reduce((sum, s) => sum + s.score, 0);
      const maxScore = completedScenarios.reduce((sum, s) => sum + (s.maxScore || 0), 0);
      try {
        saveGameResult('prompt-battle', {
          score: totalScore,
          total: maxScore,
          perScenario: completedScenarios,
        });
        clearInProgress('prompt-battle');
        const s = getGameStats('prompt-battle');
        setStats(s);
      } catch {
        // localStorage unavailable
      }
      return;
    }
    setScenarioIdx(nextIdx);
    setPrompt('');
    setScores(null);
    setAnimate(false);
    setError(null);
  }

  function handlePlayAgain() {
    setScenarioIdx(0);
    setPrompt('');
    setScores(null);
    setAnimate(false);
    setError(null);
    setCompletedScenarios([]);
    setGameOver(false);
  }

  // Game over / results screen
  if (gameOver) {
    const totalScore = completedScenarios.reduce((sum, s) => sum + s.score, 0);
    const maxTotal = completedScenarios.length * 15;
    const pct = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    return (
      <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
        <PageHeader
          icon={Swords}
          title="Prompt Battle"
          subtitle="Results"
        />
        <main className="max-w-3xl mx-auto px-6 pt-6 pb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cta-50 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-cta-600" />
            </div>
            <h2 className="text-3xl font-bold text-ink dark:text-slate-200 mb-2">
              {totalScore} / {maxTotal}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
              {pct}% across {completedScenarios.length} scenarios
            </p>

            {stats && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Best: {stats.bestScore} &middot; Played: {stats.gamesPlayed}
              </p>
            )}

            {/* Per-scenario breakdown */}
            <div className="text-left space-y-3 mb-6">
              {completedScenarios.map((s, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-200 bg-bg-subtle dark:bg-slate-700 dark:border-slate-600 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink dark:text-slate-200">{s.scenarioTitle}</span>
                    <span className="font-bold text-ink dark:text-slate-200">{s.score}/{s.maxScore}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePlayAgain}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <Link
                href="/games"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-bg-subtle dark:hover:bg-slate-700 transition-all"
              >
                All Games
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const scenario = SCENARIOS[scenarioIdx];

  return (
    <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
      <PageHeader
        icon={Swords}
        title="Prompt Battle"
        subtitle="Write the best prompt for the scenario"
      />

      <main className="max-w-3xl mx-auto px-6 pt-6 pb-8">
        {!started ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Swords className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-4">Prompt Battle</h2>

            <GameInstructions className="text-left mb-5" steps={HOW_TO_PLAY} />

            {stats && stats.gamesPlayed > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Best: {stats.bestScore} &middot; Played: {stats.gamesPlayed}
              </p>
            )}

            {showResume ? (
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleResume} className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all">
                  Resume game
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={handleStartFresh} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-bg-subtle dark:hover:bg-slate-700 transition-all">
                  Start fresh
                </button>
              </div>
            ) : (
              <button onClick={() => setStarted(true)} className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all">
                Start Game
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div className="mt-6">
              <Link href="/games" className="text-sm text-brand font-medium hover:underline">
                Back to all games
              </Link>
            </div>
          </div>
        ) : (
        <>
        <GameInstructions className="mb-4" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

        {/* Progress indicator */}
        <div className="flex items-center gap-1 mb-6">
          {SCENARIOS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < scenarioIdx
                  ? 'bg-green-500'
                  : i === scenarioIdx
                  ? 'bg-brand'
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

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
                {scenarioIdx + 1 >= SCENARIOS.length ? 'See Results' : 'Next Scenario'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && stats.gamesPlayed > 0 && !showResume && (
          <div className="text-center mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Best: {stats.bestScore} &middot; Played: {stats.gamesPlayed}
            </p>
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
        </>
        )}
      </main>
    </div>
  );
}
