'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import EggCapybara from '@/components/egg-capybara';

// The hidden one: click the AILC emblem five times quickly and a capybara
// drifts across the bottom of the screen with a boba, then leaves.
// See lib/easter-eggs.js: emblem-click.
//
// All the state lives here rather than in cinematic-shell.jsx on purpose. That
// shell is mounted permanently on every route, and it has broken production
// before (the React #185 incident), so it gets one hook call and one element
// instead of a counter, three refs and a timer. Nothing here sets state during
// render — only from a click handler and a timeout — so it cannot loop.
//
// Navigation is deliberately NOT prevented: the emblem's job is "go home", and
// an easter egg must not take a working control away. Clicks two through five
// land on / when you're already there, which is a no-op.

const CLICKS_NEEDED = 5;
// Clicks more than this far apart start a fresh count, so the egg needs
// deliberate rapid clicking and can't accumulate over a whole session.
const CLICK_WINDOW_MS = 1200;
const DRIFT_MS = 5200;

export function useCapybaraDrift() {
  const [drifting, setDrifting] = useState(false);
  const clicks = useRef(0);
  const lastClick = useRef(0);
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onEmblemClick = useCallback(() => {
    const now = Date.now();
    clicks.current = now - lastClick.current > CLICK_WINDOW_MS ? 1 : clicks.current + 1;
    lastClick.current = now;

    if (clicks.current >= CLICKS_NEEDED) {
      clicks.current = 0;
      setDrifting((already) => {
        if (already) return already;
        timer.current = setTimeout(() => setDrifting(false), DRIFT_MS);
        return true;
      });
    }
  }, []);

  return { onEmblemClick, drifting };
}

export default function CapybaraDrift() {
  return (
    <div className="capy-drift fixed bottom-3 left-0 z-40 pointer-events-none">
      <EggCapybara eggId="emblem-click" variant="boba" size={86} />
    </div>
  );
}
