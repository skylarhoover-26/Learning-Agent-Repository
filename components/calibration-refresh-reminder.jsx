'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, X } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import {
  getLastAssessmentAt,
  isImpactAssessmentSnoozed,
  snoozeImpactAssessment,
} from '@/lib/scoring-store';

// Non-blocking monthly nudge to re-grade the AI competencies. The first run is
// forced by CalibrationGate; this only appears AFTER calibration is done and it's
// been ~a month since the last grade, so scores stay current with how someone
// has grown. "Remind me later" snoozes for 3 days.
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default function CalibrationRefreshReminder() {
  const router = useRouter();
  const { profile } = useProfile();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only for already-calibrated users (the gate handles first-timers).
    if (!profile?.calibrated_at) return;
    // Base "due" on the last time impact was graded; fall back to first calibration.
    const last = getLastAssessmentAt() || profile.calibrated_at;
    const due = Date.now() - new Date(last).getTime() >= MONTH_MS;
    if (!due || isImpactAssessmentSnoozed()) return;
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, [profile]);

  if (!show) return null;

  function later() {
    snoozeImpactAssessment(3);
    setShow(false);
  }

  function start() {
    setShow(false);
    router.push('/calibration');
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
            Time to re-grade your AI competencies
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
            It&apos;s been about a month. Take a few minutes so your impact scores and lessons stay
            matched to how you&apos;ve grown.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={start}
              className="flex-1 px-4 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              Re-grade now
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
