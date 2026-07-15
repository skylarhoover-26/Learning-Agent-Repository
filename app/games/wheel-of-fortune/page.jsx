'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Disc3, Trophy, RotateCcw, Sparkles } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import { saveGameResult } from '@/lib/game-store';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
// Weighted wheel — Bankrupt is the only "bad" wedge and stays rare.
const WHEEL = [600, 700, 500, 800, 650, 900, 550, 'BANKRUPT', 750, 600, 850, 700];

function normalizePhrase(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
}

function WheelGame() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [puzzles, setPuzzles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [guessed, setGuessed] = useState(() => new Set());
  const [total, setTotal] = useState(0);       // banked across solved puzzles
  const [roundScore, setRoundScore] = useState(0);
  const [spinValue, setSpinValue] = useState(null); // numeric = ready to guess a letter
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [message, setMessage] = useState('Spin the wheel to start.');
  const [solved, setSolved] = useState(false);
  const [solveInput, setSolveInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'wheel', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setPuzzles(d.puzzles); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const puzzle = puzzles?.[idx];
  const phrase = puzzle ? normalizePhrase(puzzle.phrase) : '';
  const uniqueLetters = useMemo(() => [...new Set(phrase.replace(/ /g, '').split(''))], [phrase]);
  const allRevealed = phrase && uniqueLetters.every((l) => guessed.has(l));

  // Auto-bank when the board is fully uncovered by guessing.
  useEffect(() => {
    if (!puzzle || solved) return;
    if (allRevealed) finishPuzzle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed]);

  // Save the game result once the last puzzle is done.
  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('wheel-of-fortune', { score: total, total: puzzles?.length || 0, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, total, puzzles, topic]);

  function spin() {
    if (spinning || spinValue !== null || solved) return;
    setSpinning(true);
    setMessage('Spinning…');
    const landed = WHEEL[Math.floor(Math.random() * WHEEL.length)];
    setAngle((a) => a + 720 + Math.floor(Math.random() * 360));
    setTimeout(() => {
      setSpinning(false);
      if (landed === 'BANKRUPT') {
        setRoundScore(0);
        setSpinValue(null);
        setMessage('💸 Bankrupt! This puzzle’s points are gone — spin again.');
      } else {
        setSpinValue(landed);
        setMessage(`You spun $${landed}. Pick a letter!`);
      }
    }, 850);
  }

  function guessLetter(letter) {
    if (solved || guessed.has(letter)) return;
    if (spinValue === null) { setMessage('Spin the wheel before picking a letter.'); return; }
    const next = new Set(guessed); next.add(letter);
    setGuessed(next);
    const count = phrase.split('').filter((c) => c === letter).length;
    if (count > 0) {
      setRoundScore((s) => s + spinValue * count);
      setMessage(`Nice — ${count} × “${letter}” for $${spinValue * count}. Spin again or solve.`);
    } else {
      setMessage(`No “${letter}.” Spin again.`);
    }
    setSpinValue(null); // must spin again before the next letter
  }

  function finishPuzzle(bonus) {
    if (solved) return;
    setSolved(true);
    const gained = roundScore + bonus;
    setTotal((t) => t + gained);
    setMessage(bonus ? `Solved! +$${gained} (with a $${bonus} bonus).` : `Board cleared! +$${gained}.`);
  }

  function trySolve() {
    if (solved || !solveInput.trim()) return;
    if (normalizePhrase(solveInput) === phrase) {
      setGuessed(new Set(uniqueLetters)); // reveal all
      finishPuzzle(500);
    } else {
      setMessage('Not the phrase — keep guessing letters.');
    }
    setSolveInput('');
  }

  function nextPuzzle() {
    if (idx + 1 >= (puzzles?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setGuessed(new Set());
    setRoundScore(0);
    setSpinValue(null);
    setSolved(false);
    setSolveInput('');
    setMessage('Spin the wheel to start.');
  }

  // ---- states ----
  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Wheel of Fortune round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (loading) return <main className="max-w-2xl mx-auto px-6 pt-10"><GameGenLoading label={`Building your Wheel of Fortune on ${topic}…`} estimateSeconds={16} /></main>;
  if (error || !puzzle) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the puzzles</h1>
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
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">Nice spinning!</h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>You banked <span className="font-bold" style={{ color: 'var(--good)' }}>${total.toLocaleString()}</span> across {puzzles.length} puzzles.</p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button onClick={() => router.push(`/games/wheel-of-fortune?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
            <RotateCcw className="w-4 h-4" /> New puzzles
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
        <div className="flex items-center gap-2">
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>Puzzle {idx + 1} / {puzzles.length}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
            Banked: <span style={{ color: 'var(--good)' }}>${total.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Wheel of Fortune · {puzzle.category}</div>
        <h1 className="font-display font-extrabold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(20px,3vw,30px)' }}>{topic}</h1>
      </div>

      {/* Wheel + this-round score */}
      <div className="flex items-center justify-center gap-6 mb-7">
        <div className="relative grid place-items-center">
          <Disc3
            className="w-20 h-20"
            style={{ color: 'var(--accent2)', transform: `rotate(${angle}deg)`, transition: 'transform 0.85s cubic-bezier(.17,.67,.3,1.1)' }}
          />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-dim)' }}>This puzzle</p>
          <p className="font-display font-extrabold text-2xl" style={{ color: 'var(--good)' }}>${roundScore.toLocaleString()}</p>
          {spinValue !== null && <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>Spun ${spinValue} — pick a letter</p>}
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-4">
        {phrase.split('').map((ch, i) => (
          ch === ' '
            ? <span key={i} className="w-3 sm:w-5" />
            : (
              <span
                key={i}
                className="w-8 h-11 sm:w-10 sm:h-12 grid place-items-center rounded-lg font-display font-extrabold text-lg sm:text-xl"
                style={(guessed.has(ch) || solved)
                  ? { background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff' }
                  : { background: 'var(--card, #fff)', border: '1px solid var(--line)', color: 'transparent' }}
              >
                {(guessed.has(ch) || solved) ? ch : '·'}
              </span>
            )
        ))}
      </div>

      <p className="text-center text-sm mb-5 min-h-[20px]" style={{ color: 'var(--ink-dim)' }}>{message}</p>

      {solved ? (
        <div className="text-center">
          <button onClick={nextPuzzle} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-7 font-semibold">
            {idx + 1 >= puzzles.length ? 'See results' : 'Next puzzle'} <Sparkles className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-5">
            <button
              onClick={spin}
              disabled={spinning || spinValue !== null}
              className="cine-gold cine-lift inline-flex items-center gap-2 h-12 px-7 rounded-full font-bold disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Disc3 className="w-5 h-5" /> {spinning ? 'Spinning…' : 'Spin'}
            </button>
          </div>

          {/* Keyboard */}
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-w-lg mx-auto mb-6">
            {ALPHABET.map((l) => {
              const used = guessed.has(l);
              return (
                <button
                  key={l}
                  onClick={() => guessLetter(l)}
                  disabled={used || spinValue === null}
                  className="h-10 rounded-lg font-bold text-sm transition-all disabled:cursor-not-allowed"
                  style={used
                    ? { background: 'var(--line)', color: 'var(--ink-dim)', opacity: 0.5 }
                    : { background: 'var(--card, #fff)', border: '1px solid var(--line)', color: 'var(--ink)', opacity: spinValue === null ? 0.5 : 1 }}
                >
                  {l}
                </button>
              );
            })}
          </div>

          {/* Solve */}
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              value={solveInput}
              onChange={(e) => setSolveInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') trySolve(); }}
              placeholder="Know it? Type the full phrase to solve…"
              className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-ink dark:text-slate-100 bg-transparent outline-none focus:ring-4"
              style={{ border: '1px solid var(--line)', '--tw-ring-color': 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
            />
            <button onClick={trySolve} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-5 font-semibold">Solve</button>
          </div>
        </>
      )}
    </main>
  );
}

export default function WheelOfFortunePage() {
  return (
    <CinematicFrame>
      <PageHeader icon={Disc3} title="Wheel of Fortune" subtitle="Uncover the AI phrase, one spin at a time" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <WheelGame />
      </Suspense>
    </CinematicFrame>
  );
}
