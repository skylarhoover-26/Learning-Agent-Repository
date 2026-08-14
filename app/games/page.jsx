'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import {
  Gamepad2, Swords, Search, Timer, Eye, ArrowRight, Sparkles, Wand2,
  Users, LayoutGrid, DollarSign, ScanSearch, Disc3, ArrowUp,
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
// Two independent facts per game, replacing a single three-state `topic` flag
// ('required' | 'optional' | 'none'). That flag conflated "can this be generated?"
// with "does this ship content?", which is what made step 2 behave differently on
// different games and left Rachel thinking Games had locked her out (#219).
//
//   generates — a topic can drive the round's content (everything but AI or Human,
//               whose premise is genuinely human-written text to compare against)
//   bank      — ships curated, reviewed content that can be played as-is
//
// The rule the learner sees is now the same everywhere: step 2 always needs an
// answer. Type a topic, or press Surprise me — which fills in a topic for a game
// that generates, and plays the curated set for a game that has one.
const CATALOG = [
  { slug: 'speed-round', icon: Timer, title: 'Speed Round', time: '3-5 min', generates: true, bank: true,
    description: 'Rapid-fire multiple choice. 10 questions, 15 seconds each.' },
  { slug: 'ai-or-human', icon: Eye, title: 'AI or Human?', time: '3-5 min', generates: false, bank: true,
    description: 'Can you tell which text was written by AI and which by a human?' },
  { slug: 'two-truths', icon: ScanSearch, title: 'Two Truths & a Lie', time: '3-5 min', generates: true, bank: false,
    description: 'Spot the false claim among three.' },
  { slug: 'wheel-of-fortune', icon: Disc3, title: 'Wheel of Fortune', time: '5-8 min', generates: true, bank: false,
    description: 'Spin and guess letters to uncover a hidden phrase.' },
  { slug: 'prompt-battle', icon: Swords, title: 'Prompt Battle', time: '5-10 min', generates: true, bank: true,
    description: 'Write the sharpest prompt for a scenario and let AI score it.' },
  { slug: 'family-feud', icon: Users, title: 'Family Feud', time: '5-8 min', generates: true, bank: false,
    description: 'Guess the top survey answers before three strikes.' },
  { slug: 'jeopardy', icon: LayoutGrid, title: 'Jeopardy', time: '8-12 min', generates: true, bank: false,
    description: 'A 5-category board of clues — answer in the form of a question.' },
  { slug: 'millionaire', icon: DollarSign, title: 'Millionaire', time: '5-10 min', generates: true, bank: false,
    description: 'Climb a 10-question ladder — how far can you get?' },
  { slug: 'hallucination-hunt', icon: Search, title: 'Hallucination Hunt', time: '5-8 min', generates: true, bank: true,
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
  const { profile, workProjects } = useProfile();
  // Projects count alongside tasks and goals in what "Surprise me" offers.
  const samples = useMemo(() => buildGameTopics(profile, workProjects), [profile, workProjects]);

  const [allStats, setAllStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState('');
  const [sampleIdx, setSampleIdx] = useState(0);
  // Highlights the topic field after someone presses Play without one.
  const [topicNudge, setTopicNudge] = useState(false);
  // "Play the curated set" — the other way to answer step 2, for games that ship one.
  const [useBank, setUseBank] = useState(false);
  const topicRef = useRef(null);

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

  // One rule for every game: step 2 needs an answer before you can play. It's
  // satisfied either by a typed topic or by pressing Surprise me, which means
  // "pick one for me" on a game that generates and "play your curated set" on a
  // game that has one.
  const canGenerate = selected?.generates !== false;
  const hasBank = !!selected?.bank;
  const answered = !!selected && (!!topic.trim() || useBank);
  const canPlay = answered;
  // Play is BLOCKED, not disabled — see the button below. Feedback #219: Rachel
  // played two games that need no topic, hit one that does, saw a greyed-out Play
  // and concluded she'd been locked out of Games after two plays. That reading is
  // completely fair: this app greys things out when they're LOCKED (avatar items
  // behind levels, "Coming soon" menu entries), so a dimmed button means "not
  // yours yet" long before it means "you missed a field".
  const topicMissing = !!selected && !answered;

  function play() {
    if (!selected) return;
    // Blocked by a missing topic: take her TO the field instead of refusing. A
    // click that appears to do nothing is what makes a button feel locked.
    if (topicMissing) {
      setTopicNudge(true);
      topicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      topicRef.current?.focus();
      return;
    }
    const t = topic.trim();
    // No topic in the URL means "play the curated set" — which is what the game
    // pages already do when they see no topic param.
    const qs = canGenerate && t ? `?topic=${encodeURIComponent(t)}` : '';
    router.push(`/games/${selected.slug}${qs}`);
  }

  // Surprise me answers step 2 without making anyone think of a subject. What that
  // means depends on what the game HAS, which is the one place the two kinds of game
  // still differ — and the helper text under the field says which you'll get.
  function surprise() {
    if (hasBank) {
      // Curated content exists: play it. Instant, reviewed, and it keeps the 400+
      // hand-written questions in the repo doing their job.
      setTopic('');
      setUseBank(true);
      setTopicNudge(false);
      return;
    }
    setUseBank(false);
    setTopic(samples[sampleIdx % samples.length]);
    setSampleIdx((i) => i + 1);
    setTopicNudge(false);
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

      {/* Switching games clears step 2. "Playing our built-in set" carried over from
          Speed Round to Jeopardy would be a promise we can't keep — Jeopardy has no
          set — and a topic typed for one game rarely suits the next. */}
      <GamePicker
        games={ORDERED}
        selectedSlug={selected?.slug || null}
        onSelect={(game) => {
          setSelected(game);
          setTopic('');
          setUseBank(false);
          setTopicNudge(false);
        }}
        stats={allStats}
      />

      {/* Step 2 stays visible but inert until a game is picked, so the shape of the
          flow is obvious before you've touched anything. */}
      <div className={`mt-8 transition-opacity ${selected ? '' : 'opacity-50 pointer-events-none'}`}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>2</span>
          Your topic
          {/* Always required now, on every game — one rule instead of three states. */}
          <span className="font-medium normal-case tracking-normal" style={{ color: 'var(--accent)' }}>— required</span>
        </p>

        <div className="cine-glass rounded-3xl p-6 sm:p-7">
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={topicRef}
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); setUseBank(false); setTopicNudge(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canPlay) play(); }}
                  disabled={!canGenerate}
                  placeholder={canGenerate
                    ? `e.g., '${samples[0]}'`
                    : `${selected?.title || 'This game'} always uses its own set`}
                  className={`flex-1 rounded-2xl px-4 py-3.5 text-ink dark:text-slate-100 outline-none focus:ring-2 disabled:opacity-60 ${
                    topicNudge ? 'ring-2 ring-amber-400' : ''
                  }`}
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
              {/* Confirms what pressing it actually did, so "answered" is visible
                  rather than something you infer from the Play button waking up. */}
              {useBank && (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium mt-3" style={{ color: 'var(--accent)' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Playing our built-in set for {selected?.title}.
                </p>
              )}
              <p className="text-xs mt-3" style={{ color: 'var(--ink-dim)' }}>
                {!canGenerate
                  ? `${selected?.title || 'This game'} compares real human writing with AI writing, so its rounds are hand-written. Press Surprise me to play them.`
                  : hasBank
                    ? 'Name a topic for a custom round, or press Surprise me to play our built-in set. Both earn XP.'
                    : 'Name a topic, or press Surprise me and we will pick one from your work. Custom rounds earn XP just like the standard games.'}
              </p>
            </>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center gap-2">
        {/* Only ever disabled before a game is picked, where the whole step-2 panel
            is inert anyway. Once a game IS picked the button stays live and names
            what's missing, because a dimmed button in this app means "locked". */}
        <button
          type="button"
          onClick={play}
          disabled={!selected}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-pill bg-brand text-white font-bold shadow-sm hover:bg-brand-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4" />
          {!selected ? 'Play' : topicMissing ? 'Add a topic to play' : `Play ${selected.title}`}
          <ArrowRight className="w-4 h-4" />
        </button>
        {topicMissing ? (
          // Amber + arrow, the same shape as the lesson player's "complete the
          // activity above to continue" gate, which people already read as
          // "something of yours is missing" rather than "this is off limits".
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <ArrowUp className="w-4 h-4" />
            {canGenerate
              ? 'Type a topic above, or hit Surprise me.'
              : `Hit Surprise me above to play ${selected.title}.`}
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {!selected ? 'Pick a game to get started.' : 'How to play comes up next, before anything starts.'}
          </p>
        )}
      </div>
    </main>
  );
}
