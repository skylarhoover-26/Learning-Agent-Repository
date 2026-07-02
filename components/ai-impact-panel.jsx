'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImpactDetail, getScores } from '@/lib/scoring-store';
import { ImpactResults } from '@/components/assessment-steps';
import { Crosshair, RotateCcw } from 'lucide-react';

// "My Impact" is a read-only view of the AI-impact competency scores produced by
// the unified assessment (calibration + impact merged). Shows self vs measured
// and the "why" per competency. Taking/refreshing happens in one place — the
// calibration flow.
export default function AiImpactPanel() {
  const [detail, setDetail] = useState(undefined); // undefined = loading

  useEffect(() => {
    const d = getImpactDetail();
    if (d) { setDetail(d); return; }
    // Back-compat: older results stored only the flat measured scores.
    const scores = getScores();
    if (scores) {
      setDetail(Object.fromEntries(
        ['personal', 'team', 'org', 'development'].map(k => [k, { measured: scores[k] || 0 }]),
      ));
    } else {
      setDetail(null);
    }
  }, []);

  if (detail === undefined) return null;

  if (detail) {
    return (
      <div>
        <ImpactResults detail={detail} />
        <div className="flex justify-center mt-6">
          <Link
            href="/calibration"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Refresh in calibration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
        <Crosshair className="w-6 h-6 text-brand" />
      </div>
      <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">No impact scores yet</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        Your AI impact is measured as part of calibration. Take it once and your Personal, Team,
        Org, and AI Development scores show up here — with the &ldquo;why&rdquo; behind each.
      </p>
      <Link
        href="/calibration"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
      >
        Go to calibration
      </Link>
    </div>
  );
}
