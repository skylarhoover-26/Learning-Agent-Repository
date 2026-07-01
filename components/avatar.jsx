'use client';

import { useId } from 'react';
import { normalizeAvatar, getItem } from '@/lib/avatar-catalog';

// Layered SVG avatar. Renders, back-to-front: body+head (base color), outfit,
// face, accessory, pet sidekick, and an optional crown (top of the department
// leaderboard). viewBox is a fixed 0 0 100 100 so every layer aligns; `size`
// just scales it.

const INK = '#1f2937';

function star(cx, cy, r, key, fill = INK) {
  const p = [
    [cx, cy - r], [cx + r * 0.32, cy - r * 0.32], [cx + r, cy], [cx + r * 0.32, cy + r * 0.32],
    [cx, cy + r], [cx - r * 0.32, cy + r * 0.32], [cx - r, cy], [cx - r * 0.32, cy - r * 0.32],
  ].map((pt) => pt.join(',')).join(' ');
  return <polygon key={key} points={p} fill={fill} />;
}

// A cartoon eye with a white so pupils stay visible on any skin tone.
function eye(cx, cy, r = 2) {
  return (
    <g key={`eye${cx}`}>
      <circle cx={cx} cy={cy} r={r + 1.4} fill="#ffffff" />
      <circle cx={cx} cy={cy} r={r} fill={INK} />
    </g>
  );
}

// Background scene — the bottom layer, fills the whole viewBox. `uid` namespaces
// gradient ids so multiple avatars on one page don't collide.
function renderBackground(id, uid) {
  switch (id) {
    case 'bg_sky':
      return <g key="bg"><rect x="0" y="0" width="100" height="100" fill="#dbeafe" /></g>;
    case 'bg_blush':
      return <g key="bg"><rect x="0" y="0" width="100" height="100" fill="#fce7f3" /></g>;
    case 'bg_forest':
      return <g key="bg"><rect x="0" y="0" width="100" height="100" fill="#dcfce7" /></g>;
    case 'bg_sunset':
      return (
        <g key="bg">
          <defs>
            <linearGradient id={`${uid}-sunset`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="100%" stopColor="#f9a8d4" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-sunset)`} />
        </g>
      );
    case 'bg_streak':
      return (
        <g key="bg">
          <defs>
            <linearGradient id={`${uid}-streak`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-streak)`} />
        </g>
      );
    case 'bg_gold':
      return (
        <g key="bg">
          <defs>
            <radialGradient id={`${uid}-gold`} cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-gold)`} />
        </g>
      );
    case 'bg_grid':
      return (
        <g key="bg">
          <rect x="0" y="0" width="100" height="100" fill="#eef2ff" />
          {[20, 40, 60, 80].map((v) => (
            <g key={v}>
              <line x1={v} y1="0" x2={v} y2="100" stroke="#c7d2fe" strokeWidth="1" />
              <line x1="0" y1={v} x2="100" y2={v} stroke="#c7d2fe" strokeWidth="1" />
            </g>
          ))}
        </g>
      );
    case 'bg_night':
      return (
        <g key="bg">
          <rect x="0" y="0" width="100" height="100" fill="#1e293b" />
          {[[15, 20], [78, 15], [30, 60], [85, 70], [55, 30], [10, 85]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.4 : 1} fill="#fde68a" />
          ))}
        </g>
      );
    case 'bg_confetti':
      return (
        <g key="bg">
          <rect x="0" y="0" width="100" height="100" fill="#fafafa" />
          {[['#f87171', 12, 18], ['#60a5fa', 82, 22], ['#34d399', 25, 70], ['#fbbf24', 88, 64], ['#a78bfa', 50, 12], ['#f472b6', 16, 50]].map(([c, x, y], i) => (
            <rect key={i} x={x} y={y} width="5" height="5" rx="1" fill={c} transform={`rotate(${i * 35} ${x + 2} ${y + 2})`} />
          ))}
        </g>
      );
    case 'bg_ocean':
      return (
        <g key="bg">
          <defs>
            <linearGradient id={`${uid}-ocean`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-ocean)`} />
          <path d="M0 72 Q25 66 50 72 T100 72" fill="none" stroke="#a5f3fc" strokeWidth="2" opacity="0.7" />
          <path d="M0 84 Q25 78 50 84 T100 84" fill="none" stroke="#a5f3fc" strokeWidth="2" opacity="0.5" />
        </g>
      );
    case 'bg_aurora':
      return (
        <g key="bg">
          <defs>
            <linearGradient id={`${uid}-aurora`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="45%" stopColor="#15803d" />
              <stop offset="75%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-aurora)`} />
          {[[20, 14], [70, 10], [45, 22]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="1" fill="#fef9c3" />)}
        </g>
      );
    case 'bg_galaxy':
      return (
        <g key="bg">
          <defs>
            <radialGradient id={`${uid}-galaxy`} cx="35%" cy="30%" r="90%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#0b1020" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-galaxy)`} />
          {[[14, 18], [82, 14], [30, 64], [88, 72], [60, 28], [10, 84], [70, 90]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.2 : 0.8} fill="#fde68a" />
          ))}
          <circle cx="78" cy="80" r="6" fill="#f59e0b" opacity="0.9" />
        </g>
      );
    case 'bg_circuit':
      return (
        <g key="bg">
          <rect x="0" y="0" width="100" height="100" fill="#052e16" />
          <g stroke="#22c55e" strokeWidth="1" fill="none" opacity="0.6">
            <path d="M10 20 H40 V50 H70" />
            <path d="M90 30 H60 V70 H30 V90" />
            <path d="M20 80 H50" />
          </g>
          {[[40, 50], [70, 50], [60, 70], [30, 70], [50, 80]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.6" fill="#4ade80" />
          ))}
        </g>
      );
    case 'bg_rainbow':
      return (
        <g key="bg">
          <defs>
            <linearGradient id={`${uid}-rainbow`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="75%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill={`url(#${uid}-rainbow)`} />
        </g>
      );
    case 'bg_none':
    default:
      return null;
  }
}

function renderBase(baseItem, uid) {
  const solid = baseItem?.color || '#6366f1';
  const fill = baseItem?.gradient ? `url(#${uid}-base)` : solid;
  return (
    <g key="base">
      {baseItem?.gradient && (
        <defs>
          <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      )}
      {/* torso */}
      <path d="M28 100 L28 74 Q28 56 50 56 Q72 56 72 74 L72 100 Z" fill={fill} />
      {/* head */}
      <circle cx="50" cy="38" r="20" fill={fill} />
    </g>
  );
}

// Hair: style shapes (over the head, eyes drawn on top) tinted by the chosen
// hair color. Rainbow color uses a per-instance gradient.
function hairShape(id, fill) {
  switch (id) {
    case 'hair_crop':
      return <path d="M30 38 Q29 18 50 18 Q71 18 70 38 Q66 25 50 25 Q34 25 30 38 Z" fill={fill} />;
    case 'hair_buzz':
      return <path d="M31 34 Q31 20 50 20 Q69 20 69 34 Q62 27 50 27 Q38 27 31 34 Z" fill={fill} opacity="0.85" />;
    case 'hair_long':
      return <path d="M30 80 Q30 22 30 28 Q30 16 50 16 Q70 16 70 28 Q70 22 70 80 Q66 82 64 60 Q64 33 50 29 Q36 33 36 60 Q34 82 30 80 Z" fill={fill} />;
    case 'hair_ponytail':
      return (
        <g>
          <path d="M30 38 Q29 18 50 18 Q71 18 70 38 Q66 25 50 25 Q34 25 30 38 Z" fill={fill} />
          <path d="M67 26 Q84 30 82 54 Q78 46 70 40 Z" fill={fill} />
          <rect x="66" y="26" width="6" height="4" rx="2" fill="#00000033" />
        </g>
      );
    case 'hair_shortfem':
      // Chin-length layered cut with a soft side sweep.
      return <path d="M29 58 Q28 18 50 18 Q72 18 71 58 Q66 54 64 44 Q66 30 50 28 Q34 30 36 44 Q34 54 29 58 Z" fill={fill} />;
    case 'hair_medfem':
      // Shoulder-length, softly waved.
      return <path d="M29 72 Q27 20 50 16 Q73 20 71 72 Q65 68 66 54 Q69 38 50 31 Q31 38 34 54 Q35 68 29 72 Z" fill={fill} />;
    case 'hair_curly':
      return (
        <g fill={fill}>
          {[[34, 25], [42, 20], [50, 18], [58, 20], [66, 25], [31, 32], [69, 32]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="6" />
          ))}
        </g>
      );
    case 'hair_bob':
      return <path d="M30 54 Q30 18 50 18 Q70 18 70 54 Q66 56 64 48 Q64 30 50 28 Q36 30 36 48 Q34 56 30 54 Z" fill={fill} />;
    case 'hair_spiky':
      return <path d="M30 34 L34 18 L40 30 L46 15 L52 30 L58 15 L64 30 L70 18 L70 34 Q50 26 30 34 Z" fill={fill} />;
    case 'hair_mohawk':
      return <path d="M45 34 L45 16 L48 6 L50 16 L52 6 L55 16 L55 34 Z" fill={fill} />;
    case 'hair_bun':
      return (
        <g fill={fill}>
          <circle cx="50" cy="13" r="6" />
          <path d="M31 36 Q31 20 50 20 Q69 20 69 36 Q62 27 50 27 Q38 27 31 36 Z" />
        </g>
      );
    case 'hair_afro':
      return (
        <g fill={fill}>
          <circle cx="50" cy="17" r="16" />
          <circle cx="32" cy="30" r="9" />
          <circle cx="68" cy="30" r="9" />
        </g>
      );
    case 'hair_pigtails':
      return (
        <g fill={fill}>
          <path d="M30 38 Q29 18 50 18 Q71 18 70 38 Q66 25 50 25 Q34 25 30 38 Z" />
          <circle cx="28" cy="44" r="7" />
          <circle cx="72" cy="44" r="7" />
        </g>
      );
    case 'hair_pixie':
      return (
        <path d="M30 36 Q29 18 50 18 Q71 18 70 34 Q66 24 56 24 Q52 30 44 28 Q38 27 34 31 Q31 33 30 36 Z" fill={fill} />
      );
    case 'hair_spacebuns':
      return (
        <g fill={fill}>
          <circle cx="37" cy="12" r="5.5" />
          <circle cx="63" cy="12" r="5.5" />
          <path d="M31 34 Q31 19 50 19 Q69 19 69 34 Q62 26 50 26 Q38 26 31 34 Z" />
        </g>
      );
    case 'hair_sidebraid':
      return (
        <g fill={fill}>
          <path d="M30 38 Q29 18 50 18 Q71 18 70 38 Q66 25 50 25 Q34 25 30 38 Z" />
          <path d="M68 32 Q76 40 74 52 Q72 62 70 72 Q67 64 68 54 Q66 44 64 38 Z" />
          {[40, 48, 56, 64].map((y, i) => (
            <line key={i} x1="66" y1={y} x2="74" y2={y - 2} stroke="#00000026" strokeWidth="1.5" />
          ))}
        </g>
      );
    case 'hair_wavy':
      return <path d="M30 80 Q26 20 50 16 Q74 20 70 80 Q64 74 66 60 Q70 40 50 30 Q30 40 34 60 Q36 74 30 80 Z" fill={fill} />;
    case 'hair_undercut':
      return <path d="M34 28 Q34 16 50 16 Q66 16 66 28 Q58 23 50 23 Q42 23 34 28 Z" fill={fill} />;
    case 'hair_locs':
      return (
        <g fill={fill}>
          <path d="M31 34 Q31 18 50 18 Q69 18 69 34 Q60 26 50 26 Q40 26 31 34 Z" />
          {[30, 37, 50, 63, 70].map((x, i) => (
            <rect key={i} x={x - 1.6} y="24" width="3.2" height={i % 2 ? 30 : 24} rx="1.6" />
          ))}
        </g>
      );
    case 'hair_mullet':
      return (
        <g fill={fill}>
          <path d="M30 36 Q31 18 50 18 Q69 18 70 36 Q62 26 50 26 Q38 26 30 36 Z" />
          <path d="M30 38 Q26 56 33 62 L39 52 Q33 46 31 38 Z" />
          <path d="M70 38 Q74 56 67 62 L61 52 Q67 46 69 38 Z" />
        </g>
      );
    default:
      return null;
  }
}

function renderHair(id, colorItem, uid) {
  if (!id || id === 'hair_none') return null;
  const grad = colorItem?.gradient;
  const fill = grad ? `url(#${uid}-hair)` : (colorItem?.color || '#6b4423');
  return (
    <g key="hair">
      {grad && (
        <defs>
          <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="75%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      )}
      {hairShape(id, fill)}
    </g>
  );
}

const TORSO = 'M28 100 L28 74 Q28 56 50 56 Q72 56 72 74 L72 100 Z';
const NECK = 'M44 57 Q50 63 56 57 L56 60 Q50 65 44 60 Z';

// A plain tee in any color (with a subtle darker neckline).
function tee(color, collar = '#00000022') {
  return (
    <g key="outfit">
      <path d={TORSO} fill={color} />
      <path d={NECK} fill={collar} />
    </g>
  );
}

function renderOutfit(id) {
  switch (id) {
    case 'outfit_tee_red':    return tee('#ef4444');
    case 'outfit_tee_green':  return tee('#22c55e');
    case 'outfit_tee_yellow': return tee('#facc15');

    // Two neckline "types": a shallow crew (reads more masculine) and a deeper
    // scoop (reads more feminine). Both the standard blue.
    case 'outfit_tee_crew':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#3b82f6" />
          <path d="M43 57 Q50 63 57 57" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'outfit_tee_scoop':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#3b82f6" />
          <path d="M40 57 Q50 71 60 57" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </g>
      );

    case 'outfit_hoodie':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#475569" />
          <path d="M38 58 Q50 50 62 58 L62 64 Q50 58 38 64 Z" fill="#334155" />
          <line x1="46" y1="62" x2="46" y2="74" stroke="#e2e8f0" strokeWidth="1.5" />
          <line x1="54" y1="62" x2="54" y2="74" stroke="#e2e8f0" strokeWidth="1.5" />
        </g>
      );
    case 'outfit_striped':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#e5e7eb" />
          {[78, 86, 94].map((y) => (
            <line key={y} x1="28" y1={y} x2="72" y2={y} stroke="#1e3a8a" strokeWidth="4" />
          ))}
          <path d={NECK} fill="#00000022" />
        </g>
      );
    case 'outfit_polo':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#0ea5e9" />
          <path d="M44 57 L50 63 L42 64 Z" fill="#0284c7" />
          <path d="M56 57 L50 63 L58 64 Z" fill="#0284c7" />
          <line x1="50" y1="63" x2="50" y2="78" stroke="#0284c7" strokeWidth="1.5" />
          <circle cx="50" cy="68" r="1" fill="#e0f2fe" />
          <circle cx="50" cy="74" r="1" fill="#e0f2fe" />
        </g>
      );
    case 'outfit_blazer':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#1e293b" />
          <path d="M50 58 L42 100 L58 100 Z" fill="#f8fafc" />
          <path d="M50 58 L40 74 L46 100 L50 70 Z" fill="#0f172a" />
          <path d="M50 58 L60 74 L54 100 L50 70 Z" fill="#0f172a" />
          <line x1="50" y1="72" x2="50" y2="96" stroke="#334155" strokeWidth="1" />
        </g>
      );
    case 'outfit_vneck':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#8b5cf6" />
          <path d="M43 57 L50 70 L57 57 Z" fill="#00000022" />
        </g>
      );
    case 'outfit_overalls':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#2563eb" />
          <rect x="40" y="58" width="5" height="16" fill="#1d4ed8" />
          <rect x="55" y="58" width="5" height="16" fill="#1d4ed8" />
          <rect x="43" y="78" width="14" height="10" rx="1.5" fill="#1d4ed8" />
        </g>
      );
    case 'outfit_flannel':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#b91c1c" />
          {[78, 90].map((y) => <line key={`h${y}`} x1="28" y1={y} x2="72" y2={y} stroke="#7f1d1d" strokeWidth="3" />)}
          {[40, 60].map((x) => <line key={`v${x}`} x1={x} y1="74" x2={x} y2="100" stroke="#7f1d1d" strokeWidth="3" />)}
          {[34, 50, 66].map((x) => <line key={`w${x}`} x1={x} y1="74" x2={x} y2="100" stroke="#fca5a5" strokeWidth="1" />)}
          <path d={NECK} fill="#00000022" />
        </g>
      );
    case 'outfit_turtleneck':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#0f766e" />
          <rect x="42" y="50" width="16" height="10" rx="3" fill="#0f766e" stroke="#115e59" strokeWidth="1" />
        </g>
      );
    case 'outfit_varsity':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#1e3a8a" />
          <rect x="46" y="74" width="8" height="26" fill="#fde68a" />
          <rect x="40" y="56" width="20" height="4" rx="2" fill="#fde68a" />
          {star(50, 86, 4, 'v', '#fde68a')}
        </g>
      );
    case 'outfit_denim':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#3b82f6" />
          <path d="M44 57 L50 64 L43 66 Z" fill="#2563eb" />
          <path d="M56 57 L50 64 L57 66 Z" fill="#2563eb" />
          <line x1="50" y1="64" x2="50" y2="100" stroke="#1d4ed8" strokeWidth="1.5" />
          <rect x="34" y="78" width="8" height="7" rx="1" fill="none" stroke="#1d4ed8" strokeWidth="1" />
          <rect x="58" y="78" width="8" height="7" rx="1" fill="none" stroke="#1d4ed8" strokeWidth="1" />
        </g>
      );
    case 'outfit_labcoat':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#f8fafc" />
          <path d="M50 58 L42 100 L46 100 L50 66 Z" fill="#e2e8f0" />
          <path d="M50 58 L58 100 L54 100 L50 66 Z" fill="#e2e8f0" />
          <rect x="56" y="80" width="9" height="9" rx="1" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <line x1="62" y1="79" x2="62" y2="85" stroke="#2563eb" strokeWidth="1.5" />
          <circle cx="50" cy="76" r="1" fill="#94a3b8" />
          <circle cx="50" cy="84" r="1" fill="#94a3b8" />
        </g>
      );
    case 'outfit_suit':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#374151" />
          <path d="M50 58 L44 100 L56 100 Z" fill="#f8fafc" />
          <path d="M50 58 L41 76 L47 100 L50 70 Z" fill="#1f2937" />
          <path d="M50 58 L59 76 L53 100 L50 70 Z" fill="#1f2937" />
          <path d="M50 62 L47 80 L50 92 L53 80 Z" fill="#dc2626" />
        </g>
      );
    case 'outfit_puffer':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#f59e0b" />
          {[76, 82, 88, 94].map((y) => <line key={y} x1="28" y1={y} x2="72" y2={y} stroke="#d97706" strokeWidth="1.5" />)}
          <line x1="50" y1="74" x2="50" y2="100" stroke="#d97706" strokeWidth="1.5" />
          <path d={NECK} fill="#d97706" />
        </g>
      );
    case 'outfit_tuxedo':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#111827" />
          <path d="M50 58 L44 100 L56 100 Z" fill="#f8fafc" />
          <path d="M50 58 L41 76 L47 100 L50 70 Z" fill="#000000" />
          <path d="M50 58 L59 76 L53 100 L50 70 Z" fill="#000000" />
          <path d="M45 62 L50 65 L45 68 Z" fill="#111827" />
          <path d="M55 62 L50 65 L55 68 Z" fill="#111827" />
        </g>
      );
    case 'outfit_armor':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#94a3b8" />
          <path d="M30 74 Q50 80 70 74" fill="none" stroke="#64748b" strokeWidth="1.5" />
          <line x1="50" y1="74" x2="50" y2="100" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="34" cy="62" r="2.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <circle cx="66" cy="62" r="2.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <path d="M50 80 L46 86 L50 92 L54 86 Z" fill="#fbbf24" />
        </g>
      );
    case 'outfit_spacesuit':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#f1f5f9" />
          <ellipse cx="50" cy="58" rx="11" ry="4" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="42" y="78" width="16" height="11" rx="2" fill="#cbd5e1" />
          <circle cx="46" cy="83" r="1.6" fill="#22c55e" />
          <circle cx="51" cy="83" r="1.6" fill="#ef4444" />
          <circle cx="56" cy="83" r="1.6" fill="#3b82f6" />
          <line x1="28" y1="94" x2="72" y2="94" stroke="#f97316" strokeWidth="2" />
        </g>
      );
    case 'outfit_hawaii':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#14b8a6" />
          {[['#fb7185', 36, 80], ['#fde047', 60, 78], ['#f472b6', 44, 92], ['#fdba74', 64, 92], ['#a3e635', 34, 70]].map(([c, x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill={c} />
          ))}
          <path d={NECK} fill="#0d9488" />
        </g>
      );
    case 'outfit_wizard':
      return (
        <g key="outfit">
          <path d={TORSO} fill="#6d28d9" />
          {star(40, 80, 2.6, 'w1', '#fde68a')}
          {star(60, 86, 2.2, 'w2', '#fde68a')}
          {star(50, 92, 2, 'w3', '#fde68a')}
          <path d={NECK} fill="#5b21b6" />
        </g>
      );
    case 'outfit_cape':
      return (
        <g key="outfit">
          {/* cape behind shoulders */}
          <path d="M30 60 L20 100 L40 96 L50 60 Z" fill="#dc2626" />
          <path d="M70 60 L80 100 L60 96 L50 60 Z" fill="#dc2626" />
          <path d={TORSO} fill="#e5e7eb" />
          <path d={NECK} fill="#cbd5e1" />
        </g>
      );
    case 'outfit_tee':
    default:
      return tee('#3b82f6', '#2563eb');
  }
}

function renderFace(id) {
  const eyeL = 43, eyeR = 57, eyeY = 36;
  const smile = <path d="M43 45 Q50 52 57 45" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  switch (id) {
    case 'face_cool':
      return (
        <g key="face">
          {eye(eyeL, eyeY)}
          {eye(eyeR, eyeY)}
          <line x1="45" y1="47" x2="55" y2="47" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_wink':
      return (
        <g key="face">
          <path d="M40 37 Q43 34 46 37" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {eye(eyeR, eyeY)}
          {smile}
        </g>
      );
    case 'face_determined':
      return (
        <g key="face">
          <line x1="39" y1="31" x2="47" y2="34" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <line x1="61" y1="31" x2="53" y2="34" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          {eye(eyeL, eyeY + 1)}
          {eye(eyeR, eyeY + 1)}
          <line x1="45" y1="48" x2="55" y2="48" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_starry':
      return (
        <g key="face">
          {star(eyeL, eyeY, 4, 'sl')}
          {star(eyeR, eyeY, 4, 'sr')}
          {smile}
        </g>
      );
    case 'face_grin':
      return (
        <g key="face">
          {eye(eyeL, eyeY)}
          {eye(eyeR, eyeY)}
          <path d="M42 45 Q50 56 58 45 Z" fill={INK} />
          <path d="M44 46 Q50 49 56 46" fill="#fff" />
        </g>
      );
    case 'face_cyborg':
      return (
        <g key="face">
          {eye(eyeL, eyeY)}
          <rect x={eyeR - 3} y={eyeY - 2} width="6" height="4" rx="1" fill="#06b6d4" />
          <line x1="60" y1="29" x2="66" y2="27" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="45" y1="47" x2="55" y2="47" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_zen':
      return (
        <g key="face">
          <path d="M40 37 Q43 34 46 37" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M54 37 Q57 34 60 37" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M45 46 Q50 49 55 46" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'face_hearts': {
      const heart = (cx, key) => (
        <path
          key={key}
          d={`M${cx} ${eyeY + 3} C ${cx - 4} ${eyeY - 2}, ${cx - 1} ${eyeY - 4}, ${cx} ${eyeY - 1} C ${cx + 1} ${eyeY - 4}, ${cx + 4} ${eyeY - 2}, ${cx} ${eyeY + 3} Z`}
          fill="#ef4444"
        />
      );
      return (
        <g key="face">
          {heart(eyeL, 'hl')}
          {heart(eyeR, 'hr')}
          {smile}
        </g>
      );
    }
    case 'face_cosmic':
      return (
        <g key="face">
          {star(eyeL, eyeY, 4, 'cl', '#06b6d4')}
          {star(eyeR, eyeY, 4, 'cr', '#a855f7')}
          {smile}
        </g>
      );
    case 'face_happy':
    default:
      return (
        <g key="face">
          {eye(eyeL, eyeY)}
          {eye(eyeR, eyeY)}
          {smile}
        </g>
      );
  }
}

function renderAccessory(id) {
  switch (id) {
    case 'acc_glasses':
      return (
        <g key="acc" fill="none" stroke={INK} strokeWidth="2">
          <circle cx="43" cy="36" r="6" />
          <circle cx="57" cy="36" r="6" />
          <line x1="49" y1="36" x2="51" y2="36" />
        </g>
      );
    case 'acc_shades':
      return (
        <g key="acc">
          <rect x="35" y="31" width="13" height="9" rx="2.5" fill={INK} />
          <rect x="52" y="31" width="13" height="9" rx="2.5" fill={INK} />
          <line x1="48" y1="34" x2="52" y2="34" stroke={INK} strokeWidth="2" />
        </g>
      );
    case 'acc_hearing_aid':
      return (
        <g key="acc">
          {/* left behind-the-ear aid */}
          <path d="M31 33 q-4 0 -4 5 q0 4 3 5" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="30.5" cy="32" r="2.2" fill="#94a3b8" />
          {/* right behind-the-ear aid */}
          <path d="M69 33 q4 0 4 5 q0 4 -3 5" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="69.5" cy="32" r="2.2" fill="#94a3b8" />
        </g>
      );
    case 'acc_headphones':
      return (
        <g key="acc">
          <path d="M30 36 Q30 16 50 16 Q70 16 70 36" fill="none" stroke="#334155" strokeWidth="3" />
          <rect x="26" y="34" width="8" height="12" rx="3" fill="#334155" />
          <rect x="66" y="34" width="8" height="12" rx="3" fill="#334155" />
        </g>
      );
    case 'acc_visor':
      return (
        <g key="acc">
          <rect x="32" y="31" width="36" height="8" rx="4" fill="#0891b2" opacity="0.55" />
          <rect x="32" y="31" width="36" height="8" rx="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          <line x1="36" y1="35" x2="64" y2="33" stroke="#a5f3fc" strokeWidth="1" opacity="0.8" />
        </g>
      );
    case 'acc_headset':
      return (
        <g key="acc">
          <path d="M30 36 Q30 16 50 16 Q70 16 70 36" fill="none" stroke="#1f2937" strokeWidth="3" />
          <rect x="26" y="34" width="8" height="12" rx="3" fill="#1f2937" />
          <rect x="66" y="34" width="8" height="12" rx="3" fill="#1f2937" />
          <path d="M30 44 Q26 52 36 52" fill="none" stroke="#1f2937" strokeWidth="2" />
          <circle cx="37" cy="52" r="2" fill="#ef4444" />
        </g>
      );
    case 'acc_halo':
      return (
        <g key="acc">
          <ellipse cx="50" cy="12" rx="14" ry="4" fill="none" stroke="#fde047" strokeWidth="2.5" />
          <ellipse cx="50" cy="12" rx="14" ry="4" fill="none" stroke="#fef9c3" strokeWidth="1" opacity="0.8" />
        </g>
      );
    case 'acc_helmet':
      return (
        <g key="acc">
          <circle cx="50" cy="38" r="24" fill="#bae6fd" opacity="0.25" stroke="#e2e8f0" strokeWidth="2.5" />
          <path d="M34 26 Q40 22 46 24" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
        </g>
      );
    case 'acc_none':
    default:
      return null;
  }
}

// Facial hair — drawn over the lower head, under the mouth (which sits at ~y46),
// so the smile still reads.
function renderBeard(id) {
  const HAIR = '#3f2d23';
  switch (id) {
    case 'beard_stubble':
      return (
        <g key="beard" fill={HAIR} opacity="0.45">
          {[
            [40, 52], [44, 54], [48, 55], [52, 55], [56, 54], [60, 52],
            [37, 48], [63, 48], [42, 50], [58, 50], [50, 53],
            [35, 44], [65, 44],
          ].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="0.8" />)}
        </g>
      );
    case 'beard_mustache':
      return (
        <g key="beard">
          <path d="M42 49 Q46 46 50 49 Q54 46 58 49 Q54 53 50 50 Q46 53 42 49 Z" fill={HAIR} />
        </g>
      );
    case 'beard_goatee':
      return (
        <g key="beard">
          <path d="M44 50 Q50 54 56 50 L54 58 Q50 61 46 58 Z" fill={HAIR} />
          <path d="M43 49 Q50 47 57 49 Q50 52 43 49 Z" fill={HAIR} />
        </g>
      );
    case 'beard_full':
      return (
        <g key="beard">
          <path d="M31 42 Q33 64 50 66 Q67 64 69 42 Q60 56 50 56 Q40 56 31 42 Z" fill={HAIR} />
          <path d="M42 49 Q50 47 58 49 Q50 52 42 49 Z" fill={HAIR} />
        </g>
      );
    case 'beard_long':
      return (
        <g key="beard">
          <path d="M32 42 Q34 70 50 76 Q66 70 68 42 Q60 56 50 56 Q40 56 32 42 Z" fill={HAIR} />
          <path d="M42 49 Q50 47 58 49 Q50 52 42 49 Z" fill={HAIR} />
        </g>
      );
    case 'beard_wizard':
      return (
        <g key="beard">
          <path d="M33 42 Q36 86 50 92 Q64 86 67 42 Q58 56 50 56 Q42 56 33 42 Z" fill="#e2e8f0" />
          <path d="M42 49 Q50 47 58 49 Q50 53 42 49 Z" fill="#e2e8f0" />
        </g>
      );
    case 'beard_none':
    default:
      return null;
  }
}

// Makeup — drawn before the face features so eyes/mouth stay on top.
function renderMakeup(id) {
  switch (id) {
    case 'makeup_blush':
      return (
        <g key="makeup">
          <ellipse cx="38" cy="43" rx="4" ry="2.6" fill="#fb7185" opacity="0.5" />
          <ellipse cx="62" cy="43" rx="4" ry="2.6" fill="#fb7185" opacity="0.5" />
        </g>
      );
    case 'makeup_freckles':
      return (
        <g key="makeup" fill="#9a6a44">
          {[[40, 42], [44, 44], [36, 45], [60, 42], [56, 44], [64, 45]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="0.9" />
          ))}
        </g>
      );
    case 'makeup_eyeshadow':
      return (
        <g key="makeup">
          <path d="M39 33 Q43 30 47 33" stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M53 33 Q57 30 61 33" stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'makeup_glam':
      return (
        <g key="makeup">
          <ellipse cx="38" cy="43" rx="4" ry="2.6" fill="#f472b6" opacity="0.5" />
          <ellipse cx="62" cy="43" rx="4" ry="2.6" fill="#f472b6" opacity="0.5" />
          {star(64, 31, 2, 'g1', '#fde047')}
          {star(36, 31, 1.5, 'g2', '#fde047')}
        </g>
      );
    case 'makeup_facepaint':
      return <g key="makeup">{star(62, 44, 3.4, 'fp', '#ef4444')}</g>;
    case 'makeup_none':
    default:
      return null;
  }
}

// Earrings — drawn at the sides of the head (~ear height).
function renderEarrings(id) {
  const L = 31, R = 69, y = 44;
  switch (id) {
    case 'ear_studs':
      return (
        <g key="ear">
          <circle cx={L} cy={y} r="1.6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
          <circle cx={R} cy={y} r="1.6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        </g>
      );
    case 'ear_hoops':
      return (
        <g key="ear" fill="none" stroke="#eab308" strokeWidth="1.5">
          <circle cx={L} cy={y + 2} r="3" />
          <circle cx={R} cy={y + 2} r="3" />
        </g>
      );
    case 'ear_drops':
      return (
        <g key="ear" fill="#eab308">
          <circle cx={L} cy={y} r="1.4" /><rect x={L - 0.8} y={y} width="1.6" height="5" rx="0.8" /><circle cx={L} cy={y + 6} r="1.6" />
          <circle cx={R} cy={y} r="1.4" /><rect x={R - 0.8} y={y} width="1.6" height="5" rx="0.8" /><circle cx={R} cy={y + 6} r="1.6" />
        </g>
      );
    case 'ear_gems':
      return (
        <g key="ear">
          <path d={`M${L} ${y - 2} L${L + 2} ${y} L${L} ${y + 2} L${L - 2} ${y} Z`} fill="#22d3ee" />
          <path d={`M${R} ${y - 2} L${R + 2} ${y} L${R} ${y + 2} L${R - 2} ${y} Z`} fill="#22d3ee" />
        </g>
      );
    case 'ear_stars':
      return (
        <g key="ear">
          {star(L, y + 4, 2.4, 'esl', '#fde047')}
          {star(R, y + 4, 2.4, 'esr', '#fde047')}
        </g>
      );
    case 'ear_none':
    default:
      return null;
  }
}

// Hats — drawn over the top of the head, above hair/face. The Crown is special:
// it only renders while the wearer is actually the current champion, so losing
// the top spot takes it off even if it's still "equipped".
function renderHat(id, crownTier) {
  if (id === 'hat_crown' && !crownTier) return null;
  switch (id) {
    case 'hat_cap':
      return (
        <g key="hat">
          <path d="M31 26 Q50 8 69 26 Q50 22 31 26 Z" fill="#dc2626" />
          <path d="M31 26 Q22 28 24 31 L40 28 Z" fill="#b91c1c" />
          <circle cx="50" cy="13" r="1.6" fill="#fca5a5" />
        </g>
      );
    case 'hat_bucket':
      return (
        <g key="hat">
          <path d="M32 24 Q50 10 68 24 L68 27 L32 27 Z" fill="#84cc16" />
          <path d="M27 27 Q50 33 73 27 L71 31 Q50 36 29 31 Z" fill="#65a30d" />
        </g>
      );
    case 'hat_beanie':
      return (
        <g key="hat">
          <path d="M30 30 Q30 10 50 10 Q70 10 70 30 Z" fill="#0ea5e9" />
          <rect x="29" y="28" width="42" height="5" rx="2.5" fill="#0284c7" />
          <circle cx="50" cy="9" r="3.5" fill="#e0f2fe" />
        </g>
      );
    case 'hat_cowboy':
      return (
        <g key="hat">
          <path d="M22 27 Q50 36 78 27 Q70 31 50 31 Q30 31 22 27 Z" fill="#92400e" />
          <path d="M34 27 Q34 12 50 12 Q66 12 66 27 Q50 23 34 27 Z" fill="#b45309" />
          <rect x="34" y="23" width="32" height="3" fill="#78350f" />
        </g>
      );
    case 'hat_chef':
      return (
        <g key="hat">
          <rect x="37" y="20" width="26" height="8" rx="1" fill="#f8fafc" />
          <circle cx="42" cy="14" r="7" fill="#f8fafc" />
          <circle cx="58" cy="14" r="7" fill="#f8fafc" />
          <circle cx="50" cy="11" r="8" fill="#f8fafc" />
        </g>
      );
    case 'hat_tophat':
      return (
        <g key="hat">
          <rect x="30" y="20" width="40" height="4" rx="1" fill="#111827" />
          <rect x="38" y="2" width="24" height="20" rx="1" fill="#111827" />
          <rect x="38" y="15" width="24" height="4" fill="#dc2626" />
        </g>
      );
    case 'hat_wizard':
      return (
        <g key="hat">
          <path d="M30 28 L50 -2 L70 28 Q50 22 30 28 Z" fill="#5b21b6" />
          <path d="M26 28 Q50 34 74 28 L72 31 Q50 37 28 31 Z" fill="#4c1d95" />
          {star(50, 14, 2.4, 'wh', '#fde047')}
        </g>
      );
    case 'hat_flowers':
      return (
        <g key="hat">
          {[['#f472b6', 34], ['#fde047', 42], ['#fb7185', 50], ['#a78bfa', 58], ['#fdba74', 66]].map(([c, cx], i) => (
            <g key={i}>
              <circle cx={cx} cy="20" r="3" fill={c} />
              <circle cx={cx} cy="20" r="1" fill="#fff7ed" />
            </g>
          ))}
        </g>
      );
    case 'hat_party':
      return (
        <g key="hat">
          <path d="M50 0 L40 20 L60 20 Z" fill="#ec4899" />
          <path d="M50 0 L45 10 L55 10 Z" fill="#f9a8d4" />
          <circle cx="50" cy="1" r="3" fill="#fde047" />
        </g>
      );
    case 'hat_crown': {
      const c = CROWN_TIERS[crownTier] || CROWN_TIERS[1];
      return (
        <g key="hat">
          <path d="M36 18 L40 8 L46 15 L50 5 L54 15 L60 8 L64 18 Z" fill={c.points} stroke={c.stroke} strokeWidth="1" />
          <rect x="36" y="18" width="28" height="4" rx="1" fill={c.band} />
          <circle cx="50" cy="6" r="1.8" fill={c.gem} />
        </g>
      );
    }
    case 'hat_none':
    default:
      return null;
  }
}

function renderPet(id) {
  switch (id) {
    case 'pet_cat':
      return (
        <g key="pet">
          <path d="M93 86 Q99 84 97 92" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="84" cy="86" rx="9" ry="8" fill="#f59e0b" />
          <path d="M77 80 L79 73 L83 79 Z" fill="#f59e0b" />
          <path d="M91 80 L89 73 L85 79 Z" fill="#f59e0b" />
          <path d="M78 81 L79.5 76 L82 80 Z" fill="#fbbf24" />
          <path d="M90 81 L88.5 76 L86 80 Z" fill="#fbbf24" />
          <circle cx="81" cy="85" r="1.3" fill={INK} />
          <circle cx="87" cy="85" r="1.3" fill={INK} />
          <path d="M83 88 L85 88 L84 89 Z" fill="#fb7185" />
          <line x1="76" y1="87" x2="82" y2="87.5" stroke={INK} strokeWidth="0.4" />
          <line x1="92" y1="87" x2="86" y2="87.5" stroke={INK} strokeWidth="0.4" />
        </g>
      );
    case 'pet_robocat':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="9" ry="8" fill="#94a3b8" />
          <path d="M77 80 L79 73 L83 79 Z" fill="#94a3b8" />
          <path d="M91 80 L89 73 L85 79 Z" fill="#94a3b8" />
          <path d="M93 86 Q99 84 97 92" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="81" cy="85" r="1.4" fill="#06b6d4" />
          <circle cx="87" cy="85" r="1.4" fill="#06b6d4" />
        </g>
      );
    case 'pet_dog':
      return (
        <g key="pet">
          <ellipse cx="84" cy="87" rx="9" ry="8" fill="#b07c4f" />
          <ellipse cx="76" cy="86" rx="3" ry="5" fill="#8a5a32" />
          <ellipse cx="92" cy="86" rx="3" ry="5" fill="#8a5a32" />
          <ellipse cx="84" cy="90" rx="4.5" ry="3.5" fill="#e7c9a8" />
          <circle cx="81" cy="85" r="1.3" fill={INK} />
          <circle cx="87" cy="85" r="1.3" fill={INK} />
          <ellipse cx="84" cy="89" rx="1.3" ry="1" fill={INK} />
        </g>
      );
    case 'pet_bunny':
      return (
        <g key="pet">
          <ellipse cx="80" cy="78" rx="2.6" ry="6" fill="#f8fafc" />
          <ellipse cx="88" cy="78" rx="2.6" ry="6" fill="#f8fafc" />
          <ellipse cx="80" cy="78" rx="1.1" ry="3.5" fill="#fbcfe8" />
          <ellipse cx="88" cy="78" rx="1.1" ry="3.5" fill="#fbcfe8" />
          <ellipse cx="84" cy="88" rx="8" ry="7" fill="#f8fafc" />
          <circle cx="81.5" cy="87" r="1.2" fill={INK} />
          <circle cx="86.5" cy="87" r="1.2" fill={INK} />
          <path d="M84 89 L83 90.5 L85 90.5 Z" fill="#fb7185" />
        </g>
      );
    case 'pet_guineapig':
      return (
        <g key="pet">
          <ellipse cx="84" cy="87" rx="10" ry="7" fill="#c8884f" />
          <path d="M74 84 Q72 82 75 81 Q77 82 77 85 Z" fill="#f8fafc" />
          <path d="M84 80 Q80 82 88 82 Q86 80 84 80 Z" fill="#f8fafc" />
          <circle cx="79" cy="86" r="1.3" fill={INK} />
          <circle cx="86" cy="85" r="1.3" fill={INK} />
          <ellipse cx="82" cy="89" rx="1.4" ry="1" fill="#7c4a24" />
        </g>
      );
    case 'pet_capybara':
      return (
        <g key="pet">
          <ellipse cx="84" cy="88" rx="11" ry="7.5" fill="#9a6b43" />
          <rect x="74" y="82" width="6" height="9" rx="3" fill="#9a6b43" />
          <circle cx="74" cy="80" r="1.6" fill="#7c5436" />
          <circle cx="80" cy="80" r="1.6" fill="#7c5436" />
          <circle cx="76" cy="85" r="1.1" fill={INK} />
          <ellipse cx="74" cy="90" rx="2" ry="1.4" fill="#6b4a2e" />
        </g>
      );
    case 'pet_gecko':
      return (
        <g key="pet">
          <path d="M72 90 Q78 84 86 86 Q94 88 96 84 Q92 92 84 91 Q78 93 74 96 Z" fill="#4ade80" />
          <circle cx="76" cy="88" r="2.4" fill="#86efac" />
          <circle cx="76" cy="88" r="1" fill={INK} />
          <circle cx="80" cy="92" r="1" fill="#22c55e" />
          <circle cx="88" cy="91" r="1" fill="#22c55e" />
        </g>
      );
    case 'pet_cow':
      return (
        <g key="pet">
          <ellipse cx="84" cy="87" rx="9" ry="8" fill="#f8fafc" />
          <path d="M76 82 Q73 80 75 78 Q78 79 78 82 Z" fill="#f8fafc" />
          <path d="M92 82 Q95 80 93 78 Q90 79 90 82 Z" fill="#f8fafc" />
          <path d="M76 80 L77 77 L79 80 Z" fill="#cbd5e1" />
          <path d="M92 80 L91 77 L89 80 Z" fill="#cbd5e1" />
          <circle cx="80" cy="84" r="2.2" fill={INK} />
          <ellipse cx="88" cy="90" rx="3" ry="2" fill="#1f2937" />
          <ellipse cx="84" cy="91" rx="4" ry="2.6" fill="#fbcfe8" />
          <circle cx="81.5" cy="86" r="1.1" fill={INK} />
          <circle cx="87" cy="86" r="1.1" fill={INK} />
        </g>
      );
    case 'pet_frog':
      return (
        <g key="pet">
          <ellipse cx="84" cy="89" rx="9" ry="6.5" fill="#22c55e" />
          <circle cx="79" cy="82" r="3.5" fill="#22c55e" />
          <circle cx="89" cy="82" r="3.5" fill="#22c55e" />
          <circle cx="79" cy="82" r="1.6" fill="#fff" />
          <circle cx="89" cy="82" r="1.6" fill="#fff" />
          <circle cx="79" cy="82" r="0.9" fill={INK} />
          <circle cx="89" cy="82" r="0.9" fill={INK} />
          <path d="M78 90 Q84 94 90 90" fill="none" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case 'pet_horse':
      return (
        <g key="pet">
          <path d="M80 94 L80 84 Q80 78 86 77 L92 75 L92 80 L86 82 L86 94 Z" fill="#a16207" />
          <path d="M86 76 L88 72 L90 77 Z" fill="#a16207" />
          <path d="M84 80 Q88 78 92 76 Q90 82 86 84 Z" fill="#3f2d23" />
          <circle cx="89" cy="79" r="1.1" fill={INK} />
        </g>
      );
    case 'pet_bot':
      return (
        <g key="pet">
          <line x1="84" y1="74" x2="84" y2="79" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="84" cy="73" r="1.6" fill="#ef4444" />
          <rect x="76" y="79" width="16" height="14" rx="3" fill="#64748b" />
          <circle cx="81" cy="85" r="1.6" fill="#e2e8f0" />
          <circle cx="87" cy="85" r="1.6" fill="#e2e8f0" />
          <line x1="80" y1="90" x2="88" y2="90" stroke="#e2e8f0" strokeWidth="1.5" />
        </g>
      );
    case 'pet_dragon':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="9" ry="8" fill="#22c55e" />
          <path d="M75 84 L68 80 L74 88 Z" fill="#16a34a" />
          <path d="M80 79 L82 74 L84 79 Z" fill="#15803d" />
          <path d="M88 79 L90 74 L92 79 Z" fill="#15803d" />
          <circle cx="81" cy="85" r="1.4" fill={INK} />
          <circle cx="87" cy="85" r="1.4" fill={INK} />
        </g>
      );
    case 'pet_ghost':
      return (
        <g key="pet">
          <path d="M76 92 L76 82 Q76 74 84 74 Q92 74 92 82 L92 92 L89 89 L86 92 L84 89 L82 92 L79 89 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="81" cy="83" r="1.5" fill={INK} />
          <circle cx="87" cy="83" r="1.5" fill={INK} />
        </g>
      );
    case 'pet_owl':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="8" ry="9" fill="#a16207" />
          <path d="M77 79 L79 74 L82 79 Z" fill="#854d0e" />
          <path d="M91 79 L89 74 L86 79 Z" fill="#854d0e" />
          <circle cx="81" cy="84" r="2.4" fill="#fef3c7" />
          <circle cx="87" cy="84" r="2.4" fill="#fef3c7" />
          <circle cx="81" cy="84" r="1.1" fill={INK} />
          <circle cx="87" cy="84" r="1.1" fill={INK} />
          <path d="M84 87 L82 89 L86 89 Z" fill="#f59e0b" />
        </g>
      );
    case 'pet_penguin':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="7.5" ry="9" fill="#1f2937" />
          <ellipse cx="84" cy="88" rx="4.5" ry="6" fill="#f8fafc" />
          <circle cx="81.5" cy="83" r="1.2" fill="#f8fafc" />
          <circle cx="86.5" cy="83" r="1.2" fill="#f8fafc" />
          <circle cx="81.5" cy="83" r="0.6" fill={INK} />
          <circle cx="86.5" cy="83" r="0.6" fill={INK} />
          <path d="M84 85 L82 87 L86 87 Z" fill="#f59e0b" />
        </g>
      );
    case 'pet_phoenix':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="7" ry="8" fill="#f97316" />
          <path d="M77 84 L70 78 L75 88 Z" fill="#ef4444" />
          <path d="M91 84 L98 78 L93 88 Z" fill="#ef4444" />
          <path d="M84 78 L82 72 L86 72 Z" fill="#fbbf24" />
          <circle cx="82" cy="85" r="1.1" fill={INK} />
          <circle cx="86" cy="85" r="1.1" fill={INK} />
        </g>
      );
    case 'pet_unicorn':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="8" ry="8" fill="#fce7f3" />
          <path d="M81 79 L80 73 L83 79 Z" fill="#f9a8d4" />
          <path d="M84 78 L84 70 L86 78 Z" fill="#fde047" />
          <path d="M88 80 Q94 78 92 86" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
          <circle cx="82" cy="85" r="1.1" fill={INK} />
          <circle cx="87" cy="85" r="1.1" fill={INK} />
        </g>
      );
    case 'pet_ufo':
      return (
        <g key="pet">
          <ellipse cx="84" cy="90" rx="11" ry="3.5" fill="#64748b" />
          <ellipse cx="84" cy="86" rx="6" ry="5" fill="#94a3b8" />
          <path d="M78 90 Q84 98 90 90 Z" fill="#22c55e" opacity="0.4" />
          {[80, 84, 88].map((cx) => <circle key={cx} cx={cx} cy="90" r="1" fill="#fde047" />)}
        </g>
      );
    case 'pet_none':
    default:
      return null;
  }
}

// Crown colors by rank tier: 1 = gold (#1), 2 = silver (#2), 3 = bronze (#3).
const CROWN_TIERS = {
  1: { points: '#fbbf24', stroke: '#d97706', band: '#f59e0b', gem: '#fde68a' },
  2: { points: '#e2e8f0', stroke: '#94a3b8', band: '#cbd5e1', gem: '#f8fafc' },
  3: { points: '#d9a066', stroke: '#92400e', band: '#b45309', gem: '#fed7aa' },
};

// Normalize the `crown` prop (boolean for back-compat, or a 1/2/3 tier) to a
// tier number; 0 means no crown.
function crownTierFromProp(crown) {
  if (crown === 2 || crown === 3) return crown;
  return crown ? 1 : 0;
}

function renderCrown(tier = 1) {
  const c = CROWN_TIERS[tier] || CROWN_TIERS[1];
  return (
    <g key="crown">
      <path d="M36 18 L40 8 L46 15 L50 5 L54 15 L60 8 L64 18 Z" fill={c.points} stroke={c.stroke} strokeWidth="1" />
      <rect x="36" y="18" width="28" height="4" rx="1" fill={c.band} />
      <circle cx="50" cy="6" r="1.8" fill={c.gem} />
    </g>
  );
}

export default function Avatar({ avatar, size = 64, crown = false, className = '', title }) {
  const a = normalizeAvatar(avatar);
  const baseItem = getItem(a.base);
  const hairColorItem = getItem(a.haircolor);
  const crownTier = crownTierFromProp(crown);
  const uid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title || 'Avatar'}
    >
      <defs>
        <clipPath id={`${uid}-bgclip`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-bgclip)`}>{renderBackground(a.background, uid)}</g>
      {renderBase(baseItem, uid)}
      {renderOutfit(a.outfit)}
      {renderBeard(a.beard)}
      {renderMakeup(a.makeup)}
      {renderHair(a.hair, hairColorItem, uid)}
      {renderFace(a.face)}
      {renderEarrings(a.earrings)}
      {renderAccessory(a.accessory)}
      {renderHat(a.hat, crownTier)}
      {renderPet(a.pet)}
      {/* Auto rank crown — skip if they've already equipped the Crown hat. */}
      {crownTier > 0 && a.hat !== 'hat_crown' && renderCrown(crownTier)}
    </svg>
  );
}
