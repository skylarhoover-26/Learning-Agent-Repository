'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import {
  Gamepad2, Swords, Search, Timer, Eye, ArrowRight, Sparkles, Wand2,
  Users, LayoutGrid, DollarSign, ScanSearch, Disc3,
} from 'lucide-react';
import { getGameStats } from '@/lib/game-store';
import { gameDifficulty } from '@/lib/progression';
import { sortByDifficulty } from '@/lib/difficulty';
import { useProfile } from '@/components/profile-provider';
import { buildGameTopics } from '@/lib/game-topics';
import GamePicker from '@/components/game-picker';

// One catalog for every game. This used to be two lists that drifted: a 4-card
// GAMES array here and an 8-entry GAME_TYPES in the generator component, each with
// its own hand-typed difficulty. `difficulty` is now derived from lib/progression,
// which is the same source the XP award uses — so a card can't claim "Easy · 20 XP"
// while progression pays out medium.
//
// `topic` is the real difference between these games:
//   'required' — no built-in content; the round is generated from a topic
//   'optional' — ships a question bank, and a topic swaps in a custom round
//   'none'     — can't be generated at all (AI or Human needs real human writing)
const CATALOG = [
  { slug: 'speed-round', icon: Timer, title: 'Speed Round', time: '3-5 min', topic: 'optional',
    description: 'Rapid-fire multiple choice. 10 questions, 15 seconds each.' },
  { slug: 'ai-or-human', icon: Eye, title: 'AI or Human?', time: '3-5 min', topic: 'none',
    description: 'Can you tell which text was written by AI and which by a human?' },
  { slug: 'two-truths', icon: ScanSearch, title: 'Two Truths & a Lie', time: '3-5 min', topic: 'required',
    description: 'Spot the false claim among three.' },
  { slug: 'wheel-of-fortune', icon: Disc3, title: 'Wheel of Fortune', time: '5-8 min', topic: 'required',
    description: 'Spin and guess letters to uncover a hidden phrase.' },
  { slug: 'prompt-battle', icon: Swords, title: 'Prompt Battle', time: '5-10 min', topic: 'optional',
    description: 'Write the sharpest prompt for a scenario and let AI score it.' },
  { slug: 'family-feud', icon: Users, title: 'Family Feud', time: '5-8 min', topic: 'required',
    description: 'Guess the top survey answers before three strikes.' },
  { slug: 'jeopardy', icon: LayoutGrid, title: 'Jeopardy', time: '8-12 min', topic: 'required',
    description: 'A 5-category board of clues — answer in the form of a question.' },
  { slug: 'millionaire', icon: DollarSign, title: 'Millionaire', time: '5-10 min', topic: 'required',
    description: 'Climb a 10-question ladder — how far can you get?' },
  { slug: 'hallucination-hunt', icon: Search, title: 'Hallucination Hunt', time: '5-8 min', topic: 'optional',
    description: 'Spot the planted factual errors in an AI answer.' },
].map((g) => ({ ...g, difficulty: gameDifficulty(g.slug) }));

const ORDERED = sortByDifficulty(CATALOG);

// Legacy deep link: /games?make=<generator id> preselected a game back when the
// dropdown owned that id. Keep it working, mapped onto slugs.
const MAKE_ID_TO_SLUG = {
  feud: 'family-feud', halluc: 'hallucination-hunt', jeopardy: 'jeopardy',
  millionaire: 'millionaire', prompt: 'prompt-battle', speed: 'speed-round',
  twotruths: 'two-truths', wheel: 'wheel-of-fortune',
};

export default function GamesHub() {
  return (
    <CinematicFrame>
      <PageHeader icon={Gamepad2} title="Learning Games" subtitle="Practice AI skills the fun way" />
      <Suspense fallback={null}>
        <GamesHubInner />
      </Suspense>
    </CinematicFrame>
  );
}

function GamesHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const samples = useMemo(() => buildGameTopics(profile), [profile]);

  const [allStats, setAllStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState('');
  const [sampleIdx, setSampleIdx] = useState(0);

  useEffect(() => {
    try {
      const statsMap = {};
      for (const game of CATALOG) {
        const s = getGameStats(game.slug);
        if (s && s.gamesPlayed > 0) statsMap[game.slug] = s;
      }
      setAllStats(statsMap);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const makeSlug = MAKE_ID_TO_SLUG[searchParams.get('make')] || null;
  useEffect(() => {
    if (!makeSlug) return;
    const match = CATALOG.find((g) => g.slug === makeSlug);
    if (match) setSelected(match);
  }, [makeSlug]);

  const needsTopic = selected?.topic === 'required';
  const takesTopic = selected && selected.topic !== 'none';
  const canPlay = selected && (!needsTopic || topic.trim());

  function play() {
    if (!canPlay) return;
    const t = topic.trim();
    const qs = takesTopic && t ? `?topic=${encodeURIComponent(t)}` : '';
    router.push(`/games/${selected.slug}${qs}`);
  }

  function surprise() {
    setTopic(samples[sampleIdx % samples.length]);
    setSampleIdx((i) => i + 1);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 pt-6 pb-12 sm:pb-16">
      <CinematicPageHero
        eyebrow="Games"
        title="Learning Games"
        subtitle="Pick a game, give it a topic if you want one, and play."
        icon={Gamepad2}
        gradient
      />
      <p className="text-xs mb-8" style={{ color: 'var(--ink-dim)' }}>
        Questions are fresh every play — and Hallucination Hunt mixes up its order daily at 8 AM PT.
      </p>

      <GamePicker games={ORDERED} selectedSlug={selected?.slug || null} onSelect={setSelected} stats={allStats} />

      {/* Step 2 stays visible but inert until a game is picked, so the shape of the
          flow is obvious before you've touched anything. */}
      <div className={`mt-8 transition-opacity ${selected ? '' : 'opacity-50 pointer-events-none'}`}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>2</span>
          Your topic
          {selected?.topic === 'optional' && <span className="font-medium normal-case tracking-normal">— optional</span>}
        </p>

        <div className="cine-glass rounded-3xl p-6 sm:p-7">
          {selected?.topic === 'none' ? (
            <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
              {selected.title} uses its own hand-written set — no topic needed. Hit play.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canPlay) play(); }}
                  placeholder={`e.g., '${samples[0]}'`}
                  className="flex-1 rounded-2xl px-4 py-3.5 text-ink dark:text-slate-100 outline-none focus:ring-2"
                  style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
                />
                <button
                  type="button"
                  onClick={surprise}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-pill bg-cta text-ink font-semibold text-sm shadow-sm hover:bg-cta-600 transition-all shrink-0"
                >
                  <Sparkles className="w-4 h-4" /> Surprise me
                </button>
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--ink-dim)' }}>
                {selected?.topic === 'optional'
                  ? 'Leave it blank to play our built-in set, or name a topic for a custom round.'
                  : 'Custom rounds earn XP just like the standard games, every time you play.'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={play}
          disabled={!canPlay}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-pill bg-brand text-white font-bold shadow-sm hover:bg-brand-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4" />
          {selected ? `Play ${selected.title}` : 'Play'}
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          {!selected
            ? 'Pick a game to get started.'
            : needsTopic && !topic.trim()
              ? 'Give it a topic first — this one builds its round from what you name.'
              : 'How to play comes up next, before anything starts.'}
        </p>
      </div>
    </main>
  );
}
