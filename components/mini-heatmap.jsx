'use client';

import Link from 'next/link';
import { SKILLS, findDoThisNowSkill } from '@/lib/heatmap-data';

export { SKILLS, findDoThisNowSkill };

function getCellColor(mastery, freshness) {
  const fresh = freshness <= 14;
  const aging = freshness > 14 && freshness <= 60;
  const high = mastery >= 60;
  const mid = mastery >= 30;

  if (fresh) return high ? 'bg-blue-400' : mid ? 'bg-blue-200' : 'bg-blue-100';
  if (aging) return high ? 'bg-amber-400' : mid ? 'bg-amber-200' : 'bg-amber-100';
  return high ? 'bg-orange-500' : mid ? 'bg-orange-300' : 'bg-orange-200';
}

export default function MiniHeatmap() {
  const doThisNow = findDoThisNowSkill();
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

      {/* Category labels */}
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

      {/* 4x4 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SKILLS.map(skill => {
          const isPulse = doThisNow && skill.name === doThisNow.name;
          return (
            <div
              key={skill.name}
              className={`relative rounded-lg p-2.5 text-center transition-all ${getCellColor(skill.mastery, skill.freshness)} ${
                isPulse ? 'animate-heatmap-pulse ring-2 ring-brand/40' : ''
              }`}
              title={`${skill.name}: ${skill.mastery}% mastery, ${skill.freshness}d since last study`}
            >
              <p className="text-[11px] font-semibold text-ink dark:text-slate-200 leading-tight truncate">
                {skill.name}
              </p>
              <p className="text-[10px] text-ink/70 dark:text-slate-300/70 font-medium mt-0.5">
                {skill.mastery}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500 dark:text-slate-400">
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
      </div>
    </div>
  );
}
