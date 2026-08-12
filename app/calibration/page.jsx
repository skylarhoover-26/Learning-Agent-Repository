'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Crosshair, RotateCcw, Clock, TrendingUp } from 'lucide-react';
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
// The Suspense boundary is required, not decorative: useSearchParams() below
// suspends during prerender, and without it this statically-generated page would
// bail out of prerendering entirely.
export default function CalibrationPage() {
  return (
    <CinematicFrame>
      <Suspense fallback={<CalibrationLoading />}>
        <CalibrationPageInner />
      </Suspense>
    </CinematicFrame>
  );
}

function CalibrationLoading() {
  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Crosshair}
        title="My Calibration"
        subtitle="Where you are with AI, and how it's changing over time"
      />
      <main className="max-w-2xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">
        Loading…
      </main>
    </div>
  );
}

function CalibrationPageInner() {
  const { profile, updateProfile } = useProfile();
  const searchParams = useSearchParams();
  const router = useRouter();
  // ?part scopes which half runs, so nobody has to sit through the other one:
  //
  //   impact  the AI Impact questions alone — where the deferred day-3 prompt and
  //           the home card point, so finishing your placement quiz days ago
  //           doesn't mean retaking it to get competency scores.
  //   skills  the placement questions alone — "Redo skill questions" below.
  //   (none)  both, which is the first-time run and the ~4-week re-grade.
  const part = searchParams.get('part');
  const partial = part === 'impact' || part === 'skills';
  const sections = part === 'impact' ? ['impact'] : part === 'skills' ? ['skills'] : ['skills', 'impact'];
  const [mode, setMode] = useState('loading'); // 'loading' | 'view' | 'run'
  const [latest, setLatest] = useState(null);   // { skills, measuredKeys, impact }
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    const cal = getCalibrationData();
    const impact = getImpactDetail();
    const hist = getCalibrationHistory();
    setHistory(hist);
    if (cal?.skills) {
      setLatest({ skills: cal.skills, measuredKeys: cal.measuredKeys || null, impact });
      return true;
    }
    setLatest(null);
    return false;
  }, []);

  useEffect(() => {
    const hasPrior = load();
    // An explicit ?part always runs, even for someone with prior scores — that's
    // the whole point of the link.
    setMode(partial || !hasPrior ? 'run' : 'view');
  }, [load, partial]);

  function handleComplete() {
    if (profile) updateProfile({ calibrated_at: new Date().toISOString() }).catch(() => {});
    load();
    setMode('view');
    // Drop the ?part so a refresh lands on the summary instead of silently
    // restarting the half you just finished.
    if (partial) router.replace('/calibration');
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
        <CalibrationFlow
          homeOnFinish={false}
          sections={sections}
          onComplete={handleComplete}
        />
      )}

      {mode === 'view' && latest && (
        <main className="max-w-2xl mx-auto px-6 pt-6 pb-10 space-y-6">
          {/* Two buttons, not one "Recalibrate". The single button always re-ran
              BOTH halves, so someone who just wanted to re-check their skill
              scores had to sit through the impact questions as well (and used to
              retype four essays doing it). Each half now stands on its own. */}
          <div className="flex justify-end gap-2 flex-wrap">
            <button
              onClick={() => router.push('/calibration?part=skills')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
            >
              <RotateCcw className="w-4 h-4" /> Redo skill questions
            </button>
            <button
              onClick={() => router.push('/calibration?part=impact')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill border border-slate-300 dark:border-slate-600 text-sm font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              <TrendingUp className="w-4 h-4" /> Redo impact questions
            </button>
          </div>

          <SkillResults skills={latest.skills} measuredKeys={latest.measuredKeys} />

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
