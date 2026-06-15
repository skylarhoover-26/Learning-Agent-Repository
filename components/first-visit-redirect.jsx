'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// FOR NOW: every time someone opens the app and lands on the dashboard, send
// them to the Tour first — once per browser session, so navigating back to the
// dashboard within the same session doesn't bounce them again. When Supabase
// lands, swap this for a per-user `tour_completed` flag (show only first time).
const SESSION_KEY = 'la_routed_to_tour';

export default function FirstVisitRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, '1');
        router.replace('/tour');
      }
    } catch {
      // sessionStorage unavailable — just stay on the dashboard.
    }
  }, [router]);

  return null;
}
