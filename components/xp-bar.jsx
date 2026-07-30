'use client';

// The one XP progress bar in the app. Both the always-on header meter
// (xp-meter.jsx) and the level-up modal render this, so "bold" is defined in a
// single place and a level-up can't look like a different product than the bar
// the learner watches all day.
//
// Deliberately a <span> so it's legal inside the header's inline clusters.

// Blue -> light blue -> gold, the same ramp as .cine-grad-text in globals.css.
const FILL = 'linear-gradient(90deg, #0055FF 0%, #3B94FF 40%, #7DBFFF 62%, #FFC633 100%)';

// A recessed, dark channel so the fill reads as a lit object sitting inside a
// frame rather than a flat line painted on the bar.
const TRACK = {
  background: 'rgba(3,12,28,.62)',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.16)',
};

const SIZES = {
  sm: 'h-2.5',   // header meter
  md: 'h-3.5',
  lg: 'h-5',     // level-up modal
};

export default function XpBar({
  percent = 0,
  size = 'sm',
  className = '',
  // Bumping this value re-triggers the one-shot sheen sweep (pass the XP total).
  sheenKey = 0,
}) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const height = SIZES[size] || SIZES.sm;

  return (
    <span className={`relative block rounded-full overflow-hidden ${height} ${className}`} style={TRACK}>
      <span
        className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: FILL,
          // A glow at the leading edge so even a few percent is visible.
          boxShadow: pct > 0 ? '0 0 12px rgba(255,198,51,.55), 0 0 4px rgba(59,148,255,.7)' : 'none',
        }}
      >
        {/* Glossy top half — the single cheapest thing that makes a bar look solid. */}
        <span
          className="absolute inset-x-0 top-0 h-1/2 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0))' }}
        />
        {/* One-shot highlight sweep on a gain. Keyed so React remounts it. */}
        <span
          key={sheenKey}
          className="xp-sheen absolute inset-y-0 w-1/3"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)' }}
        />
      </span>
    </span>
  );
}
