'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, RotateCcw, Sparkles, ShieldAlert, Check, X, Eye } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import GameGenLoading from '@/components/game-gen-loading';
import ConfettiBurst from '@/components/confetti-burst';
import GameInstructions from '@/components/game-instructions';
import GameStartScreen from '@/components/game-start-screen';
import { saveGameResult } from '@/lib/game-store';

// Tap what you would strip out of a real message before pasting it into an AI tool.
//
// Data Privacy is a skill on the heatmap with no game attached, and it is the one
// where being wrong at work actually costs something. Over-redaction is scored too:
// a game that only rewards deleting things teaches paranoia, not judgment, and the
// person who redacts the actual question gets no help from the AI either.
const HOW_TO_PLAY = [
  'You are about to paste a real piece of work text into an AI tool.',
  'Tap every word you should remove first — names, contact details, account numbers, anything internal.',
  'Leave the parts the AI actually needs, like the question and the error message.',
  'Check your work to see what you caught, what you missed, and anything you removed that was safe.',
];

// The passage is split into tappable words client-side, and a word counts as
// sensitive when it OVERLAPS one of the spans the generator quoted. Splitting the
// text at the sensitive boundaries instead would draw a box around every answer
// before the player touched anything.
function tokenize(text, sensitive) {
  const spans = [];
  for (const s of sensitive || []) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(s, from);
      if (i === -1) break;
      spans.push([i, i + s.length]);
      from = i + s.length;
    }
  }
  const overlaps = (a, b) => spans.some(([x, y]) => a < y && b > x);

  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) {
    tokens.push({ text: m[0], sensitive: overlaps(m.index, m.index + m[0].length) });
  }
  return tokens;
}

function RedactIt() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = params.get('topic') || '';

  const [rounds, setRounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  const [idx, setIdx] = useState(0);
  const [tapped, setTapped] = useState(() => new Set());
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!topic) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError(null);
    fetch('/api/games/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'redact', topic }),
    })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); return d; })
      .then((d) => { if (live) { setRounds(d.rounds); setLoading(false); } })
      .catch((e) => { if (live) { setError(e.message); setLoading(false); } });
    return () => { live = false; };
  }, [topic]);

  const round = rounds?.[idx];
  const tokens = useMemo(
    () => (round ? tokenize(round.text, round.sensitive) : []),
    [round],
  );
  const hotCount = tokens.filter((t) => t.sensitive).length;
  const caught = tokens.filter((t, i) => t.sensitive && tapped.has(i)).length;
  const overTapped = tokens.filter((t, i) => !t.sensitive && tapped.has(i)).length;

  useEffect(() => {
    if (!gameOver || savedRef.current) return;
    savedRef.current = true;
    try { saveGameResult('redact-it', { score, total: rounds?.length || 0, custom: true, topic }); } catch { /* no localStorage */ }
  }, [gameOver, score, rounds, topic]);

  function toggle(i) {
    if (revealed) return;
    setTapped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function check() {
    if (revealed) return;
    setRevealed(true);
    // A clean round is everything sensitive caught and nothing safe removed. Partial
    // credit for catching most of it, minus what was over-removed — scaled to the
    // round so one long passage can't outweigh the rest.
    const perRound = Math.max(0, (caught - overTapped * 0.5) / Math.max(1, hotCount));
    setScore((s) => s + perRound);
  }

  function next() {
    if (idx + 1 >= (rounds?.length || 0)) { setGameOver(true); return; }
    setIdx((i) => i + 1);
    setTapped(new Set());
    setRevealed(false);
  }

  if (!topic) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="font-display font-bold text-2xl text-ink dark:text-slate-100 mb-2">No topic yet</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Start a Redact It round from the games page.</p>
        <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">Back to games</Link>
      </main>
    );
  }
  if (!started && !error) {
    return (
      <GameStartScreen
        slug="redact-it"
        icon={ShieldAlert}
        title="Redact It"
        subtitle={`on ${topic}`}
        steps={HOW_TO_PLAY}
        loading={loading}
        ready={!!round}
        onStart={() => setStarted(true)}
        loadingLabel="Writing your messages…"
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
          {pct >= 90 ? 'Nothing got through.' : pct >= 70 ? 'Safe enough to send.' : 'Some of that should not have left the building.'}
        </h2>
        <p className="mt-2 text-lg" style={{ color: 'var(--ink-dim)' }}>
          You redacted <span className="font-bold" style={{ color: 'var(--good)' }}>{pct}%</span> as well as you could have.
        </p>
        <div className="flex gap-3 justify-center mt-7">
          <Link href="/games" className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">Back to games</Link>
          <button
            onClick={() => router.push(`/games/redact-it?topic=${encodeURIComponent(topic)}&r=${Date.now()}`)}
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
            Removed: <span style={{ color: 'var(--accent)' }}>{tapped.size}</span>
          </span>
        </div>
      </div>

      <GameInstructions className="mb-4" steps={HOW_TO_PLAY} collapsible defaultOpen={false} />

      <div className="text-center mb-4">
        <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-1" style={{ color: 'var(--accent)' }}>Redact It · {topic}</div>
        <h1 className="font-display font-bold tracking-tight text-ink dark:text-slate-100" style={{ fontSize: 'clamp(16px,2.2vw,20px)' }}>
          {round.context}
        </h1>
      </div>

      {/* The passage. Every word is tappable, so nothing about the layout hints at
          which ones matter. */}
      <div className="cine-glass rounded-2xl p-5 sm:p-6 leading-relaxed">
        {tokens.map((tk, i) => {
          const isTapped = tapped.has(i);
          let cls = 'rounded px-0.5 transition-colors';
          if (!revealed) {
            cls += isTapped
              ? ' bg-slate-800 text-slate-800 dark:bg-slate-200 dark:text-slate-200 line-through decoration-2'
              : ' hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer';
          } else if (tk.sensitive && isTapped) {
            cls += ' bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 line-through';
          } else if (tk.sensitive && !isTapped) {
            cls += ' bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-semibold';
          } else if (isTapped) {
            cls += ' bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
          } else {
            cls += ' text-ink dark:text-slate-200';
          }
          return (
            <span key={i}>
              <button type="button" onClick={() => toggle(i)} disabled={revealed} className={cls}>
                {tk.text}
              </button>{' '}
            </span>
          );
        })}
      </div>

      {!revealed ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button onClick={check} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-8 font-bold">
            <Eye className="w-4 h-4" /> Check my redaction
          </button>
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>Tap a word again to put it back.</p>
        </div>
      ) : (
        <div className="cine-rise mt-5 rounded-2xl p-5" style={{ background: 'var(--card, #fff)', border: '1px solid var(--line)' }}>
          <p className="font-bold mb-3 flex items-center gap-2" style={{ color: caught === hotCount && !overTapped ? 'var(--good)' : '#E5484D' }}>
            {caught === hotCount && !overTapped
              ? <><Check className="w-4 h-4" /> Clean — everything sensitive, nothing else.</>
              : <><X className="w-4 h-4" /> Caught {caught} of {hotCount}{overTapped ? `, and removed ${overTapped} that were safe to send` : ''}.</>}
          </p>
          <ul className="space-y-2 mb-4">
            {round.sensitive.map((s) => (
              <li key={s} className="text-sm">
                <span className="font-semibold text-ink dark:text-slate-200">{s}</span>
                {round.why?.[s] && <span style={{ color: 'var(--ink-dim)' }}> — {round.why[s]}</span>}
              </li>
            ))}
          </ul>
          {overTapped > 0 && (
            <p className="text-xs mb-4" style={{ color: 'var(--ink-dim)' }}>
              The parts in amber were safe to share. Removing what the AI needs to understand the problem costs you a useful answer.
            </p>
          )}
          <div className="text-right">
            <button onClick={next} className="cine-pill cine-lift inline-flex items-center gap-2 h-11 px-6 font-semibold">
              {idx + 1 >= rounds.length ? 'See results' : 'Next message'} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RedactItPage() {
  return (
    <CinematicFrame>
      <PageHeader icon={ShieldAlert} title="Redact It" subtitle="Strip what shouldn't go into an AI tool" />
      <Suspense fallback={<main className="max-w-2xl mx-auto px-6 py-24"><GameGenLoading label="Loading…" /></main>}>
        <RedactIt />
      </Suspense>
    </CinematicFrame>
  );
}
