'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Search, CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy,
} from 'lucide-react';
import ROUNDS from './rounds';
import GameInstructions from '@/components/game-instructions';
import { dailyPick } from '@/lib/content-day';

const HOW_TO_PLAY = [
  `Read each AI-generated response across ${ROUNDS.length} rounds.`,
  'Click every sentence you think is a hallucination — a made-up or factually wrong claim.',
  'Hit "Check my answers" to see what you caught, missed, or wrongly flagged, with explanations.',
];
import {
  saveGameResult, getGameStats, getInProgress, saveInProgress, clearInProgress,
} from '@/lib/game-store';

function getSentenceStyle(idx, flagged, revealed, isHallucination) {
  if (!revealed) {
    if (flagged) {
      return 'bg-orange-50 border-orange-300 ring-1 ring-orange-200';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50 cursor-pointer';
  }

  // revealed
  if (isHallucination && flagged) {
    return 'bg-green-50 border-green-300 ring-1 ring-green-200'; // correct catch
  }
  if (isHallucination && !flagged) {
    return 'bg-red-50 border-red-300 ring-1 ring-red-200'; // missed
  }
  if (!isHallucination && flagged) {
    return 'bg-orange-50 border-orange-300 ring-1 ring-orange-200'; // false flag
  }
  return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'; // correct skip
}

export default function HallucinationHunt() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [flagged, setFlagged] = useState(new Set());
  const [revealed, setRevealed] = useState(false);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [stats, setStats] = useState({ gamesPlayed: 0, bestScore: 0 });
  const [started, setStarted] = useState(false);
  const savedRef = useRef(false);

  // Day-stable round order that rotates at 8 AM PT, so returning players get a
  // fresh sequence each day instead of the same fixed order.
  const rounds = useMemo(() => dailyPick(ROUNDS, ROUNDS.length, 'hallucination-hunt'), []);

  const round = rounds[roundIdx];
  const hallucinationSet = new Set(round.hallucinations);

  // Load stats and check for in-progress on mount
  useEffect(() => {
    try {
      setStats(getGameStats('hallucination-hunt'));
      const progress = getInProgress('hallucination-hunt');
      if (progress) {
        setSavedProgress(progress);
        setResumeAvailable(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  function handleResume() {
    if (!savedProgress) return;
    setRoundIdx(savedProgress.roundIdx);
    setCompletedRounds(savedProgress.completedRounds || []);
    setFlagged(new Set(savedProgress.currentFlagged || []));
    setRevealed(false);
    setResumeAvailable(false);
    setSavedProgress(null);
    setStarted(true);
  }

  function handleStartFresh() {
    try {
      clearInProgress('hallucination-hunt');
    } catch {
      // localStorage not available
    }
    setRoundIdx(0);
    setFlagged(new Set());
    setRevealed(false);
    setCompletedRounds([]);
    setGameComplete(false);
    setResumeAvailable(false);
    setSavedProgress(null);
    savedRef.current = false;
    setStarted(true);
  }

  const toggleFlag = useCallback(
    (idx) => {
      if (revealed) return;
      setFlagged((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) {
          next.delete(idx);
        } else {
          next.add(idx);
        }
        return next;
      });
    },
    [revealed]
  );

  function handleCheck() {
    setRevealed(true);

    // Calculate round result
    const currentHallucinationSet = new Set(round.hallucinations);
    const caught = [...flagged].filter((i) => currentHallucinationSet.has(i)).length;
    const missed = round.hallucinations.length - caught;
    const falseFlags = [...flagged].filter((i) => !currentHallucinationSet.has(i)).length;

    const roundResult = {
      roundId: round.id,
      caught,
      missed,
      falseFlags,
      totalHallucinations: round.hallucinations.length,
    };

    const updatedCompleted = [...completedRounds, roundResult];
    setCompletedRounds(updatedCompleted);

    // Save in-progress state
    try {
      saveInProgress('hallucination-hunt', {
        roundIdx,
        completedRounds: updatedCompleted,
        currentFlagged: [...flagged],
      });
    } catch {
      // localStorage not available
    }
  }

  function handleNextRound() {
    const nextIdx = roundIdx + 1;

    if (nextIdx >= rounds.length) {
      // Game complete
      setGameComplete(true);
      return;
    }

    setRoundIdx(nextIdx);
    setFlagged(new Set());
    setRevealed(false);

    // Update in-progress
    try {
      saveInProgress('hallucination-hunt', {
        roundIdx: nextIdx,
        completedRounds,
        currentFlagged: [],
      });
    } catch {
      // localStorage not available
    }
  }

  // Save final result when game completes
  useEffect(() => {
    if (!gameComplete || savedRef.current) return;
    savedRef.current = true;
    try {
      const totalCaught = completedRounds.reduce((sum, r) => sum + r.caught, 0);
      const totalHallucinations = completedRounds.reduce((sum, r) => sum + r.totalHallucinations, 0);
      saveGameResult('hallucination-hunt', {
        score: totalCaught,
        total: totalHallucinations,
        perRound: completedRounds,
      });
      clearInProgress('hallucination-hunt');
      setStats(getGameStats('hallucination-hunt'));
    } catch {
      // localStorage not available
    }
  }, [gameComplete, completedRounds]);

  function handleReplay() {
    setFlagged(new Set());
    setRevealed(false);
  }

  function handlePlayAgain() {
    setRoundIdx(0);
    setFlagged(new Set());
    setRevealed(false);
    setCompletedRounds([]);
    setGameComplete(false);
    savedRef.current = false;
    try {
      clearInProgress('hallucination-hunt');
    } catch {
      // localStorage not available
    }
  }

  // score calculation for current round
  const caught = [...flagged].filter((i) => hallucinationSet.has(i)).length;
  const missed = round.hallucinations.length - caught;
  const falseFlags = [...flagged].filter((i) => !hallucinationSet.has(i)).length;

  // Game completion screen
  if (gameComplete) {
    const totalCaught = completedRounds.reduce((sum, r) => sum + r.caught, 0);
    const totalHallucinations = completedRounds.reduce((sum, r) => sum + r.totalHallucinations, 0);
    const pct = totalHallucinations > 0 ? Math.round((totalCaught / totalHallucinations) * 100) : 0;

    return (
      <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
        <PageHeader
          icon={Search}
          title="Hallucination Hunt"
          subtitle="Final Results"
        />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cta-50 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-cta-600" />
            </div>
            <h2 className="text-3xl font-bold text-ink dark:text-slate-200 mb-2">
              {totalCaught} / {totalHallucinations} Hallucinations Found
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">{pct}% accuracy across {rounds.length} rounds</p>

            <div className="flex items-center justify-center gap-4 mb-6 text-sm text-slate-500 dark:text-slate-400">
              <span>Best Score: <strong className="text-ink dark:text-slate-200">{stats.bestScore}/{totalHallucinations}</strong></span>
              <span className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
              <span>Games Played: <strong className="text-ink dark:text-slate-200">{stats.gamesPlayed}</strong></span>
            </div>

            {/* Per-round breakdown */}
            <div className="text-left space-y-3 mb-6">
              {completedRounds.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-sm ${
                    r.caught === r.totalHallucinations && r.falseFlags === 0
                      ? 'bg-green-50 border-green-200'
                      : r.caught > 0
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.caught === r.totalHallucinations && r.falseFlags === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="font-medium text-ink dark:text-slate-200">
                      Round {i + 1}
                    </span>
                    <span className="ml-auto text-slate-600 dark:text-slate-400">
                      {r.caught}/{r.totalHallucinations} caught
                      {r.falseFlags > 0 && `, ${r.falseFlags} false flag${r.falseFlags > 1 ? 's' : ''}`}
                    </span>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-bg-subtle dark:bg-slate-700 transition-all"
              >
                All Games
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
      <PageHeader
        icon={Search}
        title="Hallucination Hunt"
        subtitle="Find the factual errors in AI responses"
      />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {!started ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-4">Hallucination Hunt</h2>

            <GameInstructions className="text-left mb-5" steps={HOW_TO_PLAY} />

            {stats && stats.gamesPlayed > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Best: {stats.bestScore} &middot; Played: {stats.gamesPlayed}
              </p>
            )}

            {resumeAvailable && savedProgress ? (
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleResume} className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all">
                  Resume (Round {(savedProgress.roundIdx || 0) + 1} of {rounds.length})
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

        {/* Round info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              Round {roundIdx + 1} of {rounds.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-2">
            Fact-check this AI response
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{round.context}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click sentences you think are hallucinations, then check your answers.
          </p>
        </div>

        {/* Sentences */}
        <div className="space-y-2 mb-6">
          {round.sentences.map((sentence, idx) => {
            const isH = hallucinationSet.has(idx);
            const style = getSentenceStyle(idx, flagged.has(idx), revealed, isH);
            return (
              <button
                key={idx}
                onClick={() => toggleFlag(idx)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm text-ink dark:text-slate-200 transition-all ${style}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="flex-1">{sentence}</span>
                  {revealed && isH && flagged.has(idx) && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  )}
                  {revealed && isH && !flagged.has(idx) && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  {revealed && !isH && flagged.has(idx) && (
                    <XCircle className="w-5 h-5 text-orange-500 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Check / Results */}
        {!revealed && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleCheck}
              disabled={flagged.size === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check my answers
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {revealed && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="font-bold text-ink dark:text-slate-200 text-lg mb-4">Results</h3>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-700">{caught}</div>
                <div className="text-xs text-green-600">Caught</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="text-2xl font-bold text-red-700">{missed}</div>
                <div className="text-xs text-red-600">Missed</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{falseFlags}</div>
                <div className="text-xs text-orange-600">False Flags</div>
              </div>
            </div>

            {/* Explanations */}
            <div className="space-y-3">
              {round.hallucinations.map((idx) => (
                <div
                  key={idx}
                  className="p-4 bg-bg-subtle dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">
                    Sentence {idx + 1}: &ldquo;{round.sentences[idx]}&rdquo;
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {round.explanations[idx]}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleReplay}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-bg-subtle dark:bg-slate-700 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Replay Round
              </button>
              <button
                onClick={handleNextRound}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
              >
                {roundIdx + 1 >= rounds.length ? 'See Final Results' : 'Next Round'}
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
        </>
        )}
      </main>
    </div>
  );
}
