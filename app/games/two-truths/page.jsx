'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Trophy, RotateCcw, Sparkles, ScanSearch } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import { saveGameResult } from '@/lib/game-store';

function TwoTruths() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [rounds, setRounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);   // chosen statement index (once picked → revealed)
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'twotruths', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setRounds(d.rounds); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const round = rounds?.[idx];
  const revealed = picked !== null;
  const correct = revealed && picked === round?.lie;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('two-truths', { score, total: rounds?.length || 0, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, score, rounds, topic]);

  function pick(i) {
    if (revealed) return;
    setPicked(i);
    if (i === round.lie) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= (rounds?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setPicked(null);
  }

  // ---- states ----
  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Two Truths &amp; a Lie round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (loading) return <main className="max-w-2xl mx-auto px-6 pt-10"><GameGenLoading label={`Building Two Truths & a Lie on ${topic}…`} estimateSeconds={14} /></main>;
  if (error || !round) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the round</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>{error || 'Try a different topic.'}</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }

  if (gameOver) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        <ConfettiBurst />
        <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)' }}>
          <Trophy className="w-8 h-8" style={{ color: '#0A2443' }} />
        </span>
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">Nice detective work!</h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>You caught <span className="font-bold" style={{ color: 'var(--good)' }}>{score}</span> of {rounds.length} lies.</p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button onClick={() => router.push(`/games/two-truths?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
            <RotateCcw className="w-4 h-4" /> New round
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
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>{idx + 1} / {rounds.length}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>Caught: <span style={{ color: 'var(--good)' }}>{score}</span></span>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Two Truths &amp; a Lie</div>
        <h1 className="font-display font-extrabold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(20px,3vw,28px)' }}>Which one is the lie?</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{topic}</p>
      </div>

      <div className="space-y-3">
        {round.statements.map((s, i) => {
          const isLie = i === round.lie;
          let style = { background: 'var(--card, #fff)', border: '1px solid var(--line)', color: 'var(--ink)' };
          let badge = null;
          if (revealed) {
            if (isLie) { style = { background: 'rgba(229,72,77,.12)', border: '1px solid rgba(229,72,77,.4)', color: 'var(--ink)' }; badge = <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#E5484D' }}><X className="w-4 h-4" /> The lie</span>; }
            else { style = { background: 'color-mix(in srgb, var(--good) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--good) 40%, transparent)', color: 'var(--ink)' }; badge = <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--good)' }}><Check className="w-4 h-4" /> True</span>; }
          }
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className="cine-lift w-full text-left rounded-2xl px-5 py-4 flex items-start gap-3 disabled:cursor-default"
              style={style}
            >
              <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0" style={{ background: 'var(--line)', color: 'var(--ink-dim)' }}>{String.fromCharCode(65 + i)}</span>
              <span className="flex-1 font-medium">{s}</span>
              {badge}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="cine-rise mt-5 rounded-2xl p-5" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-1" style={{ color: correct ? 'var(--good)' : '#E5484D' }}>
            {correct ? 'Correct — that was the lie!' : 'Nope — that one was true.'}
          </p>
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>{round.explanation}</p>
          <div className="mt-4 text-right">
            <button onClick={next} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">
              {idx + 1 >= rounds.length ? 'See results' : 'Next'} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TwoTruthsPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={ScanSearch} title="Two Truths & a Lie" subtitle="Spot the false claim about AI" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <TwoTruths />
      </Suspense>
    </CinematicFrame>
  );
}
