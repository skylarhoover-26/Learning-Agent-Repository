'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Sparkles, X } from 'lucide-react';
import { useSidebar } from '@/components/sidebar';
import { useProfile } from '@/components/profile-provider';

// Bump the version suffix to re-show the tour to everyone after a redesign.
const STORAGE_KEY = 'la_app_tour_v1';

// Each step highlights a real element via its data-tour anchor. Order matches
// the natural reading flow: menu → what's inside → appearance → key tabs → help.
const STEPS = [
  {
    element: '[data-tour="menu-toggle"]',
    popover: {
      title: 'This is your menu',
      description: 'Tap here to open or close the navigation anytime.',
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Everything lives here',
      description: 'Your navigation is grouped into Account, Learn, and Your Progress.',
    },
  },
  {
    element: '[data-tour="dark-mode"]',
    popover: {
      title: 'Light or dark',
      description: 'Switch the app\'s appearance whenever you like.',
    },
  },
  {
    element: '[data-tour="nav-daily"]',
    popover: {
      title: 'Daily',
      description: 'A fresh, bite-sized AI lesson every day — the easiest way to build a habit.',
    },
  },
  {
    element: '[data-tour="nav-discover"]',
    popover: {
      title: 'Discover',
      description: 'Find AI for the real tasks you do at work, based on your role.',
    },
  },
  {
    element: '[data-tour="nav-chat"]',
    popover: {
      title: 'Just Chat',
      description: 'Ask anything about AI — it can even launch a lesson for you.',
    },
  },
  {
    element: '[data-tour="help"]',
    popover: {
      title: 'Need a hand?',
      description: 'Open this chat anytime for help with the platform.',
    },
  },
];

export default function OnboardingTour() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const { profile } = useProfile();
  // 'hidden' = nothing to show, 'welcome' = prompt card, 'running' = driver active.
  const [phase, setPhase] = useState('hidden');

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable — tour just won't persist; no crash.
    }
  }

  // First-run check: only on the dashboard, only once a profile exists (so it
  // never fires mid-onboarding), and only if they haven't seen it before.
  useEffect(() => {
    if (pathname !== '/' || !profile) return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      seen = false;
    }
    if (!seen) setPhase('welcome');
  }, [pathname, profile]);

  const startTour = useCallback(() => {
    setPhase('running');
    // The sidebar must be open for its anchors to be visible/highlightable.
    setOpen(true);
    // Let the sidebar finish its 200ms slide-in before driver measures elements.
    const timer = setTimeout(() => {
      const tour = driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        steps: STEPS,
        onDestroyed: () => {
          markSeen();
          setPhase('hidden');
        },
      });
      tour.drive();
    }, 260);
    return () => clearTimeout(timer);
  }, [setOpen]);

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
        <div className="p-4 flex items-center justify-end gap-3">
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
  );
}
