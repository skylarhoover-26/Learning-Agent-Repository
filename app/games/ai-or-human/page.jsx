'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import {
  Eye, Check, X, ChevronRight, Trophy, Bot, User, RotateCcw,
} from 'lucide-react';
import { saveGameResult, getGameStats } from '@/lib/game-store';
import GameInstructions from '@/components/game-instructions';
import ALL_CONTENT from './content';

const ITEMS_PER_GAME = 10;

const HOW_TO_PLAY = [
  'You will see 10 short passages — customer emails, product descriptions, meeting notes, and more.',
  'For each one, decide whether it was written by AI or by a human.',
  'You will get instant feedback and a short explanation after every choice.',
];

function shuffleAndPick(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function AiOrHumanPage() {
  return <CinematicFrame><AiOrHuman /></CinematicFrame>;
}

function AiOrHuman() {
  const [content, setContent] = useState(() =>
    shuffleAndPick(ALL_CONTENT, ITEMS_PER_GAME)
  );
  const [contentIdx, setContentIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [stats, setStats] = useState(null);
  const advanceRef = useRef(null);

  useEffect(() => {
    try {
      const s = getGameStats('ai-or-human');
      if (s && s.gamesPlayed > 0) {
        setStats(s);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const advanceToNext = useCallback(() => {
    if (contentIdx + 1 >= content.length) {
      setGameOver(true);
      return;
    }
    setContentIdx((prev) => prev + 1);
    setSelected(null);
    setShowAnswer(false);
  }, [contentIdx, content.length]);

  useEffect(() => {
    if (!showAnswer) return;
    advanceRef.current = setTimeout(() => {
      advanceToNext();
    }, 2500);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [showAnswer, advanceToNext]);

  function handleSelect(choice) {
    if (selected !== null || gameOver) return;
    const item = content[contentIdx];
    const isCorrect = choice === item.source;
    setSelected(choice);
    setShowAnswer(true);
    setResults((prev) => [...prev, { correct: isCorrect, itemId: item.id }]);
  }

  function handleNext() {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    advanceToNext();
  }

  function handleRestart() {
    setContent(shuffleAndPick(ALL_CONTENT, ITEMS_PER_GAME));
    setContentIdx(0);
    setSelected(null);
    setShowAnswer(false);
    setResults([]);
    setGameOver(false);
    setStarted(true);
  }

  // Save result on game over
  useEffect(() => {
    if (!gameOver) return;
    try {
      const score = results.filter((r) => r.correct).length;
      saveGameResult('ai-or-human', {
        score,
        total: ITEMS_PER_GAME,
        perItem: results,
      });
      const s = getGameStats('ai-or-human');
      setStats(s);
    } catch {
      // localStorage unavailable
    }
  }, [gameOver, results]);

  // Results screen
  if (gameOver) {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = Math.round((correctCount / content.length) * 100);

    return (
      <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
        <PageHeader
          icon={Eye}
          title="AI or Human?"
          subtitle="Results"
        />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cta-50 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-cta-600" />
            </div>
            <h2 className="text-3xl font-bold text-ink dark:text-slate-200 mb-2">
              {correctCount} / {content.length}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
              {pct}% accuracy
            </p>

            {stats && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Best: {stats.bestScore}/{ITEMS_PER_GAME} &middot; Played: {stats.gamesPlayed}
              </p>
            )}

            {/* Per-item breakdown */}
            <div className="text-left space-y-3 mb-6">
              {content.map((item, i) => {
                const r = results[i];
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-sm ${
                      r?.correct
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {r?.correct ? (
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-ink dark:text-slate-200">
                            {item.category}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            item.source === 'ai'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.source === 'ai' ? 'AI' : 'Human'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-1">
                          &ldquo;{item.text.slice(0, 120)}...&rdquo;
                        </p>
                        {!r?.correct && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRestart}
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

  const currentItem = content[contentIdx];
  const isCorrect = selected !== null && selected === currentItem.source;

  return (
    <div className="min-h-screen bg-bg-subtle dark:bg-slate-700">
      <PageHeader
        icon={Eye}
        title="AI or Human?"
        subtitle={`Item ${contentIdx + 1} of ${content.length}`}
      />

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Start screen */}
        {!started ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-4">
              AI or Human?
            </h2>

            <GameInstructions className="text-left mb-5" steps={HOW_TO_PLAY} />

            {stats && stats.gamesPlayed > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Best: {stats.bestScore}/{ITEMS_PER_GAME} &middot; Played: {stats.gamesPlayed}
              </p>
            )}

            <button
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
            >
              Start Game
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <GameInstructions className="mb-4" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-6">
              {content.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i < contentIdx
                      ? results[i]?.correct
                        ? 'bg-green-500'
                        : 'bg-red-400'
                      : i === contentIdx
                      ? 'bg-brand'
                      : 'bg-slate-200 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Content card */}
            <div
              className={`bg-white dark:bg-slate-800 rounded-2xl shadow-card border-2 p-6 mb-4 transition-all ${
                showAnswer
                  ? isCorrect
                    ? 'border-green-400'
                    : 'border-red-400'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  {currentItem.category}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {contentIdx + 1} of {content.length}
                </span>
              </div>

              <p className="text-ink dark:text-slate-200 text-base leading-relaxed">
                &ldquo;{currentItem.text}&rdquo;
              </p>
            </div>

            {/* Choice buttons */}
            {!showAnswer && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => handleSelect('ai')}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-semibold text-sm hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all"
                >
                  <Bot className="w-5 h-5 text-purple-600" />
                  AI Generated
                </button>
                <button
                  onClick={() => handleSelect('human')}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-semibold text-sm hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all"
                >
                  <User className="w-5 h-5 text-blue-600" />
                  Human Written
                </button>
              </div>
            )}

            {/* Feedback */}
            {showAnswer && (
              <div className="mb-6">
                <div
                  className={`p-4 rounded-xl border text-sm mb-4 ${
                    isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">Correct!</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-red-500" />
                        <span className="font-semibold text-red-700">
                          Wrong -- it was {currentItem.source === 'ai' ? 'AI generated' : 'human written'}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-500">{currentItem.explanation}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
                  >
                    {contentIdx + 1 >= content.length ? 'See Results' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
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
