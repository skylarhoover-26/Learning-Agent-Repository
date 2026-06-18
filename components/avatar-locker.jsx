'use client';

import { useState } from 'react';
import Avatar from '@/components/avatar';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import {
  AVATAR_SLOTS, SLOT_LABELS, itemsForSlot, isItemUnlocked,
  unlockLabel, normalizeAvatar, unlockedCount,
} from '@/lib/avatar-catalog';
import { Lock, Check, Loader2 } from 'lucide-react';

// The avatar locker: pick a piece per slot. Unlocked items can be equipped (and
// toggled off — e.g. pet/accessory have a "None"); locked items show what earns
// them. Changes save to the profile immediately so the avatar follows you
// everywhere.
export default function AvatarLocker() {
  const { profile, updateProfile } = useProfile();
  const prog = useProgression();
  const level = prog?.levelProgress?.level || 1;
  const badgeIds = new Set((prog?.badgesEarned || []).map((b) => b.badge_id));
  const ctx = { level, badgeIds };

  const [avatar, setAvatar] = useState(() => normalizeAvatar(profile?.avatar));
  const [activeSlot, setActiveSlot] = useState('base');
  const [saving, setSaving] = useState(false);

  async function equip(slot, id) {
    const next = { ...avatar, [slot]: id };
    setAvatar(next);
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
          <Avatar avatar={avatar} size={96} />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          <span className="inline-flex items-center gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
            {saving ? 'Saving…' : 'Saved'}
          </span>
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

        {/* Item grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((item) => {
            const unlocked = isItemUnlocked(item, ctx);
            const equipped = avatar[item.slot] === item.id;
            return (
              <button
                key={item.id}
                onClick={() => unlocked && equip(item.slot, item.id)}
                disabled={!unlocked}
                title={unlocked ? item.name : `${item.name} — ${unlockLabel(item)}`}
                className={`relative rounded-xl border p-2 flex flex-col items-center gap-1 transition-all ${
                  equipped
                    ? 'border-brand ring-2 ring-brand bg-brand-50 dark:bg-slate-700'
                    : 'border-slate-200 dark:border-slate-600 hover:border-brand-300'
                } ${!unlocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {/* preview the full avatar with just this slot swapped in */}
                  <Avatar avatar={{ ...avatar, [item.slot]: item.id }} size={44} />
                </div>
                <span className="text-[11px] text-center leading-tight text-ink dark:text-slate-300 line-clamp-1">
                  {item.name}
                </span>
                {!unlocked && (
                  <div className="absolute inset-0 rounded-xl bg-white/40 dark:bg-slate-900/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Lock className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 px-1 text-center leading-tight">
                        {unlockLabel(item)}
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
      </div>
    </div>
  );
}
