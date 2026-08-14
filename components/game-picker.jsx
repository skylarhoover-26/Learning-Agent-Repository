'use client';

import { Check, BarChart3, Clock, Zap, Trophy, Sparkles, Target } from 'lucide-react';
import { maxGameXp } from '@/lib/progression';

const DIFF = {
  easy: { label: 'Easy', glow: '#22C55E', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400' },
  medium: { label: 'Medium', glow: '#F59E0B', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400' },
  hard: { label: 'Hard', glow: '#EF4444', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400' },
};

// Step 1 of the games flow: a grid of every game, ordered easy → hard. Selecting
// a card is what advances the flow — there is no second picker. The old page had
// a 4-card grid AND a separate dropdown listing 8 games, so the same game was
// choosable two ways; this is the one place.
//
// This was a horizontal arrow-scroll rail until testers pointed out you could only
// see three of the nine games without pressing an arrow — the back half of the
// catalog (Jeopardy, Millionaire, Hallucination Hunt) was effectively hidden. The
// whole catalog now lays out at once and the cards are correspondingly denser: the
// icon sits inline with the title, the description clamps to two lines, and time
// and XP ride in one meta row instead of separate badge rows.
//
// Selection styling matches the lesson wizard's format tiles (ring + glow + check
// badge) so picking a game reads the same as picking a lesson format.
export default function GamePicker({ games, selectedSlug, onSelect, stats = {} }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>1</span>
          Pick a game
        </p>
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          {games.length} games &middot; easy to hard
        </p>
      </div>

      <div
        data-tour="page-games"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      >
        {games.map((game, i) => {
          const diff = DIFF[game.difficulty] || DIFF.medium;
          const selected = selectedSlug === game.slug;
          const gameStats = stats[game.slug];
          return (
            <button
              key={game.slug}
              type="button"
              data-game-card
              data-tour={i === 0 ? 'game-card' : undefined}
              onClick={() => onSelect(game)}
              aria-pressed={selected}
              className={`group cine-glass cine-tilt rounded-2xl p-4 text-left flex flex-col transition-all relative ${selected ? 'ring-2' : ''}`}
              style={selected
                ? { '--accent': diff.glow, '--tilt-accent': diff.glow, boxShadow: `0 0 34px -6px ${diff.glow}`, '--tw-ring-color': diff.glow }
                : { '--accent': diff.glow, '--tilt-accent': diff.glow }}
            >
              {selected && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full text-white shadow-sm" style={{ background: diff.glow }}>
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}

              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all"
                  style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 32%, transparent)', color: 'var(--accent)' }}
                >
                  <game.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-ink dark:text-slate-200 leading-tight pr-6">{game.title}</h3>
                  <p className="flex items-center gap-2.5 text-[11px] mt-1" style={{ color: 'var(--ink-dim)' }}>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {game.time}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                      <Zap className="w-3 h-3 fill-amber-400 text-amber-500" /> {maxGameXp(game.slug)} XP
                    </span>
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug mb-2 flex-1 line-clamp-2">{game.description}</p>

              {/* What the game is FOR. Skylar's ask: people should be able to see what
                  each one helps them get better at, not just how long it takes and how
                  much XP it pays. */}
              {game.teaches && (
                <p className="text-[11px] font-medium mb-3 inline-flex items-start gap-1" style={{ color: 'var(--ink-dim)' }}>
                  <Target className="w-3 h-3 shrink-0 mt-[2px]" />
                  <span>Builds: {game.teaches}</span>
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${diff.badge}`}>
                  <BarChart3 className="w-3 h-3" /> {diff.label}
                </span>
                {/* Reads the same on nine of the ten cards, which is the point: the old
                    three-state labelling is what made Games feel inconsistent (#219).
                    AI or Human says "pre-set rounds" outright rather than leaving
                    someone to discover it after picking. */}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                  <Sparkles className="w-3 h-3 shrink-0" />
                  {game.generates === false ? 'Pre-set rounds, no topic' : 'Built from your topic'}
                </span>
                {gameStats && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Trophy className="w-3 h-3" /> Best {gameStats.bestScore}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
