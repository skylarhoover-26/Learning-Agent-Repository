'use client';

// Client-side read of the assessment on/off switches.
//
// Four separate components need this (the gate, the tour, the impact prompt, and
// the admin page), and three of them mount on the same first paint. The fetch is
// cached at module scope so they share ONE request instead of firing four at the
// same route on every navigation.

import { useEffect, useState } from 'react';
import { ASSESSMENT_DEFAULTS, normalizeAssessmentConfig } from './assessment-config';

let cached = null;
let inFlight = null;

export function fetchAssessmentConfig() {
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;
  inFlight = fetch('/api/assessment-config')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      cached = normalizeAssessmentConfig(d);
      return cached;
    })
    .catch(() => ({ ...ASSESSMENT_DEFAULTS }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

// Call after an admin saves so the next read reflects the new switch positions.
export function clearAssessmentConfigCache() {
  cached = null;
  inFlight = null;
}

// Returns { config, loading }. `loading` matters: a component that gates on
// these switches must render NOTHING until the answer arrives, or a disabled
// assessment flashes on screen before it disappears.
//
// `enabled` exists because the gate is mounted in the root layout, so it also
// renders on /auth/signin — where the route 401s, since nobody is signed in yet.
// Pass false while there's no profile to keep that request out of the logs.
export function useAssessmentConfig({ enabled = true } = {}) {
  const [config, setConfig] = useState(cached);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    fetchAssessmentConfig().then((c) => { if (active) setConfig(c); });
    return () => { active = false; };
  }, [enabled]);

  return { config: config || ASSESSMENT_DEFAULTS, loading: !config };
}
