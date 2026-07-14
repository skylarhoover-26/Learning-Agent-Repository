'use client';

import { useState, useEffect, useCallback } from 'react';
import { Crosshair, RotateCcw, Clock } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CalibrationFlow from '@/components/calibration-flow';
import { SkillResults, ImpactResults } from '@/components/assessment-steps';
import { useProfile } from '@/components/profile-provider';
import { getCalibrationData, getCalibrationHistory } from '@/lib/calibration-store';
import { getImpactDetail, getOverallLevel } from '@/lib/scoring-store';

// "My Calibration": if you've calibrated before, land on a summary of your latest
// scores + a timeline of past runs, with a Recalibrate button. First-timers (and
// the required gate) just run the flow. Finishing here returns to the summary so
// you can compare new vs old.
//
// Wrapped in CinematicFrame (staging reskin) so it adopts the cinematic top bar +
// drawer while keeping prod's calibration logic intact.
export default function CalibrationPage() {
  return <CinematicFrame><CalibrationPageInner /></CinematicFrame>;
}

function CalibrationPageInner() {
  const { profile, updateProfile } = useProfile();
  const [mode, setMode] = useState('loading'); // 'loading' | 'view' | 'run'
  const [latest, setLatest] = useState(null);   // { skills, selfRating, impact }
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    const cal = getCalibrationData();
    const impact = getImpactDetail();
    const hist = getCalibrationHistory();
    setHistory(hist);
    if (cal?.skills) {
      setLatest({ skills: cal.skills, selfRating: cal.selfRating || {}, impact });
      return true;
    }
    setLatest(null);
    return false;
  }, []);

  useEffect(() => {
    const hasPrior = load();
    setMode(hasPrior ? 'view' : 'run');
  }, [load]);

  function handleComplete() {
    if (profile) updateProfile({ calibrated_at: new Date().toISOString() }).catch(() => {});
    load();
    setMode('view');
  }

  // Previous run's measured impact scores, for the "vs last" deltas.
  const previousScores = (() => {
    if (history.length < 2) return null;
    const prev = history[history.length - 2]?.impact;
    if (!prev) return null;
    return Object.fromEntries(
      ['personal', 'team', 'org', 'development'].map(k => [k, prev[k]?.measured ?? null]),
    );
  })();

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Crosshair}
        title="My Calibration"
        subtitle="Where you are with AI, and how it's changing over time"
      />

      {mode === 'run' && (
        <CalibrationFlow homeOnFinish={false} onComplete={handleComplete} />
      )}

      {mode === 'view' && latest && (
        <main className="max-w-2xl mx-auto px-6 pt-6 pb-10 space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setMode('run')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Recalibrate
            </button>
          </div>

          <SkillResults skills={latest.skills} selfRating={latest.selfRating} />

          {latest.impact && <ImpactResults detail={latest.impact} previousScores={previousScores} />}

          {history.length > 0 && <Timeline history={history} />}
        </main>
      )}

      {mode === 'view' && !latest && (
        <main className="max-w-2xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">
          No calibration yet. <button className="text-brand font-semibold" onClick={() => setMode('run')}>Start now</button>.
        </main>
      )}
    </div>
  );
}

function Timeline({ history }) {
  const runs = [...history].reverse(); // most recent first
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
      <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" /> Your calibration history
      </h3>
      <ul className="space-y-2">
        {runs.map((run, i) => {
          const measured = Object.fromEntries(
            ['personal', 'team', 'org', 'development'].map(k => [k, run.impact?.[k]?.measured || 0]),
          );
          const overall = getOverallLevel(measured);
          const date = run.completed_at ? new Date(run.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
          return (
            <li key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-ink dark:text-slate-200">
                {date}{i === 0 && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand">Latest</span>}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-pill ${overall.color}`}>{overall.level} Impact</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
