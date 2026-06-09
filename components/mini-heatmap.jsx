'use client';

import Link from 'next/link';
import { useProgression } from '@/components/progression-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';

function getCellColor(mastery, freshness, hasActivity) {
  if (!hasActivity) return 'bg-slate-200/70 dark:bg-slate-700/60 dark:border dark:border-slate-600/50';
  const fresh = freshness >= 0 && freshness <= 14;
  const aging = freshness > 14 && freshness <= 60;
  const high = mastery >= 60;
  const mid = mastery >= 30;

  if (fresh) return high ? 'bg-blue-400 dark:bg-blue-500/80' : mid ? 'bg-blue-200 dark:bg-blue-600/50' : 'bg-blue-100 dark:bg-blue-700/40';
  if (aging) return high ? 'bg-amber-400 dark:bg-amber-500/80' : mid ? 'bg-amber-200 dark:bg-amber-600/50' : 'bg-amber-100 dark:bg-amber-700/40';
  return high ? 'bg-orange-500 dark:bg-orange-500/80' : mid ? 'bg-orange-300 dark:bg-orange-600/50' : 'bg-orange-200 dark:bg-orange-700/40';
}

function findDoThisNow(skills) {
  const stale = skills
    .filter(s => s.hasActivity && s.freshness > 60 && s.mastery >= 40)
    .sort((a, b) => b.freshness - a.freshness);
  return stale[0] || null;
}

export default function MiniHeatmap() {
  const prog = useProgression();

  const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
  const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;

  const skills = computeSkills({
    lessonHistory: prog?.lessonHistory || [],
    moduleProgress,
    calibrationSkills,
  });

  const doThisNow = findDoThisNow(skills);
  const hasAnyActivity = skills.some(s => s.hasActivity);
  const categories = ['Foundations', 'Application', 'Safety', 'Frontier'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink dark:text-slate-200">Knowledge Heatmap</h3>
        <Link
          href="/heatmap"
          className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
        >
          View full map &rarr;
        </Link>
      </div>

      <div className="hidden sm:grid grid-cols-4 gap-2 mb-2">
        {categories.map(cat => (
          <p
            key={cat}
            className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center"
          >
            {cat}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {skills.map(skill => {
          const isPulse = doThisNow && skill.name === doThisNow.name;
          return (
            <div
              key={skill.name}
              className={`relative rounded-lg p-2.5 text-center transition-all ${getCellColor(skill.mastery, skill.freshness, skill.hasActivity)} ${
                isPulse ? 'animate-heatmap-pulse ring-2 ring-brand/40' : ''
              } ${!skill.hasActivity ? 'opacity-70 dark:opacity-80' : ''}`}
              title={skill.hasActivity
                ? `${skill.name}: ${skill.mastery}% mastery, ${skill.freshness}d since last study`
                : `${skill.name}: No activity yet`
              }
            >
              <p className="text-[11px] font-semibold text-ink dark:text-slate-200 leading-tight truncate">
                {skill.name}
              </p>
              <p className="text-[10px] text-ink/70 dark:text-slate-400 font-medium mt-0.5">
                {skill.hasActivity ? `${skill.mastery}%` : '—'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500 dark:text-slate-400">
        {hasAnyActivity ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-300 inline-block" />
              <span>Fresh (&lt;14d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-300 inline-block" />
              <span>Aging (14-60d)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-400 inline-block" />
              <span>Stale (60d+)</span>
            </div>
          </>
        ) : (
          <span>Complete lessons to start tracking your knowledge</span>
        )}
      </div>
    </div>
  );
}
