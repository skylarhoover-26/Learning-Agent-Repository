'use client';

import { useLayoutEffect } from 'react';
import { useHeaderContext } from '@/components/header-context';
import { useInCinematicFrame } from '@/components/cinematic/cinematic-shell';

// `iconButton` lets a page swap the static icon for an interactive client
// button (e.g. the Tour's play button). When omitted, the icon is decorative.
// `actions` renders optional controls in the right cluster, just before the
// user menu (e.g. a "Clear chat" button).
//
// This doesn't render a <header> itself — it registers its content with the
// shared bar in the root layout (see header-bar.jsx) so the bar stays mounted
// across navigation instead of being torn down and rebuilt on every page,
// which used to cause it to flash between pages.
//
// Inside a cinematic frame (CinematicShell/CinematicFrame) the cinematic TopNav
// already owns the chrome, so we skip registering with the shared HeaderBar —
// otherwise prod's dark bar would paint on top of the cinematic top bar. The
// `.cine-frame .js-topbar` CSS rule can't hide HeaderBar because it renders in
// the root layout, outside the frame; gating registration here is what prevents
// the double bar.
export default function PageHeader({ icon, title, subtitle, iconButton, actions }) {
  const inCinematicFrame = useInCinematicFrame();
  const ctx = useHeaderContext();
  // `setHeader` (a useState setter) has a stable identity for the lifetime of
  // the provider — unlike `ctx` itself, which is a new object whenever the
  // provider re-renders. Depending on `ctx` here previously retriggered these
  // effects on every one of the provider's own re-renders, which this effect
  // itself was causing — an infinite loop.
  const setHeader = ctx?.setHeader;

  // Re-sync only when the actual content changes, so prop changes (e.g. a
  // page swapping `actions`) show up immediately without looping.
  useLayoutEffect(() => {
    if (inCinematicFrame) return;
    setHeader?.({ icon, title, subtitle, iconButton, actions });
  }, [inCinematicFrame, setHeader, icon, title, subtitle, iconButton, actions]);

  // Clear only when this instance actually unmounts — not on every re-render —
  // so navigating straight to another page with its own <PageHeader> never
  // has to paint a blank bar in between.
  useLayoutEffect(() => {
    if (inCinematicFrame) return;
    return () => setHeader?.(null);
  }, [inCinematicFrame, setHeader]);

  return null;
}
