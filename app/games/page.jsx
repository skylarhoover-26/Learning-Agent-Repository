'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import {
  Gamepad2, Swords, Search, Timer, Eye, ChevronRight, Clock, BarChart3, Trophy, Zap,
} from 'lucide-react';
import { getGameStats } from '@/lib/game-store';
import { maxGameXp } from '@/lib/progression';
import { sortByDifficulty } from '@/lib/difficulty';

// Difficulty → glow (card hover, matches Library) + badge, on the green/orange/
// red scale: easy green, medium orange, hard red.
const DIFF = {
  Easy: { glow: '#22C55E', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400' },
  Medium: { glow: '#F59E0B', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400' },
  Hard: { glow: '#EF4444', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400' },
};

const GAMES = [
  {
    slug: 'prompt-battle',
    icon: Swords,
    title: 'Prompt Battle',
    description:
      'Get a scenario, write your best prompt, and let AI score it on clarity, specificity, and effectiveness.',
    difficulty: 'Medium',
    difficultyColor: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200',
    time: '5-10 min',
  },
  {
    slug: 'hallucination-hunt',
    icon: Search,
    title: 'Hallucination Hunt',
    description:
      'Spot the factual errors hiding in AI-generated responses. Click the sentences you think are wrong.',
    difficulty: 'Hard',
    difficultyColor: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    time: '5-8 min',
  },
  {
    slug: 'speed-round',
    icon: Timer,
    title: 'Speed Round',
    description:
      'Rapid-fire multiple choice on AI concepts. 10 questions, 15 seconds each. How fast can you go?',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    time: '3-5 min',
  },
  {
    slug: 'ai-or-human',
    icon: Eye,
    title: 'AI or Human?',
    description:
      'Can you tell which text was written by AI and which by a human?',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    time: '3-5 min',
  },
];

// Show games easy → hard so the difficulty signal reads consistently.
const ORDERED_GAMES = sortByDifficulty(GAMES);

export default function GamesHub() {
  return <CinematicFrame><GamesHubInner /></CinematicFrame>;
}

function GamesHubInner() {
  const [allStats, setAllStats] = useState({});

  useEffect(() => {
    try {
      const statsMap = {};
      for (const game of GAMES) {
        const s = getGameStats(game.slug);
        if (s && s.gamesPlayed > 0) {
          statsMap[game.slug] = s;
        }
      }
      setAllStats(statsMap);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Gamepad2}
        title="Learning Games"
        subtitle="Practice AI skills the fun way"
      />

      <main className="max-w-6xl mx-auto px-6 pt-6 pb-12 sm:pb-16">
        <CinematicPageHero
          eyebrow="Games"
          title="Learning Games"
          subtitle="Sharpen your AI skills with quick interactive challenges — pick a game and start playing."
          icon={Gamepad2}
          gradient
        />
        <p className="text-xs mb-8" style={{ color: 'var(--ink-dim)' }}>
          Questions are fresh every play — and Hallucination Hunt mixes up its order daily at 8 AM PT.
        </p>

        <div data-tour="page-games" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ORDERED_GAMES.map((game, i) => {
            const gameStats = allStats[game.slug];
            const diff = DIFF[game.difficulty] || DIFF.Medium;
            return (
              <Link
                key={game.slug}
                data-tour={i === 0 ? 'game-card' : undefined}
                href={`/games/${game.slug}`}
                className="group cine-glass cine-tilt rounded-2xl p-6 transition-all flex flex-col"
                style={{ '--accent': diff.glow }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all"
                  style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 32%, transparent)', color: 'var(--accent)' }}
                >
                  <game.icon className="w-7 h-7" />
                </div>

                <h3 className="font-bold text-ink dark:text-slate-200 text-lg mb-1">{game.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 flex-1">{game.description}</p>

                {gameStats && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Best: {gameStats.bestScore} &middot; Played: {gameStats.gamesPlayed}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${diff.badge}`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    {game.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-bg-subtle dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600">
                    <Clock className="w-3 h-3" />
                    {game.time}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  Chance to win up to {maxGameXp(game.slug)} XP
                </div>

                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold text-sm shadow-sm group-hover:bg-cta-600 transition-all self-start">
                  Play
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
