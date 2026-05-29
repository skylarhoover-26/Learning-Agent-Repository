'use client';

import Link from 'next/link';

const SKILLS = [
  { category: 'Foundations', name: 'AI Fundamentals', mastery: 82, freshness: 3 },
  { category: 'Foundations', name: 'Prompt Basics', mastery: 75, freshness: 8 },
  { category: 'Foundations', name: 'Customer Comms', mastery: 68, freshness: 45 },
  { category: 'Foundations', name: 'System Prompts', mastery: 30, freshness: 90 },
  { category: 'Application', name: 'Data Privacy', mastery: 55, freshness: 12 },
  { category: 'Application', name: 'Email Drafting', mastery: 88, freshness: 2 },
  { category: 'Application', name: 'Report Writing', mastery: 45, freshness: 30 },
  { category: 'Application', name: 'RAG & Grounding', mastery: 50, freshness: 120 },
  { category: 'Safety', name: 'Eval & Hallucinations', mastery: 60, freshness: 5 },
  { category: 'Safety', name: 'Bias & Fairness', mastery: 15, freshness: 180 },
  { category: 'Safety', name: 'AI Ethics', mastery: 35, freshness: 60 },
  { category: 'Safety', name: 'Compliance', mastery: 50, freshness: 25 },
  { category: 'Frontier', name: 'AI Agents', mastery: 10, freshness: 200 },
  { category: 'Frontier', name: 'Image & Voice', mastery: 25, freshness: 90 },
  { category: 'Frontier', name: 'Reasoning Models', mastery: 5, freshness: 300 },
  { category: 'Frontier', name: 'Multimodal', mastery: 8, freshness: 250 },
];

function getCellColor(mastery, freshness) {
  const fresh = freshness <= 14;
  const aging = freshness > 14 && freshness <= 60;
  const high = mastery >= 60;
  const mid = mastery >= 30;

  if (fresh) return high ? 'bg-blue-400' : mid ? 'bg-blue-200' : 'bg-blue-100';
  if (aging) return high ? 'bg-amber-400' : mid ? 'bg-amber-200' : 'bg-amber-100';
  return high ? 'bg-orange-500' : mid ? 'bg-orange-300' : 'bg-orange-200';
}

function findDoThisNowSkill() {
  const candidates = SKILLS
    .filter(s => s.mastery >= 40 && s.freshness > 60)
    .sort((a, b) => b.mastery - a.mastery || b.freshness - a.freshness);
  return candidates[0] || null;
}

export { SKILLS, findDoThisNowSkill };

export default function MiniHeatmap() {
  const doThisNow = findDoThisNowSkill();
  const categories = ['Foundations', 'Application', 'Safety', 'Frontier'];

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink">Knowledge Heatmap</h3>
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
              <p className="text-[11px] font-semibold text-ink leading-tight truncate">
                {skill.name}
              </p>
              <p className="text-[10px] text-ink/70 font-medium mt-0.5">
                {skill.mastery}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
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
