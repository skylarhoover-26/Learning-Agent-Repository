'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import BookLoader from '@/components/book-loader';
import ConfettiBurst from '@/components/confetti-burst';
import { saveGameResult } from '@/lib/game-store';

// Normalize a free-text response for lenient matching: lowercase, drop the
// "what is / who are / the" Jeopardy framing and punctuation, collapse spaces.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^(what|who|where|when|which)\s+(is|are|was|were)\s+/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A response counts if it matches the answer or any accepted alternative — exact
// after normalization, or a clean containment either way (so "chain of thought
// prompting" matches "chain of thought").
function isCorrect(input, clue) {
  const guess = normalize(input);
  if (!guess) return false;
  const candidates = [clue.answer, ...(clue.acceptable || [])].map(normalize).filter(Boolean);
  return candidates.some((c) => c === guess || (c.length > 3 && (guess.includes(c) || c.includes(guess))));
}

function JeopardyGame() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [used, setUsed] = useState(() => new Set());   // "cat-clue" keys
  const [active, setActive] = useState(null);            // { c, i, clue }
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(null);        // { correct } once submitted
  const [score, setScore] = useState(0);
  const [savedDone, setSavedDone] = useState(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate-jeopardy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setBoard(d); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } })
    return () => { live = false; };
  }, [topic]);

  const totalClues = useMemo(() => (board?.categories || []).reduce((n, c) => n + c.clues.length, 0), [board]);
  const maxScore = useMemo(() => (board?.categories || []).reduce((n, c) => n + c.clues.reduce((s, cl) => s + cl.value, 0), 0), [board]);
  const done = board && used.size === totalClues && totalClues > 0;

  // Persist the result once the board is cleared (local stats only — custom
  // rounds don't feed the leaderboard).
  useEffect(() => {
    if (!done || savedDone) return;
    setSavedDone(true);
    try { saveGameResult('jeopardy', { score, total: maxScore, custom: true, topic }); } catch { /* no localStorage */ }
  }, [done, savedDone, score, maxScore, topic]);

  function openClue(c, i) {
    const key = `${c}-${i}`;
    if (used.has(key)) return;
    setActive({ c, i, clue: board.categories[c].clues[i] });
    setGuess('');
    setRevealed(null);
  }

  function submit() {
    if (!active || revealed) return;
    const correct = isCorrect(guess, active.clue);
    setRevealed({ correct });
    if (correct) setScore((s) => s + active.clue.value);
  }

  // Skipping still reveals the answer (so it's a learning moment) — it just
  // doesn't score. Continue then closes and marks the clue used.
  function skip() {
    if (!active || revealed) return;
    setRevealed({ correct: false, skipped: true });
  }

  function closeClue() {
    if (active) setUsed((prev) => new Set(prev).add(`${active.c}-${active.i}`));
    setActive(null);
    setRevealed(null);
    setGuess('');
  }

  // ---- states ----
  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Jeopardy round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (loading) {
    return <main className="max-w-2xl mx-auto px-6 py-24"><BookLoader message={`Building your Jeopardy board on ${topic}…`} size="lg" /></main>;
  }
  if (error || !board) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the board</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>{error || 'Try a different topic.'}</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      {done && <ConfettiBurst />}
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
        <div className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
          Score: <span style={{ color: 'var(--good)' }}>${score.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Jeopardy · custom round</div>
        <h1 className="font-display font-extrabold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(24px,4vw,40px)' }}>{topic}</h1>
      </div>

      {done ? (
        <div className="cine-glass rounded-3xl p-8 text-center max-w-lg mx-auto">
          <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)' }}>
            <Trophy className="w-8 h-8" style={{ color: '#0A2443' }} />
          </span>
          <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">Board cleared!</h2>
          <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>
            You scored <span className="font-bold" style={{ color: 'var(--good)' }}>${score.toLocaleString()}</span> of ${maxScore.toLocaleString()}.
          </p>
          <div className="flex gap-3 justify-center mt-7">
            <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
            <button onClick={() => router.push(`/games/jeopardy?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
              <RotateCcw className="w-4 h-4" /> New board
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid gap-2 min-w-[640px]" style={{ gridTemplateColumns: `repeat(${board.categories.length}, minmax(0,1fr))` }}>
            {board.categories.map((cat, c) => (
              <div key={c} className="rounded-xl px-2 py-3 text-center font-display font-bold text-xs sm:text-sm uppercase tracking-wide grid place-items-center min-h-[64px]" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff' }}>
                {cat.name}
              </div>
            ))}
            {board.categories[0].clues.map((_, i) => (
              board.categories.map((cat, c) => {
                const clue = cat.clues[i];
                const isUsed = used.has(`${c}-${i}`);
                return (
                  <button
                    key={`${c}-${i}`}
                    onClick={() => openClue(c, i)}
                    disabled={isUsed}
                    className="cine-glass rounded-xl min-h-[72px] grid place-items-center font-display font-extrabold text-xl sm:text-2xl transition-all disabled:cursor-default"
                    style={isUsed ? { opacity: 0.28, color: 'var(--ink-dim)' } : { color: 'var(--gold)' }}
                  >
                    {isUsed ? '' : `$${clue.value}`}
                  </button>
                );
              })
            ))}
          </div>
        </div>
      )}

      {/* Clue modal */}
      {active && (
        <div className="fixed inset-0 z-[100] grid place-items-center p-4" style={{ background: 'rgba(4,12,28,.6)', backdropFilter: 'blur(4px)' }} onClick={closeClue}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl p-7 sm:p-9" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)', boxShadow: '0 40px 90px -40px rgba(0,0,0,.6)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {board.categories[active.c].name} · ${active.clue.value}
              </span>
              <button onClick={closeClue} aria-label="Close" className="w-8 h-8 rounded-full grid place-items-center" style={{ color: 'var(--ink-dim)' }}><X className="w-4 h-4" /></button>
            </div>
            <p className="font-display font-bold text-xl sm:text-2xl leading-snug text-ink dark:text-slate-100 mb-5" style={{ textWrap: 'balance' }}>{active.clue.clue}</p>

            {!revealed ? (
              <>
                <input
                  autoFocus
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  placeholder="What is… ?"
                  className="w-full rounded-xl px-4 py-3.5 text-base text-ink dark:text-slate-100 bg-transparent outline-none focus:ring-4 mb-4"
                  style={{ border: '1px solid var(--line)', '--tw-ring-color': 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={skip} className="px-4 py-2.5 rounded-full text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Skip</button>
                  <button onClick={submit} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Submit</button>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3 font-bold" style={{ color: revealed.skipped ? 'var(--ink-dim)' : (revealed.correct ? 'var(--good)' : '#E5484D') }}>
                  {revealed.skipped
                    ? <>Skipped — here&rsquo;s the answer</>
                    : revealed.correct
                      ? <><Check className="w-5 h-5" /> Correct — +${active.clue.value}</>
                      : <><X className="w-5 h-5" /> Not quite</>}
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--ink-dim)' }}>The answer:</p>
                <p className="font-semibold text-lg text-ink dark:text-slate-100 mb-5">{active.clue.answer}</p>
                <div className="flex justify-end">
                  <button onClick={closeClue} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Continue <Sparkles className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function JeopardyPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={Trophy} title="Jeopardy" subtitle="A custom AI quiz board, generated for your topic" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><BookLoader size="lg" /></main>}>
        <JeopardyGame />
      </Suspense>
    </CinematicFrame>
  );
}
