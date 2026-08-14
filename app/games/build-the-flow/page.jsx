'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, RotateCcw, Sparkles, Workflow, Check, X } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import GameInstructions from '@/components/game-instructions';
import GameStartScreen from '@/components/game-start-screen';
import { saveGameResult } from '@/lib/game-store';

// Steps arrive scrambled; tap them back into order.
//
// Every other game in the set asks "which one is right?". This is the only one that
// asks "what happens before what?", which is most of what using AI at work actually
// is — you rarely fail because you picked the wrong tool, you fail because you ran
// the thing before the thing it depended on.
const HOW_TO_PLAY = [
  'You get the steps of a real workflow, shuffled.',
  'Tap them in the order they have to happen.',
  'Get one wrong and it tells you why that step has to come where it does, then places it for you.',
  'Your score is how many you place correctly first time.',
];

function shuffle(arr) {
  const out = arr.map((v, i) => ({ v, i }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
  const [placed, setPlaced] = useState([]);      // original indexes, in the order placed
  const [wrong, setWrong] = useState(null);      // the index just tapped in error
  const [firstTry, setFirstTry] = useState(0);   // correct-first-time placements this game
  const [attempted, setAttempted] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
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
  // Shuffled once per round, not per render — a list that reorders under your finger
  // is unplayable.
  const shuffled = useMemo(() => (round ? shuffle(round.steps) : []), [round]);
  const total = round?.steps?.length || 0;
  const done = placed.length >= total && total > 0;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('build-the-flow', { score, total: attempted, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, score, attempted, topic]);

  function tap(originalIndex) {
    if (done || placed.includes(originalIndex)) return;
    const expected = placed.length; // the next position to fill
    setAttempted((a) => a + 1);
    if (originalIndex === expected) {
      setPlaced((p) => [...p, originalIndex]);
      setFirstTry((f) => f + 1);
      setScore((s) => s + 1);
      setWrong(null);
      return;
    }
    // Wrong: say why the step that DOES come next belongs here, then place it. A
    // wrong tap that simply refuses teaches nothing and stalls the round.
    setWrong(originalIndex);
    setTimeout(() => {
      setPlaced((p) => (p.length === expected ? [...p, expected] : p));
      setWrong(null);
    }, 1400);
  }

  function next() {
    if (idx + 1 >= (rounds?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setPlaced([]);
    setWrong(null);
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
    const pct = attempted ? Math.round((score / attempted) * 100) : 0;
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
          <span className="font-bold" style={{ color: 'var(--good)' }}>{score}</span> of {attempted} steps placed right first time.
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

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--ink-dim)' }}>
          <ArrowLeft className="w-4 h-4" /> Games
        </Link>
        <div className="flex items-center gap-2">
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>{idx + 1} / {rounds.length}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
            First try: <span style={{ color: 'var(--good)' }}>{firstTry}</span>
          </span>
        </div>
      </div>

      <GameInstructions className="mb-4" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

      <div className="text-center mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Build the Flow · {topic}</div>
        <h1 className="font-display font-bold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(16px,2.2vw,20px)' }}>
          {round.goal}
        </h1>
      </div>

      {/* What's been placed, in order, with the reason each one belongs there. */}
      {placed.length > 0 && (
        <ol className="space-y-2 mb-5">
          {placed.map((orig, pos) => (
            <li key={orig} className="cine-glass rounded-2xl p-4 flex items-start gap-3">
              <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0 text-white" style={{ background: 'var(--good, #22C55E)' }}>
                {pos + 1}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-ink dark:text-slate-200">{round.steps[orig].text}</span>
                {round.steps[orig].why && (
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{round.steps[orig].why}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}

      {!done && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-dim)' }}>
            What happens {placed.length === 0 ? 'first' : 'next'}?
          </p>
          <div className="space-y-2">
            {shuffled.filter(({ i }) => !placed.includes(i)).map(({ v, i }) => {
              const isWrong = wrong === i;
              return (
                <button
                  key={i}
                  onClick={() => tap(i)}
                  disabled={wrong !== null}
                  className={`cine-lift w-full text-left rounded-2xl px-5 py-4 flex items-center gap-3 transition-all disabled:cursor-default ${
                    isWrong ? 'ring-2 ring-red-400' : ''
                  }`}
                  style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}
                >
                  {isWrong
                    ? <X className="w-5 h-5 shrink-0" style={{ color: '#E5484D' }} />
                    : <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--line)' }} />}
                  <span className="flex-1 font-medium text-ink dark:text-slate-200">{v.text}</span>
                </button>
              );
            })}
          </div>
          {wrong !== null && (
            <p className="cine-rise mt-3 text-sm font-medium" style={{ color: '#E5484D' }}>
              Not yet — {round.steps[placed.length]?.why || 'something else has to happen first'}.
            </p>
          )}
        </>
      )}

      {done && (
        <div className="cine-rise rounded-2xl p-5 text-center" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-1 inline-flex items-center gap-2" style={{ color: 'var(--good)' }}>
            <Check className="w-4 h-4" /> Flow complete
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>
            {firstTry} of the steps went in the right place first time.
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
