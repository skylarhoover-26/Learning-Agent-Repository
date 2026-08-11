'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, BarChart3, Clock, Zap, Trophy, Sparkles } from 'lucide-react';
import { maxGameXp } from '@/lib/progression';

const DIFF = {
  easy: { label: 'Easy', glow: '#22C55E', badge: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-900/20 dark:text-green-400' },
  medium: { label: 'Medium', glow: '#F59E0B', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400' },
  hard: { label: 'Hard', glow: '#EF4444', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400' },
};

// Step 1 of the games flow: a horizontal, arrow-scrollable rail of every game,
// ordered easy → hard. Selecting a card is what advances the flow — there is no
// second picker. The old page had a 4-card grid AND a separate dropdown listing 8
// games, so the same game was choosable two ways; this is the one place.
//
// Selection styling matches the lesson wizard's format tiles (ring + glow + check
// badge) so picking a game reads the same as picking a lesson format.
export default function GamePicker({ games, selectedSlug, onSelect, stats = {} }) {
  const railRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Arrows disable at the ends rather than sitting there dead — otherwise there's
  // no signal that you've reached the last game.
  function syncEdges() {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    syncEdges();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncEdges, { passive: true });
    window.addEventListener('resize', syncEdges);
    return () => {
      el.removeEventListener('scroll', syncEdges);
      window.removeEventListener('resize', syncEdges);
    };
  }, []);

  // Scroll by one card so the rail always lands on a card edge, not mid-card.
  function nudge(dir) {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('[data-game-card]');
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>1</span>
          Pick a game
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => nudge(-1)} disabled={atStart} aria-label="Previous games"
            className="w-9 h-9 rounded-full grid place-items-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cine-glass"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button" onClick={() => nudge(1)} disabled={atEnd} aria-label="More games"
            className="w-9 h-9 rounded-full grid place-items-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cine-glass"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        data-tour="page-games"
        className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
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
              className={`group cine-glass cine-tilt rounded-2xl p-5 text-left flex flex-col shrink-0 w-[260px] snap-start transition-all relative ${selected ? 'ring-2' : ''}`}
              style={selected
                ? { '--accent': diff.glow, '--tilt-accent': diff.glow, boxShadow: `0 0 34px -6px ${diff.glow}`, '--tw-ring-color': diff.glow }
                : { '--accent': diff.glow, '--tilt-accent': diff.glow }}
            >
              {selected && (
                <span className="absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full text-white shadow-sm" style={{ background: diff.glow }}>
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all"
                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 32%, transparent)', color: 'var(--accent)' }}
              >
                <game.icon className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-ink dark:text-slate-200 mb-1">{game.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex-1">{game.description}</p>

              {game.topic === 'required' && (
                <p className="text-xs font-medium mb-2 inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" /> Needs a topic
                </p>
              )}
              {game.topic === 'none' && (
                <p className="text-xs mb-2" style={{ color: 'var(--ink-dim)' }}>Uses its own set</p>
              )}

              {gameStats && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Best: {gameStats.bestScore} &middot; Played: {gameStats.gamesPlayed}
                </p>
              )}

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${diff.badge}`}>
                  <BarChart3 className="w-3 h-3" /> {diff.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-bg-subtle dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600">
                  <Clock className="w-3 h-3" /> {game.time}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                Up to {maxGameXp(game.slug)} XP
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
