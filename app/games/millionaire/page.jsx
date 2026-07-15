'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Trophy, RotateCcw, Sparkles, Scissors, LogOut, HelpCircle } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import { saveGameResult } from '@/lib/game-store';

// 10-rung ladder. Index 4 ($1,000) is the guaranteed milestone once passed.
const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];
const SAFE_INDEX = 4;
const LETTERS = ['A', 'B', 'C', 'D'];

function Millionaire() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [fifty, setFifty] = useState(null);       // array of hidden option indices, or null
  const [usedFifty, setUsedFifty] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(0);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'millionaire', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setQuestions(d.questions); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const total = questions?.length || 0;
  const q = questions?.[idx];
  const banked = idx > 0 ? LADDER[Math.min(idx - 1, LADDER.length - 1)] : 0;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('millionaire', { score: won, total: LADDER[LADDER.length - 1], custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, won, topic]);

  function useFifty() {
    if (usedFifty || revealed || !q) return;
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
    // shuffle-lite: drop two wrong options (keep the correct one + one wrong)
    const drop = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    setFifty(drop);
    setUsedFifty(true);
  }

  function answer(i) {
    if (revealed || (fifty && fifty.includes(i))) return;
    setChosen(i);
    setRevealed(true);
  }

  function cont() {
    const correct = chosen === q.correct;
    if (!correct) {
      // fall back to the guaranteed milestone
      setWon(idx > SAFE_INDEX ? LADDER[SAFE_INDEX] : 0);
      setGameOver(true);
      return;
    }
    if (idx + 1 >= total) {
      setWon(LADDER[Math.min(total - 1, LADDER.length - 1)]);
      setGameOver(true);
      return;
    }
    setIdx((n) => n + 1);
    setChosen(null);
    setRevealed(false);
    setFifty(null);
  }

  function walkAway() {
    if (revealed) return;
    setWon(banked);
    setGameOver(true);
  }

  // ---- states ----
  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Millionaire round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (loading) return <main className="max-w-2xl mx-auto px-6 pt-10"><GameGenLoading label={`Building your Millionaire ladder on ${topic}…`} estimateSeconds={18} /></main>;
  if (error || !q) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the ladder</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>{error || 'Try a different topic.'}</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }

  if (gameOver) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        {won > 0 && <ConfettiBurst />}
        <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)' }}>
          <Trophy className="w-8 h-8" style={{ color: '#0A2443' }} />
        </span>
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">
          {won >= LADDER[LADDER.length - 1] ? 'You did it — top of the ladder!' : won > 0 ? 'Nicely played!' : 'Good run!'}
        </h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>You walk away with <span className="font-bold" style={{ color: 'var(--good)' }}>${won.toLocaleString()}</span>.</p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button onClick={() => router.push(`/games/millionaire?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
            <RotateCcw className="w-4 h-4" /> New ladder
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
        <div className="flex items-center gap-2">
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>Q{idx + 1} / {total}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
            Playing for <span style={{ color: 'var(--gold)' }}>${LADDER[Math.min(idx, LADDER.length - 1)].toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="text-center mb-2">
        <div className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: 'var(--accent)' }}>Who Wants to Be an AI Millionaire</div>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Secured: ${banked.toLocaleString()} · {topic}</p>
      </div>

      {/* Lifelines */}
      <div className="flex items-center justify-center gap-2 my-4">
        <button
          onClick={useFifty}
          disabled={usedFifty || revealed}
          className="cine-glass cine-lift inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--ink)' }}
        >
          <Scissors className="w-4 h-4" /> 50:50
        </button>
        <button
          onClick={walkAway}
          disabled={revealed}
          className="cine-glass cine-lift inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--ink)' }}
        >
          <LogOut className="w-4 h-4" /> Walk away (${banked.toLocaleString()})
        </button>
      </div>

      <div className="cine-glass rounded-2xl p-6 mb-4">
        <p className="font-display font-bold text-lg text-ink dark:text-slate-100" style={{ textWrap: 'balance' }}>{q.q}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          if (fifty && fifty.includes(i)) return <div key={i} className="rounded-xl px-4 py-3.5" style={{ border: '1px dashed var(--line)', opacity: 0.35 }} />;
          let style = { background: 'var(--card, #fff)', border: '1px solid var(--line)', color: 'var(--ink)' };
          if (revealed) {
            if (i === q.correct) style = { background: 'color-mix(in srgb, var(--good) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--good) 45%, transparent)', color: 'var(--ink)' };
            else if (i === chosen) style = { background: 'rgba(229,72,77,.12)', border: '1px solid rgba(229,72,77,.45)', color: 'var(--ink)' };
            else style = { background: 'var(--card, #fff)', border: '1px solid var(--line)', color: 'var(--ink-dim)' };
          }
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={revealed}
              className="cine-lift text-left rounded-xl px-4 py-3.5 flex items-center gap-3 disabled:cursor-default"
              style={style}
            >
              <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0" style={{ background: 'var(--line)', color: 'var(--ink-dim)' }}>{LETTERS[i]}</span>
              <span className="flex-1 font-medium">{opt}</span>
              {revealed && i === q.correct && <Check className="w-5 h-5" style={{ color: 'var(--good)' }} />}
              {revealed && i === chosen && i !== q.correct && <X className="w-5 h-5" style={{ color: '#E5484D' }} />}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="cine-rise mt-5 rounded-2xl p-5" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-1" style={{ color: chosen === q.correct ? 'var(--good)' : '#E5484D' }}>
            {chosen === q.correct ? `Correct — you're playing for $${LADDER[Math.min(idx, LADDER.length - 1)].toLocaleString()}!` : 'Wrong answer.'}
          </p>
          {q.explanation && <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>{q.explanation}</p>}
          <div className="mt-4 text-right">
            <button onClick={cont} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">
              {chosen === q.correct ? (idx + 1 >= total ? 'Finish' : 'Next question') : 'See results'} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function MillionairePage() {
  return (
    <CinematicFrame>
      <PageHeader icon={HelpCircle} title="AI Millionaire" subtitle="Climb the ladder — how far can you get?" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <Millionaire />
      </Suspense>
    </CinematicFrame>
  );
}
