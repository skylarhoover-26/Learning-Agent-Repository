'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useProgression } from '@/components/progression-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';

function findDoThisNow(skills) {
  const stale = skills
    .filter(s => s.hasActivity && s.freshness > 60 && s.mastery >= 40)
    .sort((a, b) => b.freshness - a.freshness);
  return stale[0] || null;
}

export default function LiveDoThisNow() {
  const prog = useProgression();

  if (!prog?.isLoaded) return null;

  const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
  const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;

  const skills = computeSkills({
    lessonHistory: prog.lessonHistory,
    moduleProgress,
    calibrationSkills,
  });

  const doThisNow = findDoThisNow(skills);

  if (!doThisNow) return null;

  return (
    <Link
      href={`/lesson?topic=${encodeURIComponent(doThisNow.name)}`}
      className="group block bg-gradient-to-br from-brand to-brand-700 rounded-2xl text-white shadow-card hover:shadow-card-hover transition-all overflow-hidden relative"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute right-20 top-20 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-4 w-48 h-48 rounded-full bg-white/5" />
      </div>
      <div className="relative p-7">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-3">
          DO THIS NOW &middot; 6 min &middot; adaptive
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-1.5 leading-tight tracking-tight">
          Refresh your {doThisNow.name} — it&apos;s high-mastery but {doThisNow.freshness} days stale.
        </h3>
        <p className="text-white/80 text-sm mb-5 max-w-2xl">
          Picked from your heatmap: this is your highest-value gap.
        </p>
        <span className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-ink font-semibold rounded-pill shadow-sm group-hover:bg-cta-600 transition-all">
          Start refresher
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
