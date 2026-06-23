'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Gamepad2, Swords, Search, Timer, Eye, ChevronRight, Clock, BarChart3, Trophy, Zap,
} from 'lucide-react';
import { getGameStats } from '@/lib/game-store';
import { maxGameXp } from '@/lib/progression';
import { sortByDifficulty } from '@/lib/difficulty';

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
    <div className="min-h-screen bg-bg-subtle dark:bg-slate-900">
      <PageHeader
        icon={Gamepad2}
        title="Learning Games"
        subtitle="Practice AI skills the fun way"
      />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-slate-600 dark:text-slate-400 mb-2 text-lg">
          Sharpen your AI skills with interactive challenges. Pick a game and start playing.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">
          🔀 Questions are fresh every play — and Hallucination Hunt mixes up its order daily at 8 AM PT.
        </p>

        <div data-tour="page-games" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ORDERED_GAMES.map((game, i) => {
            const gameStats = allStats[game.slug];
            return (
              <Link
                key={game.slug}
                data-tour={i === 0 ? 'game-card' : undefined}
                href={`/games/${game.slug}`}
                className="group bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all flex flex-col"
              >
                <div className="w-14 h-14 rounded-xl bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-all">
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${game.difficultyColor}`}
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
