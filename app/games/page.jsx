'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import {
  Gamepad2, Swords, Search, Timer, Waves, ArrowRight, Sparkles, Wand2,
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
// Rounds are GENERATED, the way lessons are. There used to be a three-state `topic`
// flag ('required' | 'optional' | 'none') and, briefly, a `bank` flag for games that
// shipped curated questions — both gone, because they made step 2 behave differently
// depending on which game you'd picked, which is what left Rachel thinking Games had
// locked her out after two plays (#219).
//
// One rule now: a game is built from a topic. Type one, or press Surprise me and we
// suggest one from your tasks, goals and projects.
//
// Almost every game generates from a topic. AI or Human is the single exception and
// is kept on purpose: its premise is telling genuinely human-written text from
// AI-written text, so generating its rounds would destroy what it tests, and nothing
// else in the set teaches that AI writing has tells. It is LABELLED as pre-set rather
// than quietly behaving differently, which is what went wrong in #219.
//
// `teaches` is on every entry because a player choosing between ten games has no way
// to tell what any of them is FOR from a title and a difficulty chip.
//
// The per-game files that remain (speed-round/questions.js, hallucination-hunt/
// rounds.js, prompt-battle/scenarios.js) are now only reached by a direct URL with no
// topic param. They stay as that fallback rather than leaving those routes broken.
const CATALOG = [
  { slug: 'speed-round', icon: Timer, title: 'Speed Round', time: '3-5 min', generates: true,
    teaches: 'Fast recall of the basics',
    description: 'Rapid-fire multiple choice. 10 questions, 15 seconds each.' },
  { slug: 'lily-leap', icon: Waves, title: 'Lily Leap', time: '3-5 min', generates: true,
    teaches: 'Quick judgment, one call at a time',
    description: 'Jump across the pond by landing on the right answers.' },
  // Kept deliberately, as the one game with PRE-SET rounds. It teaches the thing
  // nothing else here does — that AI writing has tells — and it cannot be generated
  // without destroying what it tests, so the honest move is to label it rather than
  // replace it.
  { slug: 'ai-or-human', icon: Eye, title: 'AI or Human?', time: '3-5 min', generates: false,
    teaches: 'Spotting the tells in AI writing',
    description: 'Can you tell which text was written by AI and which by a human?' },
  { slug: 'two-truths', icon: ScanSearch, title: 'Two Truths & a Lie', time: '3-5 min', generates: true,
    teaches: 'Catching a false claim',
    description: 'Spot the false claim among three.' },
  { slug: 'wheel-of-fortune', icon: Disc3, title: 'Wheel of Fortune', time: '5-8 min', generates: true,
    teaches: 'The vocabulary of AI work',
    description: 'Spin and guess letters to uncover a hidden phrase.' },
  { slug: 'prompt-battle', icon: Swords, title: 'Prompt Battle', time: '5-10 min', generates: true,
    teaches: 'Writing a prompt that works',
    description: 'Write the sharpest prompt for a scenario and let AI score it.' },
  { slug: 'family-feud', icon: Users, title: 'Family Feud', time: '5-8 min', generates: true,
    teaches: 'The answers most people reach for',
    description: 'Guess the top survey answers before three strikes.' },
  { slug: 'jeopardy', icon: LayoutGrid, title: 'Jeopardy', time: '8-12 min', generates: true,
    teaches: 'Breadth across a whole topic',
    description: 'A 5-category board of clues — answer in the form of a question.' },
  { slug: 'millionaire', icon: DollarSign, title: 'Millionaire', time: '5-10 min', generates: true,
    teaches: 'Depth, one step harder each time',
    description: 'Climb a 10-question ladder — how far can you get?' },
  { slug: 'hallucination-hunt', icon: Search, title: 'Hallucination Hunt', time: '5-8 min', generates: true,
    teaches: 'Catching factual errors in AI output',
    description: 'Spot the planted factual errors in an AI answer.' },
].map((g) => ({ ...g, difficulty: gameDifficulty(g.slug) }));

const ORDERED = sortByDifficulty(CATALOG);

// Legacy deep link: /games?make=<generator id> preselected a game back when the
// dropdown owned that id. Keep it working, mapped onto slugs.
const MAKE_ID_TO_SLUG = {
  feud: 'family-feud', halluc: 'hallucination-hunt', jeopardy: 'jeopardy',
  millionaire: 'millionaire', prompt: 'prompt-battle', speed: 'speed-round',
  twotruths: 'two-truths', wheel: 'wheel-of-fortune', lilyleap: 'lily-leap',
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

  // One rule: a game is generated from a topic, so step 2 needs one. Type it, or
  // press Surprise me and we suggest one from your work.
  //
  // AI or Human is the single exception and cannot be otherwise: the game is telling
  // genuinely human-written text from AI-written text, so generating its rounds would
  // destroy the thing being tested. It keeps its hand-written content and needs no
  // topic, which is why it's playable the moment it's picked.
  const canGenerate = selected?.generates !== false;
  const answered = !!selected && (!canGenerate || !!topic.trim());
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

  // Surprise me answers step 2 without making anyone think of a subject: it picks a
  // topic from their tasks, goals and projects (lib/game-topics.js) and drops it in
  // the field, where they can see it and edit it before playing.
  //
  // It does NOT play a curated set. Rounds are generated on the spot, the same way
  // lessons are — so a game is always about something the player chose or accepted,
  // never a generic bank.
  function surprise() {
    setTopic(samples[sampleIdx % samples.length]);
    setSampleIdx((i) => i + 1);
    setTopicNudge(false);
  }

  return (
    <main className="max-w-5xl mx-auto px-6 pt-6 pb-12 sm:pb-16">
      <CinematicPageHero
        eyebrow="Games"
        title="Learning Games"
        subtitle="Pick a game, give it a topic, and we build the round around it."
        icon={Gamepad2}
        gradient
      />
      <p className="text-xs mb-8" style={{ color: 'var(--ink-dim)' }}>
        Every round is built for the topic you give it, so the questions are new each time you play.
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
          {/* Required wherever a topic is what builds the round, which is everywhere
              except AI or Human. */}
          {canGenerate && (
            <span className="font-medium normal-case tracking-normal" style={{ color: 'var(--accent)' }}>— required</span>
          )}
        </p>

        <div className="cine-glass rounded-3xl p-6 sm:p-7">
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={topicRef}
                  value={topic}
                  onChange={(e) => { setTopic(e.target.value); setTopicNudge(false); }}
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
              <p className="text-xs mt-3" style={{ color: 'var(--ink-dim)' }}>
                {canGenerate
                  ? 'Name a topic, or press Surprise me and we will suggest one from your tasks, goals and projects. Every round is built fresh for it.'
                  : `${selected?.title || 'This game'} uses PRE-SET rounds, not a topic. It compares real human writing with AI writing, so the examples are hand-written by us, and each play shuffles a fresh 10 out of the pool. Just press Play.`}
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
