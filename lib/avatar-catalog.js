// Avatar catalog — pure data, no rendering, so it's safe to import anywhere
// (including the admin view). Each item belongs to a slot and unlocks either at
// a level or when a badge is earned. The SVG art for each id lives in
// components/avatar.jsx.

export const AVATAR_SLOTS = ['base', 'face', 'outfit', 'accessory', 'pet', 'background'];

export const SLOT_LABELS = {
  base: 'Color',
  face: 'Face',
  outfit: 'Outfit',
  accessory: 'Accessory',
  pet: 'Sidekick',
  background: 'Background',
};

export const AVATAR_ITEMS = [
  // --- base body color ---
  { id: 'base_blue',   slot: 'base', name: 'Classic Blue', color: '#6366f1', unlock: { level: 1 } },
  { id: 'base_mint',   slot: 'base', name: 'Mint',         color: '#10b981', unlock: { level: 1 } },
  { id: 'base_amber',  slot: 'base', name: 'Amber',        color: '#f59e0b', unlock: { level: 3 } },
  { id: 'base_rose',   slot: 'base', name: 'Rose',         color: '#f43f5e', unlock: { level: 6 } },
  { id: 'base_violet', slot: 'base', name: 'Violet',       color: '#8b5cf6', unlock: { level: 10 } },
  { id: 'base_teal',   slot: 'base', name: 'Teal',         color: '#14b8a6', unlock: { level: 16 } },
  { id: 'base_gold',   slot: 'base', name: 'Gold',         color: '#eab308', unlock: { level: 25 } },

  // --- face / expression ---
  { id: 'face_happy',      slot: 'face', name: 'Happy',      unlock: { level: 1 } },
  { id: 'face_cool',       slot: 'face', name: 'Cool',       unlock: { level: 2 } },
  { id: 'face_wink',       slot: 'face', name: 'Wink',       unlock: { level: 4 } },
  { id: 'face_determined', slot: 'face', name: 'Determined', unlock: { level: 8 } },
  { id: 'face_starry',     slot: 'face', name: 'Starry-Eyed', unlock: { badge: 'level_5' } },

  // --- outfit ---
  { id: 'outfit_tee',    slot: 'outfit', name: 'T-Shirt',   unlock: { level: 1 } },
  { id: 'outfit_hoodie', slot: 'outfit', name: 'Hoodie',    unlock: { level: 5 } },
  { id: 'outfit_blazer', slot: 'outfit', name: 'Blazer',    unlock: { level: 12 } },
  { id: 'outfit_overalls', slot: 'outfit', name: 'Overalls', unlock: { level: 18 } },
  { id: 'outfit_cape',   slot: 'outfit', name: 'Hero Cape', unlock: { badge: 'seven_day_streak' } },

  // --- accessory (head / face gear) ---
  { id: 'acc_none',       slot: 'accessory', name: 'None',       unlock: { level: 1 } },
  { id: 'acc_glasses',    slot: 'accessory', name: 'Glasses',    unlock: { level: 3 } },
  { id: 'acc_headphones', slot: 'accessory', name: 'Headphones', unlock: { level: 7 } },
  { id: 'acc_shades',     slot: 'accessory', name: 'Shades',     unlock: { level: 15 } },
  { id: 'acc_party',      slot: 'accessory', name: 'Party Hat',  unlock: { badge: 'first_quest' } },
  { id: 'acc_beanie',     slot: 'accessory', name: 'Beanie',     unlock: { badge: 'ten_lessons' } },

  // --- pet sidekick ---
  { id: 'pet_none',   slot: 'pet', name: 'None',          unlock: { level: 1 } },
  { id: 'pet_cat',    slot: 'pet', name: 'Robo-Cat',      unlock: { level: 9 } },
  { id: 'pet_bot',    slot: 'pet', name: 'Mini-Bot',      unlock: { level: 14 } },
  { id: 'pet_dragon', slot: 'pet', name: 'Pocket Dragon', unlock: { level: 20 } },
  { id: 'pet_ghost',  slot: 'pet', name: 'Friendly Ghost', unlock: { badge: 'three_day_streak' } },

  // --- background scene ---
  { id: 'bg_none',     slot: 'background', name: 'None',     unlock: { level: 1 } },
  { id: 'bg_sky',      slot: 'background', name: 'Sky',      unlock: { level: 1 } },
  { id: 'bg_blush',    slot: 'background', name: 'Blush',    unlock: { level: 2 } },
  { id: 'bg_sunset',   slot: 'background', name: 'Sunset',   unlock: { level: 5 } },
  { id: 'bg_forest',   slot: 'background', name: 'Forest',   unlock: { level: 8 } },
  { id: 'bg_grid',     slot: 'background', name: 'Grid',     unlock: { level: 12 } },
  { id: 'bg_night',    slot: 'background', name: 'Starry Night', unlock: { level: 18 } },
  { id: 'bg_gold',     slot: 'background', name: 'Golden Hour',  unlock: { level: 25 } },
  { id: 'bg_confetti', slot: 'background', name: 'Confetti', unlock: { badge: 'first_quest' } },
  { id: 'bg_streak',   slot: 'background', name: 'On Fire',  unlock: { badge: 'seven_day_streak' } },
];

export const DEFAULT_AVATAR = {
  base: 'base_blue',
  face: 'face_happy',
  outfit: 'outfit_tee',
  accessory: 'acc_none',
  pet: 'pet_none',
  background: 'bg_none',
};

export function getItem(id) {
  return AVATAR_ITEMS.find((it) => it.id === id) || null;
}

export function itemsForSlot(slot) {
  return AVATAR_ITEMS.filter((it) => it.slot === slot);
}

// Is an item unlocked for a learner at `level` with the given earned badge ids?
// `badgeIds` may be a Set or an array.
export function isItemUnlocked(item, { level = 1, badgeIds } = {}) {
  if (!item?.unlock) return true;
  if (item.unlock.level != null) return level >= item.unlock.level;
  if (item.unlock.badge) {
    if (badgeIds instanceof Set) return badgeIds.has(item.unlock.badge);
    if (Array.isArray(badgeIds)) return badgeIds.includes(item.unlock.badge);
    return false;
  }
  return true;
}

// A short human label for what unlocks an item (for the locker's locked state).
export function unlockLabel(item) {
  if (!item?.unlock) return '';
  if (item.unlock.level != null) return `Reach level ${item.unlock.level}`;
  if (item.unlock.badge) return 'Earn a badge';
  return '';
}

// Merge a stored (possibly partial / older) avatar with the defaults so the
// renderer always has every slot filled.
export function normalizeAvatar(avatar) {
  return { ...DEFAULT_AVATAR, ...(avatar || {}) };
}

// Count how many items a learner has unlocked (for the locker header / progress).
export function unlockedCount(ctx) {
  return AVATAR_ITEMS.filter((it) => isItemUnlocked(it, ctx)).length;
}
