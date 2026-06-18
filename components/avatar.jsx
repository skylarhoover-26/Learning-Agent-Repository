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
    case 'bg_none':
    default:
      return null;
  }
}

function renderBase(color) {
  return (
    <g key="base">
      {/* torso */}
      <path d="M28 100 L28 74 Q28 56 50 56 Q72 56 72 74 L72 100 Z" fill={color} />
      {/* head */}
      <circle cx="50" cy="38" r="20" fill={color} />
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
      return tee('#e5e7eb', '#cbd5e1');
  }
}

function renderFace(id) {
  const eyeL = 43, eyeR = 57, eyeY = 36;
  const smile = <path d="M43 45 Q50 52 57 45" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  switch (id) {
    case 'face_cool':
      return (
        <g key="face">
          <circle cx={eyeL} cy={eyeY} r="2.6" fill={INK} />
          <circle cx={eyeR} cy={eyeY} r="2.6" fill={INK} />
          <line x1="45" y1="47" x2="55" y2="47" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'face_wink':
      return (
        <g key="face">
          <path d="M40 37 Q43 34 46 37" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx={eyeR} cy={eyeY} r="2.6" fill={INK} />
          {smile}
        </g>
      );
    case 'face_determined':
      return (
        <g key="face">
          <line x1="39" y1="31" x2="47" y2="34" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <line x1="61" y1="31" x2="53" y2="34" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          <circle cx={eyeL} cy={eyeY + 1} r="2.6" fill={INK} />
          <circle cx={eyeR} cy={eyeY + 1} r="2.6" fill={INK} />
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
    case 'face_happy':
    default:
      return (
        <g key="face">
          <circle cx={eyeL} cy={eyeY} r="2.8" fill={INK} />
          <circle cx={eyeR} cy={eyeY} r="2.8" fill={INK} />
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
    case 'acc_headphones':
      return (
        <g key="acc">
          <path d="M30 36 Q30 16 50 16 Q70 16 70 36" fill="none" stroke="#334155" strokeWidth="3" />
          <rect x="26" y="34" width="8" height="12" rx="3" fill="#334155" />
          <rect x="66" y="34" width="8" height="12" rx="3" fill="#334155" />
        </g>
      );
    case 'acc_party':
      return (
        <g key="acc">
          <path d="M50 0 L40 20 L60 20 Z" fill="#ec4899" />
          <path d="M50 0 L45 10 L55 10 Z" fill="#f9a8d4" />
          <circle cx="50" cy="1" r="3" fill="#fde047" />
        </g>
      );
    case 'acc_beanie':
      return (
        <g key="acc">
          <path d="M30 30 Q30 10 50 10 Q70 10 70 30 Z" fill="#0ea5e9" />
          <rect x="29" y="28" width="42" height="5" rx="2.5" fill="#0284c7" />
          <circle cx="50" cy="9" r="3.5" fill="#e0f2fe" />
        </g>
      );
    case 'acc_none':
    default:
      return null;
  }
}

function renderPet(id) {
  switch (id) {
    case 'pet_cat':
      return (
        <g key="pet">
          <ellipse cx="84" cy="86" rx="9" ry="8" fill="#94a3b8" />
          <path d="M77 80 L79 73 L83 79 Z" fill="#94a3b8" />
          <path d="M91 80 L89 73 L85 79 Z" fill="#94a3b8" />
          <path d="M93 86 Q99 84 97 92" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="81" cy="85" r="1.4" fill={INK} />
          <circle cx="87" cy="85" r="1.4" fill={INK} />
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
    case 'pet_none':
    default:
      return null;
  }
}

function renderCrown() {
  return (
    <g key="crown">
      <path d="M36 18 L40 8 L46 15 L50 5 L54 15 L60 8 L64 18 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      <rect x="36" y="18" width="28" height="4" rx="1" fill="#f59e0b" />
      <circle cx="50" cy="6" r="1.8" fill="#fde68a" />
    </g>
  );
}

export default function Avatar({ avatar, size = 64, crown = false, className = '', title }) {
  const a = normalizeAvatar(avatar);
  const color = getItem(a.base)?.color || '#6366f1';
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
      {renderBase(color)}
      {renderOutfit(a.outfit)}
      {renderFace(a.face)}
      {renderAccessory(a.accessory)}
      {renderPet(a.pet)}
      {crown && renderCrown()}
    </svg>
  );
}
