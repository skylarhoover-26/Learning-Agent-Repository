// Resolve a stable, non-empty learner id for per-user progress (XP, badges,
// lessons). In SSO mode profile.id is the user's email. In demo mode the stored
// profile can have an empty id/email, which previously caused XP writes to be
// silently skipped and reads to return nothing — so fall back to a constant.
export function resolveLearnerId(profile) {
  return profile?.id || profile?.email || 'local-learner';
}
