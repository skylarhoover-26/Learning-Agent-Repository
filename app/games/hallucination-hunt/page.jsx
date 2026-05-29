'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Search, CheckCircle2, XCircle, ChevronRight, RotateCcw,
} from 'lucide-react';

const ROUNDS = [
  {
    id: 1,
    context:
      'A colleague asked: "When was the first iPhone released and what were its key features?"',
    sentences: [
      'The first iPhone was announced by Steve Jobs on January 9, 2007.',
      'It was released to the public on June 29, 2007.',
      'The original iPhone featured a 3.5-inch touchscreen display.',
      'It ran on the iOS operating system from day one, which was called "iPhone OS" at launch.',
      'The first iPhone included a built-in App Store where users could download third-party apps.',
      'It was available exclusively on AT&T (then Cingular) in the United States.',
      'The base model came with 4GB of storage and was priced at $499.',
    ],
    hallucinations: [4],
    explanations: {
      4: 'The App Store did not launch with the original iPhone. It was introduced later with iPhone OS 2.0 in July 2008. The original iPhone only ran Apple\'s built-in apps.',
    },
  },
  {
    id: 2,
    context:
      'You asked an AI: "Explain how large language models work in simple terms."',
    sentences: [
      'Large language models (LLMs) are trained on massive amounts of text data from the internet.',
      'They learn patterns in language by predicting what word comes next in a sequence.',
      'The training process uses neural networks with billions of parameters.',
      'LLMs store a complete database of facts that they look up when answering questions.',
      'They can generate human-like text by building responses one token at a time.',
      'Popular examples include GPT-4, Claude, and Gemini.',
      'LLMs can sometimes produce confident-sounding but incorrect information.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'LLMs do NOT store a database of facts. They learn statistical patterns across language. This is why they can "hallucinate" - they generate plausible-sounding text based on patterns, not by looking up verified facts.',
    },
  },
  {
    id: 3,
    context:
      'A team member asked AI: "Give me a summary of best practices for running effective meetings."',
    sentences: [
      'Always send an agenda at least 24 hours before the meeting.',
      'Keep meetings to 30 minutes or less when possible - research shows attention drops sharply after that.',
      'Start every meeting with a 10-minute icebreaker to build team rapport, as recommended by Harvard Business Review.',
      'Assign a note-taker at the start to capture action items.',
      'End with clear next steps and owners for each action item.',
      'Send a follow-up summary within 24 hours of the meeting.',
      'Studies by Microsoft show that back-to-back meetings increase stress and reduce focus.',
    ],
    hallucinations: [2],
    explanations: {
      2: 'Harvard Business Review has not specifically recommended starting "every" meeting with a 10-minute icebreaker. While icebreakers can be useful in some contexts, a blanket 10-minute icebreaker for every meeting is not a widely cited best practice and would be counterproductive for short meetings.',
    },
  },
  {
    id: 4,
    context:
      'You asked: "What are the key differences between ChatGPT and Claude?"',
    sentences: [
      'ChatGPT is made by OpenAI, while Claude is made by Anthropic.',
      'Both are large language models that can generate text, answer questions, and help with tasks.',
      'Claude was specifically designed with a focus on being helpful, harmless, and honest.',
      'ChatGPT uses the GPT architecture, while Claude is built on a completely different transformer variant called RLHF-Net.',
      'Both models can make mistakes and produce hallucinations.',
      'ChatGPT launched publicly in November 2022 and quickly gained millions of users.',
      'Claude emphasizes longer context windows and careful, nuanced responses.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'There is no transformer variant called "RLHF-Net." RLHF (Reinforcement Learning from Human Feedback) is a training technique, not a model architecture. Both ChatGPT and Claude use transformer-based architectures. The AI fabricated a technical-sounding name.',
    },
  },
];

function getSentenceStyle(idx, flagged, revealed, isHallucination) {
  if (!revealed) {
    if (flagged) {
      return 'bg-orange-50 border-orange-300 ring-1 ring-orange-200';
    }
    return 'bg-white border-slate-200 hover:border-brand-200 hover:bg-brand-50 cursor-pointer';
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
  return 'bg-white border-slate-200'; // correct skip
}

export default function HallucinationHunt() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [flagged, setFlagged] = useState(new Set());
  const [revealed, setRevealed] = useState(false);

  const round = ROUNDS[roundIdx];
  const hallucinationSet = new Set(round.hallucinations);

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
  }

  function handleNextRound() {
    setRoundIdx((prev) => (prev + 1) % ROUNDS.length);
    setFlagged(new Set());
    setRevealed(false);
  }

  function handleReplay() {
    setFlagged(new Set());
    setRevealed(false);
  }

  // score calculation
  const caught = [...flagged].filter((i) => hallucinationSet.has(i)).length;
  const missed = round.hallucinations.length - caught;
  const falseFlags = [...flagged].filter((i) => !hallucinationSet.has(i)).length;

  return (
    <div className="min-h-screen bg-bg-subtle">
      <PageHeader
        icon={Search}
        title="Hallucination Hunt"
        subtitle="Find the factual errors in AI responses"
      />

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Round info */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 ring-1 ring-brand-200">
              Round {roundIdx + 1} of {ROUNDS.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-ink mb-2">
            Fact-check this AI response
          </h2>
          <p className="text-sm text-slate-600 mb-1">{round.context}</p>
          <p className="text-xs text-slate-500">
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
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm text-ink transition-all ${style}`}
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
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
            <h3 className="font-bold text-ink text-lg mb-4">Results</h3>

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
                  className="p-4 bg-bg-subtle rounded-xl border border-slate-200"
                >
                  <p className="text-sm font-semibold text-ink mb-1">
                    Sentence {idx + 1}: &ldquo;{round.sentences[idx]}&rdquo;
                  </p>
                  <p className="text-sm text-slate-600">
                    {round.explanations[idx]}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleReplay}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 text-ink font-semibold text-sm hover:bg-bg-subtle transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Replay Round
              </button>
              <button
                onClick={handleNextRound}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all"
              >
                Next Round
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
