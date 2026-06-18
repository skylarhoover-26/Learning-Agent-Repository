'use client';

import { normalizeAvatar, getItem } from '@/lib/avatar-catalog';

// Layered SVG avatar. Renders, back-to-front: body+head (base color), outfit,
// face, accessory, pet sidekick, and an optional crown (top of the department
// leaderboard). viewBox is a fixed 0 0 100 100 so every layer aligns; `size`
// just scales it.

const INK = '#1f2937';

function star(cx, cy, r, key) {
  const p = [
    [cx, cy - r], [cx + r * 0.32, cy - r * 0.32], [cx + r, cy], [cx + r * 0.32, cy + r * 0.32],
    [cx, cy + r], [cx - r * 0.32, cy + r * 0.32], [cx - r, cy], [cx - r * 0.32, cy - r * 0.32],
  ].map((pt) => pt.join(',')).join(' ');
  return <polygon key={key} points={p} fill={INK} />;
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

function renderOutfit(id) {
  const torso = 'M28 100 L28 74 Q28 56 50 56 Q72 56 72 74 L72 100 Z';
  switch (id) {
    case 'outfit_hoodie':
      return (
        <g key="outfit">
          <path d={torso} fill="#475569" />
          <path d="M38 58 Q50 50 62 58 L62 64 Q50 58 38 64 Z" fill="#334155" />
          <line x1="46" y1="62" x2="46" y2="74" stroke="#e2e8f0" strokeWidth="1.5" />
          <line x1="54" y1="62" x2="54" y2="74" stroke="#e2e8f0" strokeWidth="1.5" />
        </g>
      );
    case 'outfit_blazer':
      return (
        <g key="outfit">
          <path d={torso} fill="#1e293b" />
          <path d="M50 58 L42 100 L58 100 Z" fill="#f8fafc" />
          <path d="M50 58 L40 74 L46 100 L50 70 Z" fill="#0f172a" />
          <path d="M50 58 L60 74 L54 100 L50 70 Z" fill="#0f172a" />
          <line x1="50" y1="72" x2="50" y2="96" stroke="#334155" strokeWidth="1" />
        </g>
      );
    case 'outfit_overalls':
      return (
        <g key="outfit">
          <path d={torso} fill="#2563eb" />
          <rect x="40" y="58" width="5" height="16" fill="#1d4ed8" />
          <rect x="55" y="58" width="5" height="16" fill="#1d4ed8" />
          <rect x="43" y="78" width="14" height="10" rx="1.5" fill="#1d4ed8" />
        </g>
      );
    case 'outfit_cape':
      return (
        <g key="outfit">
          {/* cape behind shoulders */}
          <path d="M30 60 L20 100 L40 96 L50 60 Z" fill="#dc2626" />
          <path d="M70 60 L80 100 L60 96 L50 60 Z" fill="#dc2626" />
          <path d={torso} fill="#e5e7eb" />
          <path d="M44 57 Q50 63 56 57 L56 60 Q50 65 44 60 Z" fill="#cbd5e1" />
        </g>
      );
    case 'outfit_tee':
    default:
      return (
        <g key="outfit">
          <path d={torso} fill="#e5e7eb" />
          <path d="M44 57 Q50 63 56 57 L56 60 Q50 65 44 60 Z" fill="#cbd5e1" />
        </g>
      );
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title || 'Avatar'}
    >
      {renderBase(color)}
      {renderOutfit(a.outfit)}
      {renderFace(a.face)}
      {renderAccessory(a.accessory)}
      {renderPet(a.pet)}
      {crown && renderCrown()}
    </svg>
  );
}
