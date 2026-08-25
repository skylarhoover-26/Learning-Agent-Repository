'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Trophy, RotateCcw, Sparkles, Workflow, Check, X, GripVertical, ChevronUp, ChevronDown,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import GameInstructions from '@/components/game-instructions';
import GameTopic from '@/components/game-topic';
import GameStartScreen from '@/components/game-start-screen';
import { saveGameResult } from '@/lib/game-store';

// Drag the steps of a simulated workflow into the order they have to happen, then
// check. Three attempts.
//
// The first version judged every tap the moment you made it and auto-placed the right
// answer after 1.4 seconds — too fast to read, and it took the thinking away at the
// exact moment the thinking was happening. Ordering the whole flow yourself and then
// asking "is this right?" is the actual skill: you have to hold the dependencies in
// your head, not guess one step at a time with a hint after each miss.
const HOW_TO_PLAY = [
  'Every flow here is a simulation, written for practice — not a real system of ours.',
  'Drag the steps into the order they have to happen. On touch, use the arrows to move a step up or down.',
  'Take as long as you like, then press Check.',
  'You get three attempts. Each one tells you how many steps are in the right place, but not which — after the third, the answer is revealed and the round scores nothing.',
];

const MAX_ATTEMPTS = 3;
// Right first time is worth full marks; later attempts are worth less, so being
// careful beats brute-forcing three orders.
const ATTEMPT_CREDIT = [1, 0.6, 0.3];

function shuffled(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // A shuffle that happens to be the right answer is not a round.
  if (order.every((v, i) => v === i) && n > 1) return shuffled(n);
  return order;
}

function BuildTheFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [rounds, setRounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState([]);        // original indexes, in the player's order
  const [attempts, setAttempts] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(null); // how many were in place last check
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);      // out of attempts, answer shown
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const dragFrom = useRef(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'flow', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setRounds(d.rounds); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const round = rounds?.[idx];
  const total = round?.steps?.length || 0;
  // Shuffled once per ROUND — keyed on idx, not just length, because two rounds with
  // five steps each must still get their own shuffle. Doing this in an effect rather
  // than a memo keeps that intent visible: a memo that depends on idx without reading
  // it looks like a mistake, and re-shuffling on render would reorder the list under
  // the player's finger mid-drag.
  useEffect(() => {
    if (total) setOrder(shuffled(total));
  }, [idx, total]);

  const done = solved || revealed;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('build-the-flow', { score, total: rounds?.length || 0, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, score, rounds, topic]);

  function move(from, to) {
    if (done || to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setLastCorrect(null);
  }

  function check() {
    if (done) return;
    const inPlace = order.filter((orig, pos) => orig === pos).length;
    const attemptNo = attempts + 1;
    setAttempts(attemptNo);

    if (inPlace === total) {
      setSolved(true);
      setScore((s) => s + (ATTEMPT_CREDIT[attemptNo - 1] ?? 0));
      setLastCorrect(total);
      return;
    }
    // How MANY are right, never which — naming them would solve the puzzle by
    // elimination in two checks.
    setLastCorrect(inPlace);
    if (attemptNo >= MAX_ATTEMPTS) setRevealed(true);
  }

  function next() {
    if (idx + 1 >= (rounds?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setAttempts(0);
    setLastCorrect(null);
    setSolved(false);
    setRevealed(false);
  }

  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Build the Flow round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (!started && !error) {
    return (
      <GameStartScreen
        slug="build-the-flow"
        icon={Workflow}
        title="Build the Flow"
        subtitle={`on ${topic}`}
        steps={HOW_TO_PLAY}
        loading={loading}
        ready={!!round}
        onStart={() => setStarted(true)}
        loadingLabel="Laying out the steps…"
      />
    );
  }
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
    const pct = Math.round((score / (rounds.length || 1)) * 100);
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        {pct >= 70 && <ConfettiBurst />}
        <span className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)' }}>
          <Trophy className="w-8 h-8" style={{ color: '#0A2443' }} />
        </span>
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">
          {pct >= 90 ? 'You knew the order cold.' : pct >= 70 ? 'Good sense of the sequence.' : 'The order is the hard part.'}
        </h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>
          You scored <span className="font-bold" style={{ color: 'var(--good)' }}>{pct}%</span> across {rounds.length} flows.
        </p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button
            onClick={() => router.push(`/games/build-the-flow?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)}
            className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            <RotateCcw className="w-4 h-4" /> New round
          </button>
        </div>
      </main>
    );
  }

  const shown = revealed ? round.steps.map((_, i) => i) : order;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
        <div className="flex items-center gap-2">
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>{idx + 1} / {rounds.length}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
            Tries left: <span style={{ color: attempts >= MAX_ATTEMPTS ? '#E5484D' : 'var(--good)' }}>{Math.max(0, MAX_ATTEMPTS - attempts)}</span>
          </span>
        </div>
      </div>

      <GameInstructions className="mb-3" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

      <GameTopic topic={topic} className="mb-3" />

      <div className="text-center mb-2">
        <h1 className="font-display font-bold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(16px,2.2vw,20px)' }}>
          {round.goal}
        </h1>
      </div>
      {/* These read like real internal processes, so say plainly that they aren't. */}
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-dim)' }}>
        <Workflow className="w-3 h-3" />
        Simulated workflow · written for practice
      </p>

      <ol className="space-y-2">
        {shown.map((orig, pos) => {
          const step = round.steps[orig];
          const rightHere = done && orig === pos;
          const wrongHere = revealed && orig !== pos;
          return (
            <li
              key={orig}
              draggable={!done}
              onDragStart={() => { dragFrom.current = pos; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragFrom.current !== null) move(dragFrom.current, pos); dragFrom.current = null; }}
              className={`rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all ${done ? '' : 'cursor-grab active:cursor-grabbing'} ${
                rightHere ? 'ring-2 ring-green-400' : wrongHere ? 'ring-2 ring-red-300' : ''
              }`}
              style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}
            >
              <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0 text-white" style={{ background: done ? (rightHere ? 'var(--good, #22C55E)' : '#E5484D') : 'var(--accent)' }}>
                {pos + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-ink dark:text-slate-200">{step.text}</span>
                {/* The reason only appears once the round is over — it names the
                    dependency, which is the answer. */}
                {done && step.why && (
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{step.why}</span>
                )}
              </span>
              {!done && (
                <span className="flex items-center gap-1 shrink-0">
                  {/* Arrows as well as drag: HTML5 drag does not work on touch, and
                      this is played on phones. */}
                  <button type="button" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label="Move up"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1} aria-label="Move down"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 hidden sm:block" style={{ color: 'var(--ink-dim)' }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!done ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button onClick={check} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-8 font-bold">
            <Check className="w-4 h-4" /> Check the order
          </button>
          {lastCorrect !== null && (
            <p className="cine-rise text-sm font-semibold" style={{ color: '#E5484D' }}>
              {lastCorrect === 0
                ? 'None of them are in the right place yet.'
                : `${lastCorrect} of ${total} are in the right place — but not which ones.`}
              {' '}
              <span style={{ color: 'var(--ink-dim)' }}>
                {MAX_ATTEMPTS - attempts} {MAX_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left.
              </span>
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>Take your time — nothing is timed.</p>
        </div>
      ) : (
        <div className="cine-rise mt-5 rounded-2xl p-5 text-center" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-1 inline-flex items-center gap-2" style={{ color: solved ? 'var(--good)' : '#E5484D' }}>
            {solved
              ? <><Check className="w-4 h-4" /> Right{attempts === 1 ? ' first time' : ` on try ${attempts}`}</>
              : <><X className="w-4 h-4" /> Out of tries — here is the order</>}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>
            {solved
              ? 'Each step now shows why it belongs where it does.'
              : 'Read the reasons under each step. The dependency is the thing worth remembering, not the list.'}
          </p>
          <button onClick={next} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">
            {idx + 1 >= rounds.length ? 'See results' : 'Next flow'} <Sparkles className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  );
}

export default function BuildTheFlowPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={Workflow} title="Build the Flow" subtitle="Put the steps in the order they happen" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <BuildTheFlow />
      </Suspense>
    </CinematicFrame>
  );
}
