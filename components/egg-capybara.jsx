'use client';

import { useEffect } from 'react';
import Capybara from '@/components/capybara';
import { useProfile } from '@/components/profile-provider';
import { recordFind, absorbAnonFinds } from '@/lib/egg-finds';
import { isCollectionComplete } from '@/lib/easter-eggs';
import { resolveLearnerId } from '@/lib/learner-id';
import { awardCapybaraCollection } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';

// Every placed easter egg renders through this instead of <Capybara> directly,
// so "the learner saw this one" is recorded — and the collection completed — in
// exactly one place. Adding a placement stays one import and one element.
//
// aria-hidden by default: at every placement the surrounding copy already says
// what happened ("7 day streak", "No use cases match your filters"), so the
// capybara is decoration and announcing it just doubles the message. Pass
// `label` for the rare case where the capybara carries the meaning itself.
export default function EggCapybara({
  eggId,
  variant = 'idle',
  size = 72,
  className = '',
  label,
  ...rest
}) {
  // `|| {}` is load-bearing: useProfile() is useContext with a null default, so
  // destructuring it directly throws outside the provider. This component
  // renders on app/error.jsx — where the provider tree may be what broke — and a
  // throw there would put the error boundary itself into a crash loop.
  const { profile } = useProfile() || {};

  useEffect(() => {
    if (!eggId) return;

    const learnerId = profile ? resolveLearnerId(profile) : null;
    // Pull in anything found before identity resolved, so the last egg of the
    // set still completes the collection.
    if (learnerId) absorbAnonFinds(learnerId);

    const { added, finds } = recordFind(eggId, learnerId);
    // Only worth checking on a genuinely new find — re-seeing an egg is the
    // common case and can't complete anything.
    if (!added || !learnerId) return;

    if (isCollectionComplete(finds)) {
      try {
        // Idempotent in the ledger: awardCapybaraCollection returns null if the
        // learner already has the XP event, so re-completing awards nothing.
        const result = awardCapybaraCollection(learnerId);
        if (result) emitXp(result);
      } catch (error) {
        // The reward failing must never break the page the capybara sits on.
        console.error('Could not award the capybara collection:', error);
      }
    }
  }, [eggId, profile]);

  return (
    <Capybara
      variant={variant}
      size={size}
      className={className}
      title={label}
      aria-hidden={label ? undefined : 'true'}
      data-egg={eggId}
      {...rest}
    />
  );
}
