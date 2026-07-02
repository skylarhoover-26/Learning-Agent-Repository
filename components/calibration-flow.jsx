'use client';

// The single, unified assessment: skill calibration + AI-impact check-in merged
// into one flow. Runs intro → 6 skill scenarios → skill self-rating → 4 impact
// questions → combined results. On finish it writes BOTH the calibration profile
// (which tunes lesson difficulty) and the ai_impact_scores history (which the
// manager dashboard reads), then calls onComplete so the caller can persist a
// `calibrated_at` flag.
//
// Used in two places:
//   • /calibration page — voluntary retake, inside the normal app chrome.
//   • CalibrationGate — full-screen required gate on first entry (chrome hidden).

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { saveCalibrationData, calculateSkills } from '@/lib/calibration-store';
import { SCENARIOS } from '@/lib/calibration-scenarios';
import { saveScores } from '@/lib/scoring-store';
import { IMPACT_QUESTIONS } from '@/lib/impact-questions';
import {
  IntroStep, ScenarioStep, SelfRateStep,
  ImpactQuestionCard, ImpactFollowUpCard,
  SkillResults, ImpactResults,
} from '@/components/assessment-steps';

// Flat step map: 0 = intro, 1..N = scenarios, N+1 = self-rate,
// N+2..N+1+M = impact questions. Results render once step passes the last one.
const N_SCEN = SCENARIOS.length;
const N_IMPACT = IMPACT_QUESTIONS.length;
const SELF_RATE_STEP = N_SCEN + 1;
const FIRST_IMPACT_STEP = N_SCEN + 2;
const TOTAL_STEPS = 1 + N_SCEN + 1 + N_IMPACT; // intro + scenarios + self-rate + impact

export default function CalibrationFlow({ onComplete, gated = false }) {
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

  const skills = useMemo(() => calculateSkills(answers, SCENARIOS), [answers]);

  const isIntro = step === 0;
  const isScenario = step >= 1 && step <= N_SCEN;
  const isSelfRate = step === SELF_RATE_STEP;
  const isImpact = step >= FIRST_IMPACT_STEP && step < TOTAL_STEPS;
  const currentScenario = isScenario ? SCENARIOS[step - 1] : null;
  const currentImpact = isImpact ? IMPACT_QUESTIONS[step - FIRST_IMPACT_STEP] : null;
  const progressPercent = (step / (TOTAL_STEPS - 1)) * 100;

  function goTo(next) {
    setStep(next);
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
    if (isScenario) return answers[currentScenario.id] !== undefined;
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
        <div key={`${step}-${showFollowUp}`} className="animate-fade-in">
          {isIntro && <IntroStep onNext={() => goTo(1)} />}

          {isScenario && (
            <ScenarioStep
              scenario={currentScenario}
              questionNumber={step}
              totalQuestions={N_SCEN}
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
              onClick={isSelfRate ? () => goTo(FIRST_IMPACT_STEP) : () => goTo(step + 1)}
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
