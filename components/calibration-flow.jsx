'use client';

// The single, unified assessment: skill calibration + AI-impact competencies
// merged into one flow. Runs intro → skill scenarios → skill self-rating → 4
// impact questions (each: a self-claim + an optional example) → AI synthesizes
// the competency scores + "why" → combined results.
//
// On finish it writes BOTH the calibration profile (tunes lesson difficulty) and
// the ai_impact_scores detail (self/measured/why per competency, which the
// manager dashboard reads), then calls onComplete so the caller can persist a
// `calibrated_at` flag.
//
// Used by the /calibration page (voluntary retake) and CalibrationGate (required
// first-run, full screen).

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';
import { saveCalibrationData, calculateSkills, appendCalibrationRun } from '@/lib/calibration-store';
import { CALIBRATION_SKILL_ORDER, SCENARIO_BY_ID } from '@/lib/calibration-scenarios';
import { saveImpactDetail } from '@/lib/scoring-store';
import { IMPACT_QUESTIONS } from '@/lib/impact-questions';
import {
  IntroStep, ScenarioStep, SelfRateStep,
  ImpactQuestionCard, SkillResults, ImpactResults,
} from '@/components/assessment-steps';

const N_IMPACT = IMPACT_QUESTIONS.length;
const GEN_TIMEOUT_MS = 45000;

function composeScenarios(generated) {
  return CALIBRATION_SKILL_ORDER.map((id) =>
    (generated && generated[id]) ? generated[id] : SCENARIO_BY_ID[id],
  );
}

export default function CalibrationFlow({ onComplete, gated = false, homeOnFinish = true }) {
  const [scenarios, setScenarios] = useState(null); // null = still generating
  const [waitingToStart, setWaitingToStart] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  // Default every competency slider to the midpoint. Derived from the skill order
  // so a newly added dimension automatically gets a self-rating slider.
  const [selfRating, setSelfRating] = useState(
    Object.fromEntries(CALIBRATION_SKILL_ORDER.map((k) => [k, 0.5])),
  );
  // Per competency: { value, self, label, example }
  const [impactAnswers, setImpactAnswers] = useState({});
  const [scoring, setScoring] = useState(false);   // AI is synthesizing impact scores
  const [impactDetail, setImpactDetail] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
    fetch('/api/calibration-scenarios', { method: 'POST', signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { scenarios: {} }))
      .then((d) => { if (!cancelled) setScenarios(composeScenarios(d?.scenarios)); })
      .catch(() => { if (!cancelled) setScenarios(composeScenarios(null)); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, []);

  useEffect(() => {
    if (waitingToStart && scenarios) {
      setWaitingToStart(false);
      setStep(1);
    }
  }, [waitingToStart, scenarios]);

  const nScen = scenarios ? scenarios.length : CALIBRATION_SKILL_ORDER.length;
  const SELF_RATE_STEP = nScen + 1;
  const FIRST_IMPACT_STEP = nScen + 2;
  const LAST_IMPACT_STEP = FIRST_IMPACT_STEP + N_IMPACT - 1;

  const skills = useMemo(() => calculateSkills(answers, scenarios || []), [answers, scenarios]);

  const isIntro = step === 0;
  const isScenario = step >= 1 && step <= nScen;
  const isSelfRate = step === SELF_RATE_STEP;
  const isImpact = step >= FIRST_IMPACT_STEP && step <= LAST_IMPACT_STEP;
  const isLastImpact = step === LAST_IMPACT_STEP;
  const currentScenario = isScenario && scenarios ? scenarios[step - 1] : null;
  const currentImpact = isImpact ? IMPACT_QUESTIONS[step - FIRST_IMPACT_STEP] : null;
  const totalSteps = 1 + nScen + 1 + N_IMPACT;
  const progressPercent = (step / (totalSteps - 1)) * 100;

  function handleStart() {
    if (scenarios) setStep(1);
    else setWaitingToStart(true);
  }

  function goBack() {
    if (step > 0) setStep(prev => prev - 1);
  }

  function selectImpact(dim, option) {
    setImpactAnswers(prev => ({
      ...prev,
      [dim]: { ...prev[dim], value: option.value, self: option.self, label: option.label },
    }));
  }
  function setImpactExample(dim, text) {
    setImpactAnswers(prev => ({ ...prev, [dim]: { ...prev[dim], example: text } }));
  }

  // After the last impact question, synthesize the competency scores + why.
  async function runScoring() {
    setScoring(true);
    const entries = IMPACT_QUESTIONS.map(q => {
      const a = impactAnswers[q.dimension] || {};
      return { dimension: q.dimension, selfLevel: a.self ?? 3, mcLabel: a.label || '', exampleText: (a.example || '').trim() };
    });
    const calibrationSummary = 'calibration skill scores (0-100): ' +
      Object.entries(skills).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(', ');

    let detail;
    try {
      const res = await fetch('/api/impact-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, calibrationSummary }),
      });
      const data = await res.json();
      const scores = data?.scores || {};
      detail = Object.fromEntries(entries.map(e => [
        e.dimension,
        { self: e.selfLevel, measured: scores[e.dimension]?.measured ?? e.selfLevel, why: scores[e.dimension]?.why || '' },
      ]));
    } catch (error) {
      console.error('Impact scoring failed, using self-claim:', error);
      detail = Object.fromEntries(entries.map(e => [e.dimension, { self: e.selfLevel, measured: e.selfLevel, why: '' }]));
    }

    try {
      saveCalibrationData({ skills, selfRating, answers });
      saveImpactDetail(detail);
      appendCalibrationRun({ skills, selfRating, impact: detail });
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
    setImpactDetail(detail);
    setScoring(false);
    setCompleted(true);
  }

  const canAdvance = () => {
    if (isIntro) return true;
    if (isScenario) return currentScenario && answers[currentScenario.id] !== undefined;
    if (isSelfRate) return true;
    if (isImpact) return !!impactAnswers[currentImpact.dimension]?.value;
    return false;
  };

  function onNext() {
    if (isSelfRate) { setStep(FIRST_IMPACT_STEP); return; }
    if (isLastImpact) { runScoring(); return; }
    setStep(step + 1);
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <SkillResults skills={skills} selfRating={selfRating} />
        <div className="mt-6">
          <ImpactResults detail={impactDetail} />
        </div>
        <div className="flex justify-center mt-8">
          <FinishButton gated={gated} homeOnFinish={homeOnFinish} onDone={() => onComplete?.({ skills, selfRating, impactDetail })} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden my-3">
            <div className="h-full bg-brand rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Step {step + 1} of {totalSteps}</p>
            {step > 0 && !scoring && (
              <button onClick={goBack} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors">
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {scoring ? (
          <ScoringStep />
        ) : (
          <>
            <div key={`${step}-${waitingToStart}`} className="animate-fade-in">
              {isIntro && !waitingToStart && <IntroStep onNext={handleStart} />}
              {isIntro && waitingToStart && <PersonalizingStep />}

              {isScenario && currentScenario && (
                <ScenarioStep
                  scenario={currentScenario}
                  questionNumber={step}
                  totalQuestions={nScen}
                  selectedAnswer={answers[currentScenario.id]}
                  onAnswer={(idx) => setAnswers(prev => ({ ...prev, [currentScenario.id]: idx }))}
                />
              )}

              {isSelfRate && (
                <SelfRateStep
                  selfRating={selfRating}
                  onRatingChange={(key, value) => setSelfRating(prev => ({ ...prev, [key]: value }))}
                />
              )}

              {isImpact && (
                <ImpactQuestionCard
                  question={currentImpact}
                  selectedValue={impactAnswers[currentImpact.dimension]?.value}
                  exampleText={impactAnswers[currentImpact.dimension]?.example}
                  onSelect={(option) => selectImpact(currentImpact.dimension, option)}
                  onExampleChange={(text) => setImpactExample(currentImpact.dimension, text)}
                />
              )}
            </div>

            {step > 0 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={onNext}
                  disabled={!canAdvance()}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isLastImpact ? 'See my results' : isSelfRate ? 'Continue' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PersonalizingStep() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 text-center">
      <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto mb-4" />
      <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Personalizing your scenarios…</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Building a few scenarios around your role. This takes a moment.</p>
    </div>
  );
}

function ScoringStep() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 text-center animate-fade-in">
      <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto mb-4" />
      <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Scoring your AI impact…</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Weighing your answers against the AI competency scale.</p>
    </div>
  );
}

function FinishButton({ gated, homeOnFinish = true, onDone }) {
  const label = gated ? 'Enter the platform' : (homeOnFinish ? 'Back to home' : 'Done');
  function handle() {
    onDone?.();
    if (!gated && homeOnFinish) {
      try { window.location.assign('/'); } catch { /* no-op */ }
    }
  }
  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
    >
      {label}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
