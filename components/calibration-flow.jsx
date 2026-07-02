'use client';

// The single, unified assessment: skill calibration + AI-impact check-in merged
// into one flow. Runs intro → skill scenarios → skill self-rating → 4 impact
// questions → combined results. On finish it writes BOTH the calibration profile
// (which tunes lesson difficulty) and the ai_impact_scores history (which the
// manager dashboard reads), then calls onComplete so the caller can persist a
// `calibrated_at` flag.
//
// Scenarios are role-aware: on mount we ask /api/calibration-scenarios to
// generate scenarios grounded in the person's role/tasks for the five non-privacy
// skills. Privacy is always the curated, vetted scenario. Anything that fails to
// generate falls back to the curated set, so the flow never blocks.
//
// Used in two places:
//   • /calibration page — voluntary retake, inside the normal app chrome.
//   • CalibrationGate — full-screen required gate on first entry (chrome hidden).

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';
import { saveCalibrationData, calculateSkills } from '@/lib/calibration-store';
import { CALIBRATION_SKILL_ORDER, SCENARIO_BY_ID } from '@/lib/calibration-scenarios';
import { saveScores } from '@/lib/scoring-store';
import { IMPACT_QUESTIONS } from '@/lib/impact-questions';
import {
  IntroStep, ScenarioStep, SelfRateStep,
  ImpactQuestionCard, ImpactFollowUpCard,
  SkillResults, ImpactResults,
} from '@/components/assessment-steps';

const N_IMPACT = IMPACT_QUESTIONS.length;
const GEN_TIMEOUT_MS = 18000;

// Build the final ordered scenario list: role-generated where available, curated
// fallback otherwise. Privacy is always the curated scenario.
function composeScenarios(generated) {
  return CALIBRATION_SKILL_ORDER.map((id) =>
    id !== 'privacy' && generated && generated[id] ? generated[id] : SCENARIO_BY_ID[id],
  );
}

export default function CalibrationFlow({ onComplete, gated = false }) {
  const [scenarios, setScenarios] = useState(null); // null = still generating
  const [waitingToStart, setWaitingToStart] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selfRating, setSelfRating] = useState({
    privacy: 0.5, prompting: 0.5, comms: 0.5, eval: 0.5, agents: 0.5, data: 0.5,
  });
  const [impactScores, setImpactScores] = useState({});
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Kick off role-aware scenario generation on mount (during the intro screen, so
  // it's usually ready by the time they hit "Let's go"). Fall back to the curated
  // set on any failure or if it takes too long.
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

  // If they clicked "Let's go" before scenarios were ready, advance the moment
  // they land.
  useEffect(() => {
    if (waitingToStart && scenarios) {
      setWaitingToStart(false);
      setStep(1);
    }
  }, [waitingToStart, scenarios]);

  const nScen = scenarios ? scenarios.length : CALIBRATION_SKILL_ORDER.length;
  const SELF_RATE_STEP = nScen + 1;
  const FIRST_IMPACT_STEP = nScen + 2;
  const TOTAL_STEPS = 1 + nScen + 1 + N_IMPACT;

  const skills = useMemo(() => calculateSkills(answers, scenarios || []), [answers, scenarios]);

  const isIntro = step === 0;
  const isScenario = step >= 1 && step <= nScen;
  const isSelfRate = step === SELF_RATE_STEP;
  const isImpact = step >= FIRST_IMPACT_STEP && step < TOTAL_STEPS;
  const currentScenario = isScenario && scenarios ? scenarios[step - 1] : null;
  const currentImpact = isImpact ? IMPACT_QUESTIONS[step - FIRST_IMPACT_STEP] : null;
  const progressPercent = (step / (TOTAL_STEPS - 1)) * 100;

  function handleStart() {
    if (scenarios) setStep(1);
    else setWaitingToStart(true);
  }

  function goBack() {
    if (showFollowUp) {
      setShowFollowUp(false);
      setFollowUpText('');
      return;
    }
    if (step > 0) setStep(prev => prev - 1);
  }

  function finish(finalImpact) {
    // Persist the results immediately. We deliberately do NOT call onComplete
    // here — that sets `calibrated_at` and (in the gate) dismisses the overlay,
    // which must wait until the user has actually seen their results and clicked
    // the finish button below.
    try {
      saveCalibrationData({ skills, selfRating, answers });
      saveScores(finalImpact);
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
    setCompleted(true);
  }

  // Impact questions auto-advance on select; option "D" (when present) opens a
  // short free-text follow-up that /api/scoring rates.
  function handleImpactSelect(option) {
    const { dimension, followUp } = currentImpact;
    if (followUp && option.value === followUp.trigger) {
      setShowFollowUp(true);
      return;
    }
    advanceImpact({ ...impactScores, [dimension]: option.score });
  }

  async function handleFollowUpSubmit() {
    if (!followUpText.trim()) return;
    setIsScoring(true);
    const { dimension, followUp } = currentImpact;
    let score = 3;
    try {
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimension: followUp.scoringDimension, text: followUpText.trim() }),
      });
      const data = await res.json();
      score = data.score || 3;
    } catch (error) {
      console.error('Scoring error:', error);
    } finally {
      setIsScoring(false);
      setShowFollowUp(false);
      setFollowUpText('');
      advanceImpact({ ...impactScores, [dimension]: score });
    }
  }

  function advanceImpact(nextScores) {
    setImpactScores(nextScores);
    if (step < TOTAL_STEPS - 1) {
      setStep(prev => prev + 1);
    } else {
      finish(nextScores);
    }
  }

  const canAdvance = () => {
    if (isIntro) return true;
    if (isScenario) return currentScenario && answers[currentScenario.id] !== undefined;
    if (isSelfRate) return true;
    return false;
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <SkillResults skills={skills} selfRating={selfRating} />
        <div className="mt-6">
          <ImpactResults scores={impactScores} />
        </div>
        <div className="flex justify-center mt-8">
          <FinishButton gated={gated} onDone={() => onComplete?.({ skills, selfRating, impactScores })} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div key={`${step}-${showFollowUp}-${waitingToStart}`} className="animate-fade-in">
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

          {isImpact && !showFollowUp && (
            <ImpactQuestionCard question={currentImpact} onSelect={handleImpactSelect} />
          )}

          {isImpact && showFollowUp && (
            <ImpactFollowUpCard
              question={currentImpact.followUp.question}
              text={followUpText}
              onTextChange={setFollowUpText}
              onSubmit={handleFollowUpSubmit}
              isScoring={isScoring}
            />
          )}
        </div>

        {/* Impact steps auto-advance on select, so they carry no Next button. */}
        {step > 0 && !isImpact && (
          <div className="flex justify-center mt-8">
            <button
              onClick={isSelfRate ? () => setStep(FIRST_IMPACT_STEP) : () => setStep(step + 1)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSelfRate ? 'Continue' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Building a few scenarios around your role. This takes a moment.
      </p>
    </div>
  );
}

function FinishButton({ gated, onDone }) {
  // In the gate, finishing dismisses the overlay (the caller flips calibrated_at
  // which unmounts the gate). On the standalone page we route home.
  const label = gated ? 'Enter the platform' : 'Back to home';
  function handle() {
    onDone?.();
    if (!gated) {
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
