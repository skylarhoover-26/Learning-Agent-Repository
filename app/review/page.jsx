'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Brain, ChevronRight, Check, X, RotateCcw } from 'lucide-react';

const DEMO_CARDS = [
  {
    id: 'qc_001',
    type: 'multiple_choice',
    question: 'What makes a prompt "specific" rather than "vague"?',
    answer: 'Including context, constraints, and desired format',
    options: [
      'Using longer sentences',
      'Including context, constraints, and desired format',
      'Adding please and thank you',
      'Using technical jargon',
    ],
  },
  {
    id: 'qc_002',
    type: 'short_answer',
    question: 'Name two things you should include when asking AI to summarize an email thread.',
    answer: 'The desired length/format and who the summary is for (audience)',
  },
];

export default function ReviewPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [results, setResults] = useState([]);

  const card = DEMO_CARDS[currentIdx];
  const isDone = currentIdx >= DEMO_CARDS.length;

  function handleOptionSelect(option) {
    setSelectedOption(option);
    setShowAnswer(true);
    const correct = option === card.answer;
    setResults(prev => [...prev, { cardId: card.id, correct }]);
  }

  function handleReveal() {
    setShowAnswer(true);
    setResults(prev => [...prev, { cardId: card.id, correct: null }]);
  }

  function nextCard() {
    setCurrentIdx(prev => prev + 1);
    setShowAnswer(false);
    setSelectedOption(null);
  }

  function restart() {
    setCurrentIdx(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setResults([]);
  }

  if (isDone) {
    const correct = results.filter(r => r.correct).length;
    return (
      <div className="min-h-screen">
        <PageHeader icon={Brain} title="Review" subtitle="Spaced repetition" />
        <main className="max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-10">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-ink mb-2">Review Complete!</h2>
            <p className="text-slate-600 mb-6">You reviewed {DEMO_CARDS.length} cards. {correct} correct.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium">
                <RotateCcw className="w-4 h-4" /> Review again
              </button>
              <Link href="/" className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm">
                Back to dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Brain} title="Review" subtitle={`Card ${currentIdx + 1} of ${DEMO_CARDS.length}`} />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex gap-1 mb-6">
          {DEMO_CARDS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i === currentIdx ? 'bg-brand' : i < currentIdx ? 'bg-brand-200' : 'bg-slate-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-4">
            {card.type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}
          </p>
          <h3 className="text-xl font-bold text-ink mb-6">{card.question}</h3>

          {card.type === 'multiple_choice' && card.options && (
            <div className="space-y-2 mb-6">
              {card.options.map((option, i) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === card.answer;
                let style = 'bg-white border-slate-200 hover:border-brand-200 hover:bg-brand-50/50';
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
                        showAnswer && isCorrect ? 'border-green-500 bg-green-500' : showAnswer && isSelected ? 'border-red-500 bg-red-500' : 'border-slate-300'
                      }`}>
                        {showAnswer && isCorrect && <Check className="w-3.5 h-3.5 text-white" />}
                        {showAnswer && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm text-ink">{option}</span>
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
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-green-800 mb-1">Answer:</p>
              <p className="text-sm text-green-700">{card.answer}</p>
            </div>
          )}

          {showAnswer && (
            <div className="flex justify-end mt-4">
              <button
                onClick={nextCard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
              >
                {currentIdx < DEMO_CARDS.length - 1 ? 'Next Card' : 'Finish'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
