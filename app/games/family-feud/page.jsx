'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Trophy, RotateCcw, X, Check, Sparkles } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import { saveGameResult } from '@/lib/game-store';

const MAX_STRIKES = 3;

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Match a guess to an answer: exact-ish text match, keyword hit, or clean
// containment either way. Lenient so near-misses still count.
function matches(guess, answer) {
  const g = normalize(guess);
  if (!g) return false;
  const text = normalize(answer.text);
  if (g === text) return true;
  if (text.length > 3 && (g.includes(text) || text.includes(g))) return true;
  return (answer.keywords || []).some((k) => {
    const nk = normalize(k);
    return nk.length > 2 && (g.includes(nk) || nk.includes(g));
  });
}

function FamilyFeud() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [rounds, setRounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState(() => new Set());   // indices of revealed answers
  const [strikes, setStrikes] = useState(0);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('Guess the top answers!');
  const [flash, setFlash] = useState(null);              // 'strike' | 'hit'
  const [roundDone, setRoundDone] = useState(false);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feud', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setRounds(d.rounds); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const round = rounds?.[idx];
  const answers = round?.answers || [];

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('family-feud', { score: total, total: rounds?.length || 0, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, total, rounds, topic]);

  function endRound(revealAll) {
    setRoundDone(true);
    if (revealAll) setMessage('Round over — here are the rest.');
    else setMessage('Board cleared! Nice work.');
  }

  function submitGuess() {
    if (roundDone || !guess.trim()) return;
    const hitIdx = answers.findIndex((a, i) => !found.has(i) && matches(guess, a));
    setGuess('');
    if (hitIdx >= 0) {
      const next = new Set(found); next.add(hitIdx);
      setFound(next);
      setTotal((t) => t + answers[hitIdx].points);
      setFlash('hit'); setTimeout(() => setFlash(null), 500);
      if (next.size === answers.length) { endRound(false); return; }
      setMessage(`Got it — “${answers[hitIdx].text}” for ${answers[hitIdx].points}!`);
    } else {
      const s = strikes + 1;
      setStrikes(s);
      setFlash('strike'); setTimeout(() => setFlash(null), 500);
      if (s >= MAX_STRIKES) { endRound(true); return; }
      setMessage(`That's not on the board. Strike ${s} of ${MAX_STRIKES}.`);
    }
  }

  function nextRound() {
    if (idx + 1 >= (rounds?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setFound(new Set());
    setStrikes(0);
    setGuess('');
    setRoundDone(false);
    setMessage('Guess the top answers!');
  }

  // ---- states ----
  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Family Feud round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (loading) return <main className="max-w-2xl mx-auto px-6 pt-10"><GameGenLoading label={`Building your Family Feud on ${topic}…`} estimateSeconds={18} /></main>;
  if (error || !round) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">Couldn&rsquo;t build the survey</h1>
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
        <h2 className="font-display font-extrabold text-3xl text-ink dark:text-slate-100">Survey says… great job!</h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>You scored <span className="font-bold" style={{ color: 'var(--good)' }}>{total.toLocaleString()}</span> across {rounds.length} rounds.</p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button onClick={() => router.push(`/games/family-feud?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)} className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
            <RotateCcw className="w-4 h-4" /> New survey
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
          <span className="cine-glass rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: 'var(--ink-dim)' }}>Round {idx + 1} / {rounds.length}</span>
          <span className="cine-glass rounded-full px-4 py-1.5 font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>
            Score: <span style={{ color: 'var(--good)' }}>{total.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="text-center mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Family Feud · survey says</div>
        <h1 className="font-display font-extrabold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(20px,3vw,28px)' }}>{round.question}</h1>
      </div>

      {/* Answer board */}
      <div className="space-y-2 mb-5">
        {answers.map((a, i) => {
          const revealed = found.has(i) || roundDone;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
              style={revealed
                ? { background: found.has(i) ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--card, #fff)', color: found.has(i) ? '#fff' : 'var(--ink)', border: found.has(i) ? 'none' : '1px solid var(--line)' }
                : { background: 'var(--card, #fff)', border: '1px solid var(--line)' }}
            >
              <span className="w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0" style={{ background: revealed && found.has(i) ? 'rgba(255,255,255,.25)' : 'var(--line)', color: revealed && found.has(i) ? '#fff' : 'var(--ink-dim)' }}>{i + 1}</span>
              <span className="flex-1 font-display font-bold" style={!revealed ? { color: 'var(--ink-dim)', letterSpacing: '.3em' } : undefined}>
                {revealed ? a.text : '• • • • •'}
              </span>
              {revealed && <span className="font-display font-extrabold">{a.points}</span>}
            </div>
          );
        })}
      </div>

      {/* Strikes */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {Array.from({ length: MAX_STRIKES }).map((_, i) => (
          <span key={i} className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: i < strikes ? 'rgba(229,72,77,.14)' : 'var(--line)', color: i < strikes ? '#E5484D' : 'var(--ink-dim)', opacity: i < strikes ? 1 : 0.5 }}>
            <X className="w-4 h-4" strokeWidth={i < strikes ? 3 : 2} />
          </span>
        ))}
      </div>

      <p className="text-center text-sm mb-4 min-h-[20px]" style={{ color: flash === 'strike' ? '#E5484D' : flash === 'hit' ? 'var(--good)' : 'var(--ink-dim)' }}>{message}</p>

      {roundDone ? (
        <div className="text-center">
          <button onClick={nextRound} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-7 font-semibold">
            {idx + 1 >= rounds.length ? 'See results' : 'Next round'} <Sparkles className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            autoFocus
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitGuess(); }}
            placeholder="Type an answer…"
            className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-ink dark:text-slate-100 bg-transparent outline-none focus:ring-4"
            style={{ border: '1px solid var(--line)', '--tw-ring-color': 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
          />
          <button onClick={submitGuess} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold"><Check className="w-4 h-4" /> Guess</button>
        </div>
      )}
    </main>
  );
}

export default function FamilyFeudPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={Users} title="Family Feud" subtitle="Guess the top survey answers about AI" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <FamilyFeud />
      </Suspense>
    </CinematicFrame>
  );
}
