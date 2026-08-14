'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import {
  Gamepad2, Swords, Search, Timer, Waves, Eye, ArrowRight, Sparkles, Wand2,
  Users, LayoutGrid, DollarSign, ScanSearch, Disc3, ArrowUp, Workflow, ShieldAlert,
} from 'lucide-react';
import { getGameStats } from '@/lib/game-store';
import { gameDifficulty } from '@/lib/progression';
import { sortByDifficulty } from '@/lib/difficulty';
import { useProfile } from '@/components/profile-provider';
import { buildGameTopics } from '@/lib/game-topics';
import GamePicker from '@/components/game-picker';
import TopicCardGrid, { TopicGridSkeleton } from '@/components/topic-card-grid';
import LadderRow from '@/components/wizard-ladder-row';
import { useSuggestedTopics } from '@/components/use-suggested-topics';

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
  { slug: 'build-the-flow', icon: Workflow, title: 'Build the Flow', time: '4-7 min', generates: true,
    teaches: 'What has to happen before what',
    description: 'Put the steps of a simulated workflow back in order.' },
  { slug: 'redact-it', icon: ShieldAlert, title: 'Redact It', time: '4-7 min', generates: true,
    teaches: 'What is safe to paste into AI',
    description: 'Strip the sensitive parts out of a simulated message before sharing it.' },
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
  flow: 'build-the-flow', redact: 'redact-it',
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

  // Two screens rather than one long scroll, matching the lesson wizard: pick a
  // game, then pick a topic. On one page the topic panel sat below the fold, which
  // is half of why the topic requirement kept surprising people (#219) — you had to
  // scroll past nine cards to discover the thing that was blocking Play.
  //
  // Declared BEFORE the suggestions hook, which reads it. `const` is not hoisted, so
  // the other order threw "Cannot access 'step' before initialization" at render —
  // and neither lint nor the build sees it, because the component body only runs in
  // a browser.
  const [step, setStep] = useState(1);

  // Fetched only on the topic screen: nobody should pay a generation while they are
  // still looking at the game grid.
  const { topics: suggestedTopics, loading: suggestionsLoading, fallback: fallbackTopics } =
    useSuggestedTopics({ enabled: step === 2 });
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
    if (match) { setSelected(match); setStep(2); }
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

      {/* Picking a game ADVANCES, the way the lesson format cards do (feedback batch
          3). Switching games also clears the topic: one typed for Jeopardy rarely
          suits Wheel of Fortune. */}
      {step === 1 && (
        <GamePicker
          games={ORDERED}
          selectedSlug={selected?.slug || null}
          onSelect={(game) => {
            setSelected(game);
            setTopic('');
            setTopicNudge(false);
            setStep(2);
          }}
          stats={allStats}
        />
      )}

      {step === 2 && selected && (
      <div>
        {/* What you already chose, with a way back to it. Same row the lesson wizard
            uses — see components/wizard-ladder-row.jsx. */}
        <LadderRow label="Game" value={`${selected.title} · ${selected.time}`} onEdit={() => setStep(1)} />

        {canGenerate && (
        <>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 mt-5" style={{ color: 'var(--ink-dim)' }}>
          Your topic
          <span className="font-medium normal-case tracking-normal" style={{ color: 'var(--accent)' }}>— required</span>
        </p>

        <div className="cine-glass rounded-3xl p-6 sm:p-7">
          {/* The SAME six topics the Lesson picker offers, from the same daily cache.
              A co-worker's idea, and a good one: it makes the two surfaces one thought
              — here is what's worth learning, read it or play it. They come from the
              profile rather than from lesson history, so this works for someone who
              has never opened Lesson, and whichever page they open first pays the
              generation while the other is instant. */}
          {suggestionsLoading && !suggestedTopics ? (
            <TopicGridSkeleton note="Building topics around your role, tasks, goals and projects — about 10 seconds." />
          ) : (
            <TopicCardGrid
              topics={suggestedTopics || fallbackTopics}
              selected={topic}
              onSelect={(s) => { setTopic(s.topic); setTopicNudge(false); }}
            />
          )}

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ink-dim)' }}>
              Or name your own
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={topicRef}
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setTopicNudge(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && canPlay) play(); }}
                placeholder={`e.g., '${samples[0]}'`}
                className={`flex-1 rounded-2xl px-4 py-3.5 text-ink dark:text-slate-100 outline-none focus:ring-2 ${
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
              Pick one above, type your own, or press Surprise me for something from your tasks, goals and projects. Every round is built fresh for it.
            </p>
          </div>
        </div>
        </>
        )}
      </div>
      )}

      {step === 2 && selected && (
      <div className="mt-7 flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          {/* Back belongs here as a pill next to Play, the same pairing the lesson
              wizard and the lesson player use. */}
          <button
            type="button"
            onClick={() => setStep(1)}
            // Same padding and weight as Play beside it, so the pair reads as one
            // control rather than a button and a link.
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-pill cine-glass text-slate-600 dark:text-slate-300 font-bold hover:opacity-80 transition-all"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back
          </button>
          {/* Never disabled: once a game is picked the button stays live and names
              what's missing, because a dimmed button in this app means "locked". */}
          <button
            type="button"
            onClick={play}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-pill bg-brand text-white font-bold shadow-sm hover:bg-brand-600 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            {topicMissing ? 'Add a topic to play' : `Play ${selected.title}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {topicMissing ? (
          // Amber + arrow, the same shape as the lesson player's "complete the
          // activity above to continue" gate, which people already read as
          // "something of yours is missing" rather than "this is off limits".
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <ArrowUp className="w-4 h-4" />
            Pick a topic above, type your own, or hit Surprise me.
          </p>
        ) : (
          <p className="text-xs max-w-md text-center" style={{ color: 'var(--ink-dim)' }}>
            {!canGenerate
              // The transparency that used to live in the topic panel has to land
              // somewhere, so it sits with the button that starts the game.
              ? `${selected.title} uses pre-set rounds instead of a topic. The examples are hand-written by us, and each play shuffles a fresh 10 from the pool.`
              : 'How to play comes up next, before anything starts.'}
          </p>
        )}
      </div>
      )}
    </main>
  );
}
