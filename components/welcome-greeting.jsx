'use client';

import { useProfile } from '@/components/profile-provider';
import { displayNameFromProfile } from '@/lib/display-name';

// Renders the "Welcome back, {name}!" heading from the live profile context so
// it updates immediately when the user changes their name on /profile. Falls
// back to the server-rendered name (passed in) before the context hydrates.
export default function WelcomeGreeting({ fallbackName }) {
  const { profile } = useProfile();
  const name = profile ? displayNameFromProfile(profile) : (fallbackName || 'there');

  return (
    <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">
      Welcome back, {name}!
    </h2>
  );
}
