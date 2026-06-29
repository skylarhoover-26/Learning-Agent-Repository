'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { TrendingUp, Target, BarChart3, RefreshCw } from 'lucide-react';
import GoalsPanel from '@/components/growth/goals-panel';
import AiImpactPanel from '@/components/growth/ai-impact-panel';
import CheckinPanel from '@/components/growth/checkin-panel';

// "My Growth" — one home for the three progress tools that used to be separate
// menu items (Goals, AI Impact self-assessment, and the periodic Check-in). A
// tab switcher keeps them distinct without three near-duplicate entries.
const TABS = [
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'impact', label: 'AI Impact', icon: BarChart3 },
  { key: 'checkin', label: 'Check-in', icon: RefreshCw },
];
const VALID = new Set(TABS.map(t => t.key));

export default function MyGrowthPage() {
  const [tab, setTab] = useState('goals');

  // Honor a ?tab= deep link (old /scoring, /checkin, /goals redirect here with
  // one). Read from the URL on mount so we don't need a Suspense boundary.
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t && VALID.has(t)) setTab(t);
    } catch { /* default to goals */ }
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader icon={TrendingUp} title="My Growth" subtitle="Your goals, AI impact, and progress check-ins" />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-brand text-brand'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-slate-200'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'goals' && <GoalsPanel />}
        {tab === 'impact' && <AiImpactPanel />}
        {tab === 'checkin' && <CheckinPanel onGoToImpact={() => setTab('impact')} />}
      </main>
    </div>
  );
}
