'use client';

import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Hides its children for users who can't access `href` (a regular user, or an
// admin previewing as one). Used to drop home-page elements — a "View full
// leaderboard" link, the Today's Pick block — when their destination is turned
// off, so the home page matches what a regular user actually sees. Until the
// config loads we render children to avoid a flash of disappearing content.
export default function GatedHomeSection({ href, children }) {
  const { loaded, isItemDisabled } = useMenuVisibility();
  if (loaded && isItemDisabled(href)) return null;
  return children;
}
