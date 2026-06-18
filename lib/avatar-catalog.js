// Avatar catalog — pure data, no rendering, so it's safe to import anywhere
// (including the admin view). Each item belongs to a slot and unlocks either at
// a level or when a badge is earned. The SVG art for each id lives in
// components/avatar.jsx.

export const AVATAR_SLOTS = [
  'base', 'face', 'beard', 'makeup', 'earrings', 'outfit', 'hat', 'accessory', 'pet', 'background',
];

export const SLOT_LABELS = {
  base: 'Skin',
  face: 'Face',
  beard: 'Beard',
  makeup: 'Makeup',
  earrings: 'Earrings',
  outfit: 'Outfit',
  hat: 'Hat',
  accessory: 'Gear',
  pet: 'Sidekick',
  background: 'Background',
};

export const AVATAR_ITEMS = [
  // --- skin tone: realistic tones available from the start ---
  { id: 'skin_peach', slot: 'base', name: 'Peach',  color: '#f1c5a0', unlock: { level: 1 } },
  { id: 'skin_pale',  slot: 'base', name: 'Pale',   color: '#f6dbc6', unlock: { level: 1 } },
  { id: 'skin_light', slot: 'base', name: 'Light',  color: '#e0ac82', unlock: { level: 1 } },
  { id: 'skin_olive', slot: 'base', name: 'Olive',  color: '#c89b6a', unlock: { level: 1 } },
  { id: 'skin_tan',   slot: 'base', name: 'Tan',    color: '#a9744f', unlock: { level: 1 } },
  { id: 'skin_brown', slot: 'base', name: 'Brown',  color: '#7c4f30', unlock: { level: 1 } },
  { id: 'skin_deep',  slot: 'base', name: 'Deep',   color: '#5a3622', unlock: { level: 1 } },
  // fun colors: now unlockable across the curve
  { id: 'base_blue',   slot: 'base', name: 'Blue',     color: '#6366f1', unlock: { level: 5 } },
  { id: 'base_mint',   slot: 'base', name: 'Mint',     color: '#10b981', unlock: { level: 8 } },
  { id: 'base_amber',  slot: 'base', name: 'Amber',    color: '#f59e0b', unlock: { level: 12 } },
  { id: 'base_rose',   slot: 'base', name: 'Rose',     color: '#f43f5e', unlock: { level: 16 } },
  { id: 'base_violet', slot: 'base', name: 'Violet',   color: '#8b5cf6', unlock: { level: 22 } },
  { id: 'base_teal',    slot: 'base', name: 'Teal',    color: '#14b8a6', unlock: { level: 30 } },
  { id: 'base_gold',    slot: 'base', name: 'Gold',    color: '#eab308', unlock: { level: 40 } },
  { id: 'base_crimson', slot: 'base', name: 'Crimson', color: '#dc2626', unlock: { level: 50 } },
  { id: 'base_cyan',    slot: 'base', name: 'Cyan',    color: '#06b6d4', unlock: { level: 60 } },
  { id: 'base_magenta', slot: 'base', name: 'Magenta', color: '#d946ef', unlock: { level: 72 } },
  { id: 'base_silver',  slot: 'base', name: 'Silver',  color: '#94a3b8', unlock: { level: 85 } },
  { id: 'base_holo',    slot: 'base', name: 'Holographic', gradient: true, unlock: { level: 100 } },

  // --- face / expression ---
  { id: 'face_happy',      slot: 'face', name: 'Happy',      unlock: { level: 1 } },
  { id: 'face_cool',       slot: 'face', name: 'Cool',       unlock: { level: 2 } },
  { id: 'face_wink',       slot: 'face', name: 'Wink',       unlock: { level: 4 } },
  { id: 'face_determined', slot: 'face', name: 'Determined', unlock: { level: 8 } },
  { id: 'face_grin',       slot: 'face', name: 'Big Grin',   unlock: { level: 20 } },
  { id: 'face_cyborg',     slot: 'face', name: 'Cyborg',     unlock: { level: 40 } },
  { id: 'face_zen',        slot: 'face', name: 'Zen',        unlock: { level: 60 } },
  { id: 'face_hearts',     slot: 'face', name: 'Heart Eyes', unlock: { level: 80 } },
  { id: 'face_cosmic',     slot: 'face', name: 'Cosmic',     unlock: { level: 100 } },
  { id: 'face_starry',     slot: 'face', name: 'Starry-Eyed', unlock: { badge: 'level_5' } },

  // --- outfit (a long ladder all the way to level 100) ---
  { id: 'outfit_tee',        slot: 'outfit', name: 'Gray Tee',     unlock: { level: 1 } },
  { id: 'outfit_tee_red',    slot: 'outfit', name: 'Red Tee',      unlock: { level: 2 } },
  { id: 'outfit_tee_green',  slot: 'outfit', name: 'Green Tee',    unlock: { level: 3 } },
  { id: 'outfit_tee_yellow', slot: 'outfit', name: 'Sunny Tee',    unlock: { level: 4 } },
  { id: 'outfit_hoodie',     slot: 'outfit', name: 'Hoodie',       unlock: { level: 5 } },
  { id: 'outfit_striped',    slot: 'outfit', name: 'Striped Tee',  unlock: { level: 7 } },
  { id: 'outfit_polo',       slot: 'outfit', name: 'Polo',         unlock: { level: 9 } },
  { id: 'outfit_blazer',     slot: 'outfit', name: 'Blazer',       unlock: { level: 12 } },
  { id: 'outfit_vneck',      slot: 'outfit', name: 'V-Neck',       unlock: { level: 15 } },
  { id: 'outfit_overalls',   slot: 'outfit', name: 'Overalls',     unlock: { level: 18 } },
  { id: 'outfit_flannel',    slot: 'outfit', name: 'Flannel',      unlock: { level: 22 } },
  { id: 'outfit_turtleneck', slot: 'outfit', name: 'Turtleneck',   unlock: { level: 28 } },
  { id: 'outfit_varsity',    slot: 'outfit', name: 'Varsity Jacket', unlock: { level: 35 } },
  { id: 'outfit_denim',      slot: 'outfit', name: 'Denim Jacket', unlock: { level: 45 } },
  { id: 'outfit_labcoat',    slot: 'outfit', name: 'Lab Coat',     unlock: { level: 55 } },
  { id: 'outfit_suit',       slot: 'outfit', name: 'Sharp Suit',   unlock: { level: 65 } },
  { id: 'outfit_puffer',     slot: 'outfit', name: 'Puffer Jacket', unlock: { level: 72 } },
  { id: 'outfit_tuxedo',     slot: 'outfit', name: 'Tuxedo',       unlock: { level: 85 } },
  { id: 'outfit_armor',      slot: 'outfit', name: 'Knight Armor', unlock: { level: 95 } },
  { id: 'outfit_spacesuit',  slot: 'outfit', name: 'Space Suit',   unlock: { level: 100 } },
  // badge-only outfits
  { id: 'outfit_cape',    slot: 'outfit', name: 'Hero Cape',   unlock: { badge: 'seven_day_streak' } },
  { id: 'outfit_hawaii',  slot: 'outfit', name: 'Aloha Shirt', unlock: { badge: 'ten_lessons' } },
  { id: 'outfit_wizard',  slot: 'outfit', name: 'Wizard Robe', unlock: { badge: 'level_5' } },

  // --- facial hair ---
  { id: 'beard_none',     slot: 'beard', name: 'None',       unlock: { level: 1 } },
  { id: 'beard_stubble',  slot: 'beard', name: 'Stubble',    unlock: { level: 1 } },
  { id: 'beard_mustache', slot: 'beard', name: 'Mustache',   unlock: { level: 6 } },
  { id: 'beard_goatee',   slot: 'beard', name: 'Goatee',     unlock: { level: 13 } },
  { id: 'beard_full',     slot: 'beard', name: 'Full Beard', unlock: { level: 24 } },
  { id: 'beard_long',     slot: 'beard', name: 'Long Beard', unlock: { level: 50 } },
  { id: 'beard_wizard',   slot: 'beard', name: 'Wizard Beard', unlock: { level: 90 } },

  // --- makeup (drawn under the face features so they still show) ---
  { id: 'makeup_none',     slot: 'makeup', name: 'None',       unlock: { level: 1 } },
  { id: 'makeup_blush',    slot: 'makeup', name: 'Blush',      unlock: { level: 1 } },
  { id: 'makeup_freckles', slot: 'makeup', name: 'Freckles',   unlock: { level: 4 } },
  { id: 'makeup_eyeshadow', slot: 'makeup', name: 'Eyeshadow', unlock: { level: 11 } },
  { id: 'makeup_glam',     slot: 'makeup', name: 'Glam Sparkle', unlock: { level: 26 } },
  { id: 'makeup_facepaint', slot: 'makeup', name: 'Star Paint', unlock: { level: 55 } },

  // --- earrings ---
  { id: 'ear_none',   slot: 'earrings', name: 'None',     unlock: { level: 1 } },
  { id: 'ear_studs',  slot: 'earrings', name: 'Studs',    unlock: { level: 3 } },
  { id: 'ear_hoops',  slot: 'earrings', name: 'Hoops',    unlock: { level: 10 } },
  { id: 'ear_drops',  slot: 'earrings', name: 'Gold Drops', unlock: { level: 20 } },
  { id: 'ear_gems',   slot: 'earrings', name: 'Gem Studs', unlock: { level: 40 } },
  { id: 'ear_stars',  slot: 'earrings', name: 'Star Dangles', unlock: { level: 70 } },

  // --- hat (headwear) ---
  { id: 'hat_none',    slot: 'hat', name: 'None',        unlock: { level: 1 } },
  { id: 'hat_cap',     slot: 'hat', name: 'Ball Cap',    unlock: { level: 5 } },
  { id: 'hat_bucket',  slot: 'hat', name: 'Bucket Hat',  unlock: { level: 14 } },
  { id: 'hat_beanie',  slot: 'hat', name: 'Beanie',      unlock: { level: 22 } },
  { id: 'hat_cowboy',  slot: 'hat', name: 'Cowboy Hat',  unlock: { level: 38 } },
  { id: 'hat_chef',    slot: 'hat', name: 'Chef Hat',    unlock: { level: 52 } },
  { id: 'hat_tophat',  slot: 'hat', name: 'Top Hat',     unlock: { level: 68 } },
  { id: 'hat_wizard',  slot: 'hat', name: 'Wizard Hat',  unlock: { level: 88 } },
  { id: 'hat_flowers', slot: 'hat', name: 'Flower Crown', unlock: { level: 75 } },
  { id: 'hat_party',   slot: 'hat', name: 'Party Hat',   unlock: { badge: 'first_quest' } },

  // --- gear (eyewear & head gear) ---
  { id: 'acc_none',       slot: 'accessory', name: 'None',       unlock: { level: 1 } },
  { id: 'acc_glasses',    slot: 'accessory', name: 'Glasses',    unlock: { level: 3 } },
  { id: 'acc_headphones', slot: 'accessory', name: 'Headphones', unlock: { level: 7 } },
  { id: 'acc_shades',     slot: 'accessory', name: 'Shades',     unlock: { level: 15 } },
  { id: 'acc_visor',      slot: 'accessory', name: 'AR Visor',   unlock: { level: 30 } },
  { id: 'acc_headset',    slot: 'accessory', name: 'Headset',    unlock: { level: 45 } },
  { id: 'acc_halo',       slot: 'accessory', name: 'Halo',       unlock: { level: 90 } },
  { id: 'acc_helmet',     slot: 'accessory', name: 'Space Helmet', unlock: { level: 100 } },

  // --- pet sidekick ---
  { id: 'pet_none',   slot: 'pet', name: 'None',          unlock: { level: 1 } },
  { id: 'pet_cat',    slot: 'pet', name: 'Robo-Cat',      unlock: { level: 9 } },
  { id: 'pet_bot',    slot: 'pet', name: 'Mini-Bot',      unlock: { level: 14 } },
  { id: 'pet_dragon', slot: 'pet', name: 'Pocket Dragon', unlock: { level: 20 } },
  { id: 'pet_owl',     slot: 'pet', name: 'Wise Owl',     unlock: { level: 32 } },
  { id: 'pet_penguin', slot: 'pet', name: 'Penguin Pal',  unlock: { level: 48 } },
  { id: 'pet_phoenix', slot: 'pet', name: 'Phoenix',      unlock: { level: 66 } },
  { id: 'pet_unicorn', slot: 'pet', name: 'Unicorn',      unlock: { level: 82 } },
  { id: 'pet_ufo',     slot: 'pet', name: 'Tiny UFO',     unlock: { level: 100 } },
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
  { id: 'bg_ocean',    slot: 'background', name: 'Ocean',    unlock: { level: 35 } },
  { id: 'bg_aurora',   slot: 'background', name: 'Aurora',   unlock: { level: 50 } },
  { id: 'bg_galaxy',   slot: 'background', name: 'Galaxy',   unlock: { level: 65 } },
  { id: 'bg_circuit',  slot: 'background', name: 'Circuit',  unlock: { level: 80 } },
  { id: 'bg_rainbow',  slot: 'background', name: 'Rainbow',  unlock: { level: 100 } },
  { id: 'bg_confetti', slot: 'background', name: 'Confetti', unlock: { badge: 'first_quest' } },
  { id: 'bg_streak',   slot: 'background', name: 'On Fire',  unlock: { badge: 'seven_day_streak' } },
];

export const DEFAULT_AVATAR = {
  base: 'skin_peach',
  face: 'face_happy',
  beard: 'beard_none',
  makeup: 'makeup_none',
  earrings: 'ear_none',
  outfit: 'outfit_tee',
  hat: 'hat_none',
  accessory: 'acc_none',
  pet: 'pet_none',
  background: 'bg_none',
};

// Hats used to live in the "accessory" slot; they now have their own slot.
// Relocate any old equip so existing avatars don't silently lose their hat.
const ACCESSORY_TO_HAT = {
  acc_tophat: 'hat_tophat',
  acc_flowers: 'hat_flowers',
  acc_party: 'hat_party',
  acc_beanie: 'hat_beanie',
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
// renderer always has every slot filled, and migrate hats out of the old
// accessory slot.
export function normalizeAvatar(avatar) {
  const merged = { ...DEFAULT_AVATAR, ...(avatar || {}) };
  const movedHat = ACCESSORY_TO_HAT[merged.accessory];
  if (movedHat) {
    if (!avatar?.hat || avatar.hat === 'hat_none') merged.hat = movedHat;
    merged.accessory = 'acc_none';
  }
  return merged;
}

// Count how many items a learner has unlocked (for the locker header / progress).
export function unlockedCount(ctx) {
  return AVATAR_ITEMS.filter((it) => isItemUnlocked(it, ctx)).length;
}
