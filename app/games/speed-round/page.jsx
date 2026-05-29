'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Timer, ChevronRight, RotateCcw, CheckCircle2, XCircle, Trophy,
} from 'lucide-react';

const ALL_QUESTIONS = [
  {
    q: 'What does "LLM" stand for?',
    options: ['Large Learning Machine', 'Large Language Model', 'Linear Logic Module', 'Layered Language Matrix'],
    correct: 1,
    explanation: 'LLM stands for Large Language Model — a type of AI trained on massive text datasets.',
  },
  {
    q: 'Which is the BEST way to get a more useful AI response?',
    options: ['Type in ALL CAPS', 'Be vague so the AI can be creative', 'Provide specific context and constraints', 'Ask the shortest possible question'],
    correct: 2,
    explanation: 'Providing specific context and constraints helps the AI understand exactly what you need.',
  },
  {
    q: 'What is an "AI hallucination"?',
    options: ['When the AI sees images', 'When the AI generates confident but incorrect information', 'When the AI crashes', 'When the AI refuses to answer'],
    correct: 1,
    explanation: 'A hallucination is when an AI produces plausible-sounding but factually wrong information.',
  },
  {
    q: 'When should you NOT rely on AI output without verification?',
    options: ['Brainstorming ideas', 'Drafting creative content', 'Citing specific facts, statistics, or dates', 'Summarizing your own notes'],
    correct: 2,
    explanation: 'AI can fabricate facts and statistics. Always verify specific claims from independent sources.',
  },
  {
    q: 'What is "prompt engineering"?',
    options: ['Building AI hardware', 'Writing code for AI models', 'Crafting effective instructions for AI tools', 'Training neural networks'],
    correct: 2,
    explanation: 'Prompt engineering is the practice of writing clear, structured instructions to get better AI outputs.',
  },
  {
    q: 'Which task is AI generally BEST at?',
    options: ['Making final business decisions', 'Drafting and summarizing text', 'Predicting the stock market', 'Replacing human judgment entirely'],
    correct: 1,
    explanation: 'AI excels at text drafting and summarization. It should assist, not replace, human decision-making.',
  },
  {
    q: 'What happens when you give AI a "role" in your prompt (e.g., "You are an expert editor")?',
    options: ['Nothing, it ignores it', 'It changes the AI model being used', 'It helps frame the tone, depth, and perspective of the response', 'It makes the response less accurate'],
    correct: 2,
    explanation: 'Assigning a role sets context for the style and expertise level of the response.',
  },
  {
    q: 'What is a "token" in the context of AI?',
    options: ['A payment method', 'A unit of text (roughly a word or word-piece) the model processes', 'A security credential', 'A type of AI model'],
    correct: 1,
    explanation: 'Tokens are chunks of text (roughly 3/4 of a word on average) that LLMs process.',
  },
  {
    q: 'Which of these is a GOOD use of AI at work?',
    options: ['Automating performance reviews without review', 'Drafting a first version of an email for you to edit', 'Sharing confidential data with a public AI tool', 'Blindly copying AI output into a client proposal'],
    correct: 1,
    explanation: 'AI is great for first drafts you then review. Always edit and verify before sharing.',
  },
  {
    q: 'What should you do if an AI response seems wrong?',
    options: ['Trust it — AI is usually right', 'Ask the AI to confirm its own answer', 'Verify with a reliable external source', 'Ignore it and move on'],
    correct: 2,
    explanation: 'Always check suspicious AI claims against trusted external sources. AI cannot reliably self-verify.',
  },
  {
    q: 'What is "context window" in AI?',
    options: ['The screen where you see AI responses', 'The maximum amount of text an AI can consider at once', 'A setting that controls creativity', 'The time limit for a conversation'],
    correct: 1,
    explanation: 'The context window is the total text (prompt + response) the model can handle in one go.',
  },
  {
    q: 'Which prompt technique gives the AI an example of what you want?',
    options: ['Zero-shot prompting', 'Few-shot prompting', 'Chain-of-thought prompting', 'Temperature tuning'],
    correct: 1,
    explanation: 'Few-shot prompting includes examples in the prompt so the AI can mimic the pattern.',
  },
  {
    q: 'What is a key risk of using AI-generated content without review?',
    options: ['It costs too much', 'It may contain inaccuracies, bias, or inappropriate content', 'It will always be too long', 'It will be flagged by search engines'],
    correct: 1,
    explanation: 'Unreviewed AI content can include factual errors, biases, or tone issues. Always review.',
  },
  {
    q: 'Why is iterating on a prompt (asking follow-ups) effective?',
    options: ['It costs less tokens', 'It confuses the AI into trying harder', 'It lets you refine and improve the output step by step', 'It resets the conversation memory'],
    correct: 2,
    explanation: 'Iterating lets you guide the AI closer to what you need by building on prior responses.',
  },
  {
    q: 'What type of data should you NEVER paste into a public AI tool?',
    options: ['Public company news', 'A generic email template', 'Customer PII, passwords, or confidential business data', 'A Wikipedia article'],
    correct: 2,
    explanation: 'Never share personal data, credentials, or confidential info with public AI tools.',
  },
];

const TIMER_SECONDS = 15;
const QUESTIONS_PER_GAME = 10;

function shuffleAndPick(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function TimerRing({ secondsLeft, total }) {
  const pct = (secondsLeft / total) * 100;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color =
    secondsLeft > 10 ? 'stroke-brand' : secondsLeft > 5 ? 'stroke-cta' : 'stroke-red-500';

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#ECEFF1"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          className={`${color} transition-all duration-1000 ease-linear`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xl font-bold text-ink">{secondsLeft}</span>
    </div>
  );
}

export default function SpeedRound() {
  const [questions, setQuestions] = useState(() =>
    shuffleAndPick(ALL_QUESTIONS, QUESTIONS_PER_GAME)
  );
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [results, setResults] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef(null);
  const advanceRef = useRef(null);

  const currentQ = questions[qIdx];

  const advanceToNext = useCallback(() => {
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }

    if (qIdx + 1 >= questions.length) {
      setGameOver(true);
      return;
    }

    setQIdx((prev) => prev + 1);
    setSelected(null);
    setSecondsLeft(TIMER_SECONDS);
  }, [qIdx, questions.length]);

  // countdown timer
  useEffect(() => {
    if (gameOver || selected !== null) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // time ran out — mark as wrong
          setSelected(-1);
          setResults((r) => [...r, { correct: false, timedOut: true }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [qIdx, gameOver, selected]);

  // auto-advance after answer or timeout
  useEffect(() => {
    if (selected === null) return;
    advanceRef.current = setTimeout(() => {
      advanceToNext();
    }, 2000);
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, [selected, advanceToNext]);

  function handleAnswer(optionIdx) {
    if (selected !== null || gameOver) return;
    clearInterval(timerRef.current);
    setSelected(optionIdx);
    const isCorrect = optionIdx === currentQ.correct;
    setResults((r) => [...r, { correct: isCorrect, timedOut: false }]);
  }

  function handleRestart() {
    setQuestions(shuffleAndPick(ALL_QUESTIONS, QUESTIONS_PER_GAME));
    setQIdx(0);
    setSelected(null);
    setSecondsLeft(TIMER_SECONDS);
    setResults([]);
    setGameOver(false);
  }

  // Game over screen
  if (gameOver) {
    const correctCount = results.filter((r) => r.correct).length;
    const timedOutCount = results.filter((r) => r.timedOut).length;
    const pct = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-bg-subtle">
        <PageHeader
          icon={Timer}
          title="Speed Round"
          subtitle="Results"
        />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cta-50 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-cta-600" />
            </div>
            <h2 className="text-3xl font-bold text-ink mb-2">
              {correctCount} / {questions.length}
            </h2>
            <p className="text-lg text-slate-600 mb-6">{pct}% correct</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-700">{correctCount}</div>
                <div className="text-xs text-green-600">Correct</div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="text-2xl font-bold text-red-700">
                  {questions.length - correctCount - timedOutCount}
                </div>
                <div className="text-xs text-red-600">Wrong</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                <div className="text-2xl font-bold text-orange-700">{timedOutCount}</div>
                <div className="text-xs text-orange-600">Timed Out</div>
              </div>
            </div>

            {/* Question breakdown */}
            <div className="text-left space-y-3 mb-6">
              {questions.map((q, i) => {
                const r = results[i];
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-sm ${
                      r?.correct
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {r?.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-ink">{q.q}</p>
                        {!r?.correct && (
                          <p className="text-xs text-slate-600 mt-1">
                            {q.explanation}
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 text-ink font-semibold text-sm hover:bg-bg-subtle transition-all"
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
    <div className="min-h-screen bg-bg-subtle">
      <PageHeader
        icon={Timer}
        title="Speed Round"
        subtitle={`Question ${qIdx + 1} of ${questions.length}`}
      />

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-6">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < qIdx
                  ? results[i]?.correct
                    ? 'bg-green-500'
                    : 'bg-red-400'
                  : i === qIdx
                  ? 'bg-brand'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-ink flex-1 pr-4">
              {currentQ.q}
            </h2>
            <TimerRing secondsLeft={secondsLeft} total={TIMER_SECONDS} />
          </div>

          <div className="space-y-3">
            {currentQ.options.map((option, optIdx) => {
              let style =
                'bg-white border-slate-200 hover:border-brand-200 hover:bg-brand-50 cursor-pointer';

              if (selected !== null) {
                if (optIdx === currentQ.correct) {
                  style = 'bg-green-50 border-green-300 ring-1 ring-green-200';
                } else if (optIdx === selected && selected !== currentQ.correct) {
                  style = 'bg-red-50 border-red-300 ring-1 ring-red-200';
                } else {
                  style = 'bg-white border-slate-200 opacity-60';
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleAnswer(optIdx)}
                  disabled={selected !== null}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm text-ink transition-all ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-bg-subtle border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {selected !== null && optIdx === currentQ.correct && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    )}
                    {selected !== null &&
                      optIdx === selected &&
                      selected !== currentQ.correct && (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="mt-4 p-3 bg-bg-subtle rounded-xl border border-slate-200 text-sm text-slate-600">
              {currentQ.explanation}
            </div>
          )}
        </div>

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
