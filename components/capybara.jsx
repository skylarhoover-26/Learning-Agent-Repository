'use client';

import { CAPY_VARIANTS } from '@/lib/capybara-variants';

// The house capybara — drawn, not licensed.
//
// Every capybara in the app comes from this one component. It shares the
// avatar.jsx conventions on purpose (fixed 0 0 100 100 viewBox, flat fills, no
// strokes on the body) so the two drawn-art systems read as one hand. Every fill
// is a flat literal, so unlike avatar.jsx there are no gradient ids to namespace
// — if a pose ever needs a gradient, bring useId() back with it.
//
// Structure, back to front: prop `behind` layer → body → head → face → prop
// `front` layer. A variant only supplies the parts it needs; the base is always
// the same capybara, which is what keeps twelve poses looking like one animal.
//
// Why drawn: the reference art everyone finds is Shutterstock/Adobe/iStock/Etsy
// stock. Flat SVG also themes with the app, stays sharp at 24px, and adds no
// image weight.

const FUR = '#AE7844';
const FUR_SHADE = '#8B5E32';
const BELLY = '#C08B57';
const EAR_INNER = '#5E3C21';
const INK = '#2B1D12';
const BLUSH = '#D98A83';

// ── Anatomy notes ────────────────────────────────────────────────────────────
// Four things separate a capybara from a teddy bear, and all four are easy to
// get wrong:
//
//   1. The head is a BRICK — wider than tall, flat on top, flaring slightly to
//      the jaw. Not a circle.
//   2. There is NO light oval snout patch. That single shape is what makes a
//      drawing read as a bear or a dog. The face is one continuous colour.
//   3. Ears are SMALL and dark, tucked at the top corners — roughly a third the
//      size instinct suggests.
//   4. Eyes sit HIGH and WIDE, close to the ears, leaving a long gap down to the
//      nose. That gap is the muzzle, and it is most of the likeness.
//
// The nose is a broad, blunt, dark pad low on the face — wide, not round.

// Geometry lives in named constants because the proportions ARE the likeness —
// tuning the animal means nudging these numbers, not rewriting paths. The head
// is 58 wide × 41 tall (deliberately wider than tall) with a near-flat top and a
// slightly wider jaw.
const HEAD_PATH =
  'M31 13 L69 13 Q79 13 79 23 L80 42 Q80 54 64 54 L36 54 Q20 54 20 42 L21 23 Q21 13 31 13 Z';

const EYE_X = [33, 67];
const EYE_Y = 23;
const EAR_Y = 14;
const NOSE_Y = 39.5;

// ── Face ─────────────────────────────────────────────────────────────────────

function eyes(expression) {
  if (expression === 'closed') {
    return (
      <g>
        {EYE_X.map((cx) => (
          <path
            key={cx}
            d={`M${cx - 3.6} ${EYE_Y - 1} Q${cx} ${EYE_Y + 2.6} ${cx + 3.6} ${EYE_Y - 1}`}
            fill="none"
            stroke={INK}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }
  if (expression === 'happy') {
    return (
      <g>
        {EYE_X.map((cx) => (
          <path
            key={cx}
            d={`M${cx - 3.6} ${EYE_Y + 1.8} Q${cx} ${EYE_Y - 2.8} ${cx + 3.6} ${EYE_Y + 1.8}`}
            fill="none"
            stroke={INK}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }
  return (
    <g>
      {EYE_X.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={EYE_Y} r="2.7" fill={INK} />
          <circle cx={cx + 0.9} cy={EYE_Y - 1} r=".8" fill="#ffffff" opacity=".85" />
        </g>
      ))}
      {/* A sweat bead, not angry eyebrows — brows on this face read as a bear. */}
      {expression === 'worried' && (
        <path d="M82 18 q3 5 0 6.6 q-3 -1.6 0 -6.6 Z" fill="#7DBFFF" opacity=".9" />
      )}
    </g>
  );
}

function face(expression) {
  return (
    <g>
      {/* Blunt nose pad — wide, flat, and right down at the jaw. The long empty
          stretch between it and the eyes is the muzzle, and that gap is most of
          what makes this a capybara. */}
      <rect x="42" y={NOSE_Y} width="16" height="7.5" rx="3.75" fill={INK} />
      <path
        d="M50 47 V49.5 M50 49.5 Q46.5 52.5 43.5 49.5 M50 49.5 Q53.5 52.5 56.5 49.5"
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {[27, 73].map((cx) => (
        <ellipse key={cx} cx={cx} cy="34" rx="4.2" ry="2.3" fill={BLUSH} opacity=".38" />
      ))}
      {eyes(expression)}
    </g>
  );
}

// ── Body ─────────────────────────────────────────────────────────────────────
// A broad, low barrel — wider than the head and wider than it is tall. The head
// overlaps it by enough that there is no neck, which is how capybaras are built.

function body() {
  return (
    <g>
      {/* Feet first so they tuck under the barrel instead of sitting on it. */}
      {[31, 69].map((cx) => (
        <ellipse key={cx} cx={cx} cy="89.5" rx="9.5" ry="5" fill={FUR_SHADE} />
      ))}
      <rect x="14" y="46" width="72" height="46" rx="21" fill={FUR} />
      <ellipse cx="50" cy="77" rx="23" ry="11.5" fill={BELLY} />
      {/* Paws, wide enough apart to hold a laptop or a cup between them. */}
      {[22, 78].map((cx) => (
        <ellipse key={cx} cx={cx} cy="71" rx="7" ry="9.5" fill={FUR_SHADE} />
      ))}
    </g>
  );
}

function head() {
  return (
    <g>
      <path d={HEAD_PATH} fill={FUR} />
      {/* Little dark tabs at the very top corners — capybara ears are much
          smaller than instinct wants to draw them. */}
      {[
        [24, 23.4],
        [76, 76.6],
      ].map(([cx, ix]) => (
        <g key={cx}>
          <ellipse cx={cx} cy={EAR_Y} rx="5" ry="4.4" fill={FUR_SHADE} />
          <ellipse cx={ix} cy={EAR_Y + 0.6} rx="2.4" ry="2" fill={EAR_INNER} />
        </g>
      ))}
    </g>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
// Each returns { behind, front }; either may be omitted.

function steam(x) {
  return (
    <path
      d={`M${x} 34 q4 -6 0 -12 q-4 -6 0 -12`}
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity=".55"
    />
  );
}

const PROPS = {
  laptop: {
    front: (
      <g>
        <rect x="33" y="59" width="34" height="22" rx="3" fill="#475569" />
        <rect x="36" y="62" width="28" height="16" rx="2" fill="#5A6B80" />
        <circle cx="50" cy="70" r="3.4" fill="#7DBFFF" opacity=".9" />
        <rect x="28" y="80" width="44" height="5.5" rx="2.75" fill="#94A3B8" />
      </g>
    ),
  },
  book: {
    front: (
      <g>
        <path d="M31 82 L50 76 L69 82 L69 63 L50 57 L31 63 Z" fill="#E8EDF4" />
        <path d="M50 57 V76" stroke="#94A3B8" strokeWidth="1.6" />
        <path d="M31 63 L50 57 L69 63" fill="none" stroke="#0055FF" strokeWidth="2.4" strokeLinejoin="round" />
        {[66, 70, 74].map((y) => (
          <g key={y}>
            <path d={`M36 ${y} L46 ${y - 3}`} stroke="#B6C2D2" strokeWidth="1.3" strokeLinecap="round" />
            <path d={`M54 ${y - 3} L64 ${y}`} stroke="#B6C2D2" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        ))}
      </g>
    ),
  },
  boba: {
    front: (
      <g>
        <path d="M52 55 L60 78" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 62 L60 62 L57 84 L43 84 Z" fill="#F3E7D8" opacity=".95" />
        <path d="M41 70 L59 70 L57 84 L43 84 Z" fill="#C99A6B" />
        {[
          [46, 81],
          [50, 82],
          [54, 81],
          [48, 78],
          [52, 78],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill="#3F2A18" />
        ))}
        <rect x="39" y="60" width="22" height="4" rx="2" fill="#E2E8F0" />
      </g>
    ),
  },
  sleeping: {
    front: (
      <g>
        {[
          [80, 30, 9],
          [88, 20, 7],
          [94, 12, 5.5],
        ].map(([x, y, size]) => (
          <text
            key={x}
            x={x}
            y={y}
            fontSize={size}
            fontWeight="800"
            fill="#7DBFFF"
            fontFamily="system-ui, sans-serif"
          >
            z
          </text>
        ))}
      </g>
    ),
  },
  graduate: {
    front: (
      <g>
        <path d="M50 2 L81 13 L50 24 L19 13 Z" fill="#1E293B" />
        <rect x="42" y="17" width="16" height="7" rx="1.5" fill="#0F172A" />
        <path d="M78.5 14 V25" stroke="#FFB706" strokeWidth="2" strokeLinecap="round" />
        <circle cx="78.5" cy="27" r="3" fill="#FFB706" />
      </g>
    ),
  },
  scholar: {
    front: (
      <g>
        {/* Reading glasses, not sunglasses: the lenses are translucent so the
            eyes still read through them. This is the capybara that explains the
            hunt, so it has to look like it knows something. */}
        <path d="M25.5 22.5 L19.5 25.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M74.5 22.5 L80.5 25.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="33" cy="23" r="8" fill="#FFFFFF" opacity=".34" />
        <circle cx="67" cy="23" r="8" fill="#FFFFFF" opacity=".34" />
        <circle cx="33" cy="23" r="8" fill="none" stroke={INK} strokeWidth="1.9" />
        <circle cx="67" cy="23" r="8" fill="none" stroke={INK} strokeWidth="1.9" />
        <path d="M41 22.5 Q50 20.5 59 22.5" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        {/* Glint, so the lenses read as glass rather than holes. */}
        <path d="M29 19.5 L32 17.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
        <path d="M63 19.5 L66 17.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
      </g>
    ),
  },
  orange: {
    front: (
      <g>
        {/* The yuzu-on-the-head pose. Sits on the flat top of the skull and
            overlaps it by a couple of units so it rests rather than floats. */}
        <circle cx="49" cy="9" r="8" fill="#F5872E" />
        <ellipse cx="45.8" cy="6.2" rx="2.8" ry="1.9" fill="#FFC58F" opacity=".7" />
        {/* Leaf stays at y >= 0.4: an svg clips to its viewport, so anything
            above the viewBox top would be shaved off. */}
        <path d="M50.5 3 Q59 0.4 60.5 4.4 Q54 6.8 50.5 3 Z" fill="#2F9E52" />
        <path d="M50.4 3.6 Q52.6 2.4 54.8 3" fill="none" stroke="#1F6F3A" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    ),
  },
  crown: {
    front: (
      <g>
        <path d="M28 17 L28 3 L39 11 L50 0 L61 11 L72 3 L72 17 Z" fill="#FFB706" />
        <path d="M28 17 L28 3 L39 11 L50 0 L61 11 L72 3 L72 17 Z" fill="none" stroke="#D98E00" strokeWidth="1.4" />
        <circle cx="50" cy="9.5" r="2.4" fill="#3B94FF" />
      </g>
    ),
  },
  shades: {
    front: (
      <g>
        <path d="M22 19.5 H78" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <rect x="25" y="17" width="18" height="12" rx="4" fill={INK} />
        <rect x="57" y="17" width="18" height="12" rx="4" fill={INK} />
        <path d="M43 21 H57" stroke={INK} strokeWidth="2.4" />
        <path d="M29 20.5 L34 20.5" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" opacity=".5" />
        <path d="M61 20.5 L66 20.5" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" opacity=".5" />
      </g>
    ),
  },
  hotspring: {
    front: (
      <g>
        {/* A rounded pool, inset from the edges. Full-bleed water read as a flat
            blue box sitting behind the animal rather than water around it. */}
        <path
          d="M6 67 Q28 60 50 67 T94 67 L94 82 Q94 95 76 95 L24 95 Q6 95 6 82 Z"
          fill="#5FBFD6"
          opacity=".5"
        />
        <path d="M6 67 Q28 60 50 67 T94 67" fill="none" stroke="#DFF5FB" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M15 81 Q31 77 50 81 T85 81" fill="none" stroke="#DFF5FB" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
        {steam(14)}
        {steam(86)}
      </g>
    ),
  },
  unplugged: {
    front: (
      <g>
        <path d="M30 70 Q22 82 34 88 Q48 94 58 84" fill="none" stroke="#334155" strokeWidth="3.4" strokeLinecap="round" />
        <rect x="56" y="78" width="11" height="9" rx="2" fill="#94A3B8" />
        <path d="M67 80.5 H72 M67 84.5 H72" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    ),
  },
  trophy: {
    front: (
      <g>
        <path d="M40 58 H60 L58 72 Q50 78 42 72 Z" fill="#FFB706" />
        <path d="M40 60 Q33 60 34 66 Q35 70 40 69" fill="none" stroke="#FFB706" strokeWidth="2.6" />
        <path d="M60 60 Q67 60 66 66 Q65 70 60 69" fill="none" stroke="#FFB706" strokeWidth="2.6" />
        <rect x="46" y="75" width="8" height="5" fill="#D98E00" />
        <rect x="39" y="79" width="22" height="5" rx="1.6" fill="#D98E00" />
      </g>
    ),
  },
  headset: {
    front: (
      <g>
        <path d="M20 24 Q20 3 50 3 Q80 3 80 24" fill="none" stroke="#1E293B" strokeWidth="3.6" strokeLinecap="round" />
        <rect x="15" y="19" width="9" height="14" rx="4.5" fill="#1E293B" />
        <rect x="76" y="19" width="9" height="14" rx="4.5" fill="#1E293B" />
        <path d="M80.5 32 Q82.5 46 68 48" fill="none" stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="66" cy="48" r="3.2" fill="#3B94FF" />
      </g>
    ),
  },
};

// ── Assembly ───────────────────────────────────────────────────────────────────

export default function Capybara({
  variant = 'idle',
  size = 96,
  className = '',
  title,
  ...rest
}) {
  const spec = CAPY_VARIANTS[variant] || CAPY_VARIANTS.idle;
  const prop = PROPS[spec.prop] || {};
  const label = title || spec.label;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={className}
      data-capybara={variant}
      {...rest}
    >
      <title>{label}</title>
      {prop.behind}
      {body()}
      {head()}
      {face(spec.expression)}
      {prop.front}
    </svg>
  );
}

export { CAPY_VARIANTS };
