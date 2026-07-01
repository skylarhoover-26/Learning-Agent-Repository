'use client';

import { useState } from 'react';
import Avatar from '@/components/avatar';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { useChampions } from '@/components/champion-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import {
  AVATAR_SLOTS, SLOT_LABELS, itemsForSlot, isItemUnlocked,
  unlockLabel, normalizeAvatar, unlockedCount, accessoryList,
} from '@/lib/avatar-catalog';
import { Lock, Check, Loader2 } from 'lucide-react';

// The Crown is a single hat that auto-colors to your leaderboard rank. In the
// locker we surface all three tiers so people can see the designs and exactly
// what rank earns each — only the tier you currently hold is unlockable.
const CROWN_DISPLAY = [
  { tier: 1, name: 'Gold Crown', need: 'Reach #1' },
  { tier: 2, name: 'Silver Crown', need: 'Reach #2' },
  { tier: 3, name: 'Bronze Crown', need: 'Reach #3' },
];

// The avatar locker: pick a piece per slot. Unlocked items can be equipped (and
// toggled off — e.g. pet/accessory have a "None"); locked items show what earns
// them.
//
// Two modes:
//  - Default (profile mode): reads the avatar from the profile and saves each
//    change immediately so it follows you everywhere.
//  - Controlled mode (pass `value` + `onChange`, e.g. in onboarding before a
//    profile exists): the parent owns the avatar; we don't auto-save. Pass `ctx`
//    ({ level, badgeIds }) to control what's unlocked (onboarding = level 1).
export default function AvatarLocker({ value, onChange, ctx: ctxProp }) {
  const { profile, updateProfile } = useProfile();
  const prog = useProgression();
  const { crownTier } = useChampions();
  const controlled = value !== undefined && typeof onChange === 'function';

  const level = ctxProp?.level ?? (prog?.levelProgress?.level || 1);
  const badgeIds = ctxProp?.badgeIds ?? new Set((prog?.badgesEarned || []).map((b) => b.badge_id));
  // The learner's crown rank tier (0 none, 1 gold, 2 silver, 3 bronze). Any tier
  // unlocks the Crown hat and shows the crown in the preview at that rank's color.
  const myTier = ctxProp?.isChampion ? 1 : (profile ? crownTier(resolveLearnerId(profile)) : 0);
  const isChampion = myTier > 0;
  const ctx = { level, badgeIds, isChampion };

  const [internal, setInternal] = useState(() => normalizeAvatar(profile?.avatar));
  const [activeSlot, setActiveSlot] = useState('base');
  const [saving, setSaving] = useState(false);

  const avatar = controlled ? normalizeAvatar(value) : internal;

  async function equip(slot, id) {
    let next;
    if (slot === 'accessory') {
      // Gear is stackable — toggle items in/out; "None" clears everything.
      const cur = accessoryList(avatar.accessory);
      if (id === 'acc_none') next = { ...avatar, accessory: [] };
      else if (cur.includes(id)) next = { ...avatar, accessory: cur.filter((x) => x !== id) };
      else next = { ...avatar, accessory: [...cur, id] };
    } else {
      next = { ...avatar, [slot]: id };
    }
    if (controlled) {
      onChange(next);
      return;
    }
    setInternal(next);
    setSaving(true);
    try {
      await updateProfile({ avatar: next });
    } catch {
      // best-effort; the optimistic UI already reflects the choice
    } finally {
      setSaving(false);
    }
  }

  const items = itemsForSlot(activeSlot);
  const totalItems = AVATAR_SLOTS.reduce((n, s) => n + itemsForSlot(s).length, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-6">
      {/* Live preview */}
      <div className="flex sm:flex-col items-center gap-3">
        <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-100 to-cta-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
          <Avatar avatar={avatar} size={96} crown={myTier} />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {!controlled && (
            <span className="inline-flex items-center gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
              {saving ? 'Saving…' : 'Saved'}
            </span>
          )}
          <div className="mt-1">{unlockedCount(ctx)} / {totalItems} unlocked</div>
        </div>
      </div>

      <div>
        {/* Slot tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AVATAR_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className={`px-3 py-1.5 rounded-pill text-sm font-medium transition-all ${
                activeSlot === slot
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {SLOT_LABELS[slot]}
            </button>
          ))}
        </div>

        {/* Item grid. The single hat_crown item is expanded into its three rank
            tiers (gold/silver/bronze) so all crown designs + their rank show. */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.flatMap((item) => (item.id === 'hat_crown' ? CROWN_DISPLAY : [item])).map((entry) => {
            const isCrown = 'tier' in entry;
            const item = isCrown ? { id: 'hat_crown', slot: 'hat', name: entry.name } : entry;
            // Crown tiles unlock only for the exact rank you currently hold; other
            // items use the normal unlock rules.
            const unlocked = isCrown ? myTier === entry.tier : isItemUnlocked(item, ctx);
            const equipped = isCrown
              ? (avatar.hat === 'hat_crown' && myTier === entry.tier)
              : item.slot === 'accessory'
                ? (item.id === 'acc_none'
                    ? accessoryList(avatar.accessory).length === 0
                    : accessoryList(avatar.accessory).includes(item.id))
                : (avatar[item.slot] === item.id);
            const lockText = isCrown ? entry.need : unlockLabel(item);
            const key = isCrown ? `crown-${entry.tier}` : item.id;
            // For crown tiles, always preview the crown in that tier's color so the
            // design is visible even while locked.
            const previewCrown = isCrown ? entry.tier : (item.id === 'hat_crown' ? (myTier || 1) : myTier);
            const previewAvatar = isCrown ? { ...avatar, hat: 'hat_crown' } : { ...avatar, [item.slot]: item.id };
            return (
              <button
                key={key}
                onClick={() => unlocked && equip(item.slot, item.id)}
                disabled={!unlocked}
                title={unlocked ? item.name : `${item.name} — ${lockText}`}
                className={`relative rounded-xl border p-2 flex flex-col items-center gap-1 transition-all ${
                  equipped
                    ? 'border-brand ring-2 ring-brand bg-brand-50 dark:bg-slate-700'
                    : 'border-slate-200 dark:border-slate-600 hover:border-brand-300'
                } ${!unlocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  <Avatar avatar={previewAvatar} size={44} crown={previewCrown} />
                </div>
                <span className="text-[11px] text-center leading-tight text-ink dark:text-slate-300 line-clamp-1">
                  {item.name}
                </span>
                {!unlocked && (
                  <div className="absolute inset-0 rounded-xl bg-white/40 dark:bg-slate-900/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Lock className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 px-1 text-center leading-tight">
                        {lockText}
                      </span>
                    </div>
                  </div>
                )}
                {equipped && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {activeSlot === 'hat' && (
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            👑 The Crown is only yours while you&apos;re in the top 3 on the leaderboard — gold for #1, silver for #2, bronze for #3. It updates automatically as the rankings change.
          </p>
        )}
      </div>
    </div>
  );
}
