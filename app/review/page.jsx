'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import { Brain, ChevronRight, Check, X, RotateCcw, BarChart3, Zap } from 'lucide-react';
import { QUALITY_BUTTONS, formatNextReview } from '@/lib/sm2';
import { buildReviewQueue, updateCardAfterReview, getCardState, getReviewStats } from '@/lib/review-store';
import { onReviewCorrect } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { trackReviewCard } from '@/lib/track';

export default function ReviewPage() {
  return <CinematicFrame><ReviewPageInner /></CinematicFrame>;
}

function ReviewPageInner() {
  const { profile } = useProfile();
  const { refresh: refreshProgression } = useProgression() || {};
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setQueue(buildReviewQueue(10));
    setStats(getReviewStats());
  }, []);

  const card = queue[currentIdx];
  const isDone = currentIdx >= queue.length;

  const handleOptionSelect = useCallback((option) => {
    if (showAnswer) return;
    setSelectedOption(option);
    setShowAnswer(true);
    const correct = option === card.answer;
    setSessionResults(prev => [...prev, { cardId: card.id, correct }]);
  }, [showAnswer, card]);

  const handleReveal = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleQualityRating = useCallback((quality) => {
    if (!card) return;
    const updated = updateCardAfterReview(card.id, quality);
    const correct = quality >= 3;
    if (correct) {
      const xpResult = onReviewCorrect(resolveLearnerId(profile));
      emitXp(xpResult);
      refreshProgression?.();
    }
    trackReviewCard(card.id, card.category, quality, correct);
    setCurrentIdx(prev => prev + 1);
    setShowAnswer(false);
    setSelectedOption(null);
  }, [card, profile, refreshProgression]);

  const restart = useCallback(() => {
    setQueue(buildReviewQueue(10));
    setCurrentIdx(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setSessionResults([]);
    setStats(getReviewStats());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Brain} title="Review" subtitle="Spaced repetition" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Brain} title="Review" subtitle="Spaced repetition" />
        <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16 text-center">
          <CinematicPageHero
            eyebrow="Review"
            title="Review"
            subtitle="Spaced repetition"
            icon={Brain}
            align="center"
          />
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-10">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2">All caught up!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">No cards are due for review right now. Come back later as your cards become due based on the spaced repetition schedule.</p>
            {stats && (
              <div className="flex justify-center gap-6 mb-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-ink dark:text-slate-200">{stats.reviewedCards}</div>
                  <div className="text-slate-500 dark:text-slate-400">Reviewed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-ink dark:text-slate-200">{stats.masteredCards}</div>
                  <div className="text-slate-500 dark:text-slate-400">Mastered</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-ink dark:text-slate-200">{stats.accuracy}%</div>
                  <div className="text-slate-500 dark:text-slate-400">Accuracy</div>
                </div>
              </div>
            )}
            <Link href="/" className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm">
              Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isDone) {
    const correct = sessionResults.filter(r => r.correct).length;
    const reviewed = sessionResults.length;
    const updatedStats = getReviewStats();

    return (
      <div className="min-h-screen">
        <PageHeader icon={Brain} title="Review" subtitle="Session complete" />
        <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16 text-center">
          <CinematicPageHero
            eyebrow="Review"
            title="Session complete"
            subtitle="Nice work — here's how this round went"
            icon={Brain}
            align="center"
          />
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-10">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2">Review Complete!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">You reviewed {reviewed} cards this session.</p>

            <div className="flex justify-center gap-6 mb-8">
              <div className="cine-glass rounded-xl p-4 min-w-[100px]">
                <div className="text-2xl font-bold text-ink dark:text-slate-200">{correct}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
              </div>
              <div className="cine-glass rounded-xl p-4 min-w-[100px]">
                <div className="text-2xl font-bold text-ink dark:text-slate-200">{reviewed - correct}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">To Review</div>
              </div>
              <div className="cine-glass rounded-xl p-4 min-w-[100px]">
                <div className="text-2xl font-bold text-ink dark:text-slate-200">{updatedStats.accuracy}%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">All-Time</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="cine-glass inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-medium">
                <RotateCcw className="w-4 h-4" /> Review more
              </button>
              <Link href="/" className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm">
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const cardState = getCardState(card.id);
  const isNew = cardState.reviewCount === 0;

  return (
    <div className="min-h-screen">
      <PageHeader icon={Brain} title="Review" subtitle={`Card ${currentIdx + 1} of ${queue.length}`} />

      <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
        <CinematicPageHero
          eyebrow="Review"
          title="Review"
          subtitle={`Card ${currentIdx + 1} of ${queue.length}`}
          icon={Brain}
        />
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 flex-1 mr-4">
            {queue.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i === currentIdx ? 'bg-brand' : i < currentIdx ? 'bg-brand-200' : 'bg-slate-200'}`} />
            ))}
          </div>
          {stats && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <BarChart3 className="w-3 h-3" />
              {stats.accuracy}% accuracy
            </div>
          )}
        </div>

        <div className="cine-glass rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              {card.type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}
            </p>
            {card.category && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">{card.category}</span>
            )}
            {isNew && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-ink dark:text-slate-200 mb-6">{card.question}</h3>

          {card.type === 'multiple_choice' && card.options && (
            <div className="space-y-2 mb-6">
              {card.options.map((option, i) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === card.answer;
                let style = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50/50';
                if (showAnswer && isCorrect) style = 'bg-green-50 border-green-300 ring-1 ring-green-200';
                else if (showAnswer && isSelected && !isCorrect) style = 'bg-red-50 border-red-300 ring-1 ring-red-200';

                return (
                  <button
                    key={i}
                    onClick={() => !showAnswer && handleOptionSelect(option)}
                    disabled={showAnswer}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${style}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        showAnswer && isCorrect ? 'border-green-500 bg-green-500' : showAnswer && isSelected ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {showAnswer && isCorrect && <Check className="w-3.5 h-3.5 text-white" />}
                        {showAnswer && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm text-ink dark:text-slate-200">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {card.type === 'short_answer' && !showAnswer && (
            <button
              onClick={handleReveal}
              className="px-5 py-2.5 rounded-xl bg-brand text-white font-medium hover:bg-brand-600 transition-all"
            >
              Show Answer
            </button>
          )}

          {showAnswer && card.type === 'short_answer' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-green-800 mb-1">Answer:</p>
              <p className="text-sm text-green-700">{card.answer}</p>
            </div>
          )}

          {showAnswer && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">How well did you know this?</p>
              <div className="grid grid-cols-4 gap-2">
                {QUALITY_BUTTONS.map(btn => (
                  <button
                    key={btn.key}
                    onClick={() => handleQualityRating(btn.quality)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${btn.color}`}
                  >
                    <span>{btn.label}</span>
                    <span className="text-xs opacity-70">{btn.sublabel}</span>
                    <span className="text-[10px] opacity-50 mt-0.5">
                      {formatNextReview(
                        btn.quality >= 3
                          ? cardState.repetitions === 0 ? 1
                            : cardState.repetitions === 1 ? 6
                            : Math.round(cardState.interval * cardState.easeFactor)
                          : 1
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
