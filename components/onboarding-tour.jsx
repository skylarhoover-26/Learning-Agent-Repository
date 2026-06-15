'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { useTour } from '@/components/guided-tour-provider';

// FOR NOW: the welcome popup appears once per browser session on the dashboard.
// When Supabase lands, gate this on a per-user `tour_completed` profile flag so
// it only ever shows on someone's first visit.
const SESSION_KEY = 'la_tour_seen_session';

export default function OnboardingTour() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { startTour: startGuidedTour } = useTour();
  // 'hidden' = nothing to show, 'welcome' = prompt card, 'running' = driver active.
  const [phase, setPhase] = useState('hidden');

  // Show on the dashboard, once a profile exists (so it never fires
  // mid-onboarding), once per browser session.
  useEffect(() => {
    if (pathname !== '/' || !profile) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      seen = false;
    }
    if (!seen) setPhase('welcome');
  }, [pathname, profile]);

  function markSeen() {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // sessionStorage unavailable — no crash; it just may show again.
    }
  }

  function startTour() {
    markSeen();
    setPhase('hidden');
    startGuidedTour();
  }

  function skip() {
    markSeen();
    setPhase('hidden');
  }

  if (phase !== 'welcome') return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-br from-[#00205C] to-brand p-6 text-white relative">
          <button
            onClick={skip}
            className="absolute top-3 right-3 p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Welcome to AI Learning Coach</h2>
          <p className="text-white/80 text-sm mt-1 leading-relaxed">
            Take a quick 60-second tour to learn your way around — the menu, your lessons, and where to get help.
          </p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={skip}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={startTour}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
            >
              Take the tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
