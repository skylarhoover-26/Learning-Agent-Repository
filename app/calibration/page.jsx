'use client';

import { Crosshair } from 'lucide-react';
import PageHeader from '@/components/page-header';
import CalibrationFlow from '@/components/calibration-flow';
import { useProfile } from '@/components/profile-provider';

// Voluntary (re)take of the unified assessment, reached from the profile menu as
// "My Calibration". The required first-time version is CalibrationGate, which
// renders the same flow full-screen. Finishing here refreshes `calibrated_at` so
// the 6-week refresh reminder resets.
export default function CalibrationPage() {
  const { profile, updateProfile } = useProfile();

  function handleComplete() {
    if (profile) updateProfile({ calibrated_at: new Date().toISOString() }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Crosshair}
        title="My Calibration"
        subtitle="A few scenarios, then rate yourself — we tune your lessons to the gap"
      />
      <CalibrationFlow onComplete={handleComplete} />
    </div>
  );
}
