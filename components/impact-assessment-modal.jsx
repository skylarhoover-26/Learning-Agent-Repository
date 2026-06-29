'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, X } from 'lucide-react';
import {
  isImpactAssessmentDue,
  isImpactAssessmentSnoozed,
  snoozeImpactAssessment,
  getLastAssessmentAt,
} from '@/lib/scoring-store';

/**
 * Shown on the dashboard a moment after load when the AI Impact Assessment is
 * due (never taken, or >= 6 weeks since the last one) and not snoozed.
 * "Remind me later" snoozes for 3 days so it doesn't nag on every visit.
 */
export default function ImpactAssessmentModal() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isImpactAssessmentDue() && !isImpactAssessmentSnoozed()) {
        setFirstTime(!getLastAssessmentAt());
        setShow(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  function later() {
    snoozeImpactAssessment(3);
    setShow(false);
  }

  function start() {
    setShow(false);
    router.push('/growth?tab=impact');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-brand" />
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
            {firstTime ? 'Set your AI impact baseline' : 'Time for your AI impact check-in'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            {firstTime
              ? 'Take a quick 4-question assessment so we can track how AI is changing your work over time.'
              : "It's been about 6 weeks. Take a quick 4-question pulse to see how your AI impact has grown."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={start}
              className="flex-1 px-4 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              Start assessment
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
