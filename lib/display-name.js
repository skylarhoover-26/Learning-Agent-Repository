// Client- and server-safe name helpers (no imports, so safe to use anywhere).
// Used so the header, greeting, and anywhere else show the SAME name even when
// a user has no saved display name (e.g. soft-login testers pre-Okta).

// "mathew.hoover@housecallpro.com" -> "Mathew Hoover"
export function nameFromEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const local = (email.split('@')[0] || '').trim();
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}

// The display name to show for a profile, with consistent fallbacks.
export function displayNameFromProfile(profile) {
  if (!profile) return 'Learner';
  return (
    profile.display_name ||
    profile.name ||
    profile.slack_handle ||
    nameFromEmail(profile.email) ||
    'Learner'
  );
}
