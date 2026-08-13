'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, X } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import {
  getLastAssessmentAt,
  isImpactAssessmentSnoozed,
  snoozeImpactAssessment,
  IMPACT_ASSESSMENT_INTERVAL_WEEKS,
} from '@/lib/scoring-store';
import { isFirstImpactPromptDue, impactAnchorAt } from '@/lib/impact-schedule';
import { useAssessmentConfig } from '@/lib/use-assessment-config';
import { impactActive } from '@/lib/assessment-config';

// The modal that brings people back for the AI Impact competencies. It covers two
// cases, which read very differently to the person seeing them:
//
//   'first'   Their deferred first assessment. The onboarding gate no longer runs
//             impact (feedback #207), so this is the first time they see it —
//             IMPACT_DELAY_DAYS after finishing the placement quiz.
//   'refresh' The recurring re-grade, once the full interval has passed.
//
// Either way "Remind me later" snoozes for 3 days. The home card
// (ImpactAssessmentCard) stays put through a snooze so the assessment is never
// lost — only this interruption is.
const INTERVAL_MS = IMPACT_ASSESSMENT_INTERVAL_WEEKS * 7 * 24 * 60 * 60 * 1000;

const COPY = {
  first: {
    title: 'Ready for the second half?',
    body: `You've had a few days on the platform. Now for the four AI Impact questions — four taps, nothing to write, and they're what you and your manager see for your AI competencies.`,
    cta: 'Start now',
  },
  refresh: {
    title: 'Time to re-grade your AI competencies',
    body: "It's been about a month. Take a few minutes so your impact scores and lessons stay matched to how you've grown.",
    cta: 'Re-grade now',
  },
};

export default function ImpactAssessmentPrompt() {
  const router = useRouter();
  const { profile } = useProfile();
  const { config, loading } = useAssessmentConfig();
  const [mode, setMode] = useState(null); // null | 'first' | 'refresh'
  // One switch stops BOTH cases below. Leaving the monthly re-grade running with
  // the assessment switched off would mean people getting pulled back to
  // re-take something that is no longer part of the platform.
  const active = !loading && impactActive(config);

  useEffect(() => {
    if (!active) return undefined;
    // Nobody is prompted before they've finished onboarding — the anchor is the
    // quiz when it runs, and onboarding when it doesn't.
    if (!impactAnchorAt(profile)) return undefined;

    // Deferred first-time impact assessment takes priority over the re-grade.
    if (isFirstImpactPromptDue(profile)) {
      const timer = setTimeout(() => setMode('first'), 800);
      return () => clearTimeout(timer);
    }

    const last = getLastAssessmentAt();
    // Nobody is due for a *re-grade* until they've been graded once. Without this
    // guard a never-assessed user falls through to the refresh copy the moment
    // IMPACT_DELAY_DAYS is snoozed away, which reads as nonsense.
    if (!last) return undefined;
    if (Date.now() - new Date(last).getTime() < INTERVAL_MS) return undefined;
    if (isImpactAssessmentSnoozed()) return undefined;

    const timer = setTimeout(() => setMode('refresh'), 800);
    return () => clearTimeout(timer);
  }, [profile, active]);

  if (!mode) return null;
  const copy = COPY[mode];

  function later() {
    snoozeImpactAssessment(3);
    setMode(null);
  }

  function start() {
    setMode(null);
    // 'first' runs the impact section on its own; a re-grade retakes everything.
    router.push(mode === 'first' ? '/calibration?part=impact' : '/calibration');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-brand" />
            </div>
            <button
              onClick={later}
              aria-label="Dismiss"
              className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-1">
            {copy.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            {copy.body}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={start}
              className="flex-1 px-4 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              {copy.cta}
            </button>
            <button
              onClick={later}
              className="px-4 py-2.5 rounded-pill text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
