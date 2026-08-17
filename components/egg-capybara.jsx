'use client';

import { useCallback, useEffect, useState } from 'react';
import Capybara from '@/components/capybara';
import { useProfile } from '@/components/profile-provider';
import { FINDABLE_EGG_IDS } from '@/lib/easter-eggs';
import { hasFound } from '@/lib/egg-finds';
import { resolveLearnerId } from '@/lib/learner-id';
import { onCapyFind } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';

// Every placed easter egg renders through this, so "collect it" lives in exactly
// one place. Adding a placement stays one import and one element.
//
// Seeing a capybara does NOT collect it — you have to click. That makes the hunt
// something you do rather than something that happens to you, and it means the
// count can't be inflated by a page that happens to render an egg in a corner.
//
// Which forces an accessibility change: an uncollected capybara is a real
// control, so it's a <button> with a label and keyboard focus, not the decorative
// aria-hidden graphic this used to be. Once collected there's nothing left to do,
// so it drops back to a plain graphic.
export default function EggCapybara({
  eggId,
  variant = 'idle',
  size = 72,
  className = '',
  onCollect,
  ...rest
}) {
  // `|| {}` is load-bearing: useProfile() is useContext with a null default, so
  // destructuring it directly throws outside the provider. This renders on
  // app/error.jsx — where the provider tree may be what broke — and a throw there
  // would put the error boundary into a crash loop.
  const { profile } = useProfile() || {};
  const learnerId = profile ? resolveLearnerId(profile) : null;

  // A decorative egg is not clickable at all.
  //
  // Some placements are deliberately out of the collection — an admin-only
  // surface, or a spot only one person can occupy (`collectable: false` in
  // lib/easter-eggs.js). Without this check they still rendered as a pulsing
  // button that paid 5 XP and reported "Capybara collected · 1 of 12", while the
  // progress panel — which counts only roster eggs — stayed at 0 of 12. So it
  // looked collectable, paid out, and advanced nothing. It also handed admins XP
  // that nobody else could reach.
  const isCollectable = FINDABLE_EGG_IDS.includes(eggId);

  // Resolved after mount: the ledger read touches localStorage, and branching on
  // it during render would hydrate to a different tree.
  const [collected, setCollected] = useState(true);
  useEffect(() => {
    setCollected(eggId ? hasFound(eggId, learnerId) : true);
  }, [eggId, learnerId]);

  const collect = useCallback((e) => {
    // Some placements sit inside a card that is itself a link (Today's Pick, the
    // Achievements badge). Collecting must not also navigate.
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!eggId || !learnerId || collected) return;
    try {
      const result = onCapyFind(learnerId, eggId, FINDABLE_EGG_IDS);
      // Null means the ledger already had it — treat as collected either way, so
      // the pulse stops and the button stops offering something that pays nothing.
      setCollected(true);
      if (result) emitXp(result);
      onCollect?.(result);
    } catch (error) {
      // A failed collect must never break the surface the capybara sits on.
      console.error('Could not collect the capybara:', error);
      setCollected(true);
    }
  }, [eggId, learnerId, collected, onCollect]);

  const art = <Capybara variant={variant} size={size} data-egg={eggId} />;

  // Nothing to collect: decorative, no learner resolved, no id, or already got it.
  if (!eggId || !isCollectable || !learnerId || collected) {
    return (
      <span className={className} aria-hidden="true">
        {art}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={collect}
      // pointer-events-auto defeats any pointer-events-none a placement put on
      // this element back when the capybara was purely decorative.
      className={`capy-collectable pointer-events-auto ${className}`}
      aria-label="Collect this hidden capybara"
      title="Click to collect"
      {...rest}
    >
      {art}
    </button>
  );
}
