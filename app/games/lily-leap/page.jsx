'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Trophy, RotateCcw, Sparkles, Waves } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import GameInstructions from '@/components/game-instructions';
import GameStartScreen from '@/components/game-start-screen';
import { saveGameResult } from '@/lib/game-store';

// Answer by jumping. Same content shape as Speed Round (question, options, one
// right answer) presented as a journey across a pond instead of a list against a
// clock: you get lives rather than a timer, and progress is somewhere you've moved
// to rather than a counter.
//
// Inspired by the lily-pad quiz format. Everything here — the frog, the pond, the
// name — is ours; no assets or copy were taken from anyone else's version.
const HOW_TO_PLAY = [
  'A question sits above the pond, with one answer on each lily pad.',
  'Tap the pad you think is right and your frog jumps to it.',
  'Right answer, you move a step closer to shore. Wrong answer, you lose a life and the frog stays put.',
  'Three lives. Reach the shore before they run out.',
];

const LIVES = 3;

// A frog, drawn rather than borrowed. Deliberately simple: it renders at ~44px on
// a pad and reads at that size, which detail would not.
function Frog({ mood = 'idle' }) {
  return (
    <svg viewBox="0 0 48 40" className="w-11 h-9" aria-hidden>
      {/* back legs */}
      <ellipse cx="10" cy="30" rx="7" ry="4" fill="#3f9b52" />
      <ellipse cx="38" cy="30" rx="7" ry="4" fill="#3f9b52" />
      {/* body */}
      <ellipse cx="24" cy="24" rx="15" ry="12" fill="#4CAF50" />
      {/* eyes on top, the thing that makes it read as a frog at any size */}
      <circle cx="17" cy="12" r="6" fill="#4CAF50" />
      <circle cx="31" cy="12" r="6" fill="#4CAF50" />
      <circle cx="17" cy="11" r="4" fill="#fff" />
      <circle cx="31" cy="11" r="4" fill="#fff" />
      <circle cx={mood === 'sad' ? 17 : 18} cy={mood === 'sad' ? 13 : 11} r="2" fill="#1f2937" />
      <circle cx={mood === 'sad' ? 31 : 32} cy={mood === 'sad' ? 13 : 11} r="2" fill="#1f2937" />
      {/* mouth: flat when thinking, up when it lands, down when it misses */}
      <path
        d={mood === 'happy' ? 'M18 27 Q24 32 30 27' : mood === 'sad' ? 'M18 30 Q24 26 30 30' : 'M19 29 H29'}
        stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

function LilyLeap() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lilyleap', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setQuestions(d.questions); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const q = questions?.[idx];
  const revealed = picked !== null;
  const gotIt = revealed && picked === q?.correct;
  const total = questions?.length || 0;
  const drowned = lives <= 0;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    // Scored out of the FULL set even when they run out of lives early, so the XP
    // fraction reflects how far they actually got rather than flattering a short run.
    try { saveGameResult('lily-leap', { score, total, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, score, total, topic]);

  function pick(i) {
    if (revealed) return;
    setPicked(i);
    if (i === q.correct) setScore((s) => s + 1);
    else setLives((l) => l - 1);
  }

  function next() {
    // Out of lives ends it wherever they are — that's what a life costs.
    if (lives <= 0) { setGameOver(true); return; }
    if (idx + 1 >= total) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setPicked(null);
  }

  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Lily Leap round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (!started && !error) {
    return (
      <GameStartScreen
        slug="lily-leap"
        icon={Waves}
        title="Lily Leap"
        subtitle={`on ${topic}`}
        steps={HOW_TO_PLAY}
        loading={loading}
        ready={!!q}
        onStart={() => setStarted(true)}
        loadingLabel="Filling the pond…"
      />
    );
  }
  if (error || !q) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the round</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>{error || 'Try a different topic.'}</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }

  if (gameOver) {
    const madeIt = !drowned && score >= Math.ceil(total * 0.7);
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        {madeIt && <ConfettiBurst />}
        <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)' }}>
          <Trophy className="w-8 h-8" style={{ color: '#0A2443' }} />
        </span>
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">
          {drowned ? 'Splash!' : madeIt ? 'You made the shore!' : 'You got there, just about.'}
        </h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>
          <span className="font-bold" style={{ color: 'var(--good)' }}>{score}</span> of {total} pads landed.
        </p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button
            onClick={() => router.push(`/games/lily-leap?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)}
            className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold"
            style={{ color: 'var(--ink)' }}
          >
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
          {/* Lives, not a clock. A timer punishes reading carefully, which is the
              opposite of what a learning game wants. */}
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1" aria-label={`${lives} lives left`}>
            {Array.from({ length: LIVES }).map((_, i) => (
              <Heart key={i} className="w-3.5 h-3.5" style={{ color: i < lives ? '#E5484D' : 'var(--line)' }} fill={i < lives ? '#E5484D' : 'none'} />
            ))}
          </span>
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>{idx + 1} / {total}</span>
        </div>
      </div>

      <GameInstructions className="mb-4" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

      {/* The question strip, above the water like the format it borrows from. */}
      <div className="rounded-2xl px-5 py-4 mb-3 text-center" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Lily Leap · {topic}</div>
        <h1 className="font-display font-extrabold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(17px,2.4vw,22px)' }}>{q.q}</h1>
      </div>

      {/* The pond. Pads are buttons; the frog sits on the one just chosen, or on its
          own pad at the near edge while thinking. */}
      <div
        className="relative rounded-3xl p-5 sm:p-7 overflow-hidden"
        style={{ background: 'linear-gradient(180deg,#7fd4f5,#39a7d8)' }}
      >
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {q.options.map((opt, i) => {
            const isRight = i === q.correct;
            const chosen = picked === i;
            let ring = 'rgba(255,255,255,.55)';
            let pad = 'radial-gradient(circle at 35% 30%, #4b9b52, #2f7a3c)';
            if (revealed && isRight) { ring = 'var(--good, #22C55E)'; pad = 'radial-gradient(circle at 35% 30%, #57b25f, #2f7a3c)'; }
            if (revealed && chosen && !isRight) { ring = '#E5484D'; pad = 'radial-gradient(circle at 35% 30%, #7a6a4a, #4a3f2f)'; }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={revealed}
                aria-label={`Answer ${String.fromCharCode(65 + i)}: ${opt}`}
                className="relative aspect-square rounded-full grid place-items-center px-3 text-center transition-transform duration-200 disabled:cursor-default hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: pad, border: `3px solid ${ring}`, boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}
              >
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold" style={{ background: '#fff', color: '#2f7a3c' }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-bold text-white leading-tight" style={{ fontSize: 'clamp(12px,1.7vw,16px)', textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
                  {opt}
                </span>
                {/* The frog rides the chosen pad, so the jump is visible without
                    animating a path across the pond. */}
                {chosen && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <Frog mood={isRight ? 'happy' : 'sad'} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Home pad — where the frog waits between jumps. */}
        {!revealed && (
          <div className="mt-5 flex justify-center">
            <span className="relative w-24 h-16 rounded-full grid place-items-center" style={{ background: 'radial-gradient(circle at 40% 35%, #4b9b52, #2f7a3c)' }}>
              <Frog />
            </span>
          </div>
        )}
      </div>

      {revealed && (
        <div className="cine-rise mt-5 rounded-2xl p-5" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-1" style={{ color: gotIt ? 'var(--good)' : '#E5484D' }}>
            {gotIt ? 'Nice landing!' : drowned ? 'That was your last life.' : `Missed — the answer was ${q.options[q.correct]}.`}
          </p>
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>{q.explanation}</p>
          <div className="mt-4 text-right">
            <button onClick={next} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">
              {drowned || idx + 1 >= total ? 'See results' : 'Next jump'} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LilyLeapPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={Waves} title="Lily Leap" subtitle="Jump to the right answer" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <LilyLeap />
      </Suspense>
    </CinematicFrame>
  );
}
