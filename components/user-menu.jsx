'use client';

import { useProfile } from '@/components/profile-provider';
import { displayNameFromProfile } from '@/lib/display-name';

// Top-right identity display. Navigation, admin, and account actions all live in
// the sidebar now, so this is just the name + avatar (no dropdown).
export default function UserMenu() {
  const { profile } = useProfile();
  const displayName = displayNameFromProfile(profile);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 text-sm text-white/90">
      <span className="hidden sm:inline">{displayName}</span>
      <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm">
        {initial}
      </div>
    </div>
  );
}
