'use client';

import { useLayoutEffect } from 'react';
import { useHeaderContext } from '@/components/header-context';

// `iconButton` lets a page swap the static icon for an interactive client
// button (e.g. the Tour's play button). When omitted, the icon is decorative.
// `actions` renders optional controls in the right cluster, just before the
// user menu (e.g. a "Clear chat" button).
//
// This doesn't render a <header> itself — it registers its content with the
// shared bar in the root layout (see header-bar.jsx) so the bar stays mounted
// across navigation instead of being torn down and rebuilt on every page,
// which used to cause it to flash between pages.
export default function PageHeader({ icon, title, subtitle, iconButton, actions }) {
  const ctx = useHeaderContext();

  // Re-sync on every render so prop changes (e.g. a page swapping `actions`)
  // show up immediately.
  useLayoutEffect(() => {
    ctx?.setHeader({ icon, title, subtitle, iconButton, actions });
  });

  // Clear only when this instance actually unmounts — not on every re-render —
  // so navigating straight to another page with its own <PageHeader> never
  // has to paint a blank bar in between.
  useLayoutEffect(() => {
    return () => ctx?.setHeader(null);
  }, [ctx]);

  return null;
}
