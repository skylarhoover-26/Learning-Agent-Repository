'use client';

import { useEffect } from 'react';
import Capybara from '@/components/capybara';
import { recordFind } from '@/lib/egg-finds';

// Every placed easter egg renders through this instead of <Capybara> directly,
// so "the learner saw this one" is recorded in exactly one place. Adding a
// placement is one import and one element; the collection mechanic then reads
// lib/egg-finds without touching any placement site again.
//
// aria-hidden by default: at every placement the surrounding copy already says
// what happened ("7 day streak", "No use cases match your filters"), so the
// capybara is decoration and announcing it just doubles the message. Pass
// `label` for the rare case where the capybara is the only thing carrying
// meaning.
export default function EggCapybara({
  eggId,
  variant = 'idle',
  size = 72,
  className = '',
  label,
  ...rest
}) {
  useEffect(() => {
    if (eggId) recordFind(eggId);
  }, [eggId]);

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
