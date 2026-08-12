'use client';

// The assessment, in two sections that no longer run back to back.
//
//   'skills'  intro → admin-authored quiz questions → graded competency scores
//   'impact'  intro → 4 AI-impact questions (self-claim + written example) → AI
//             synthesizes the competency scores + "why" → results
//
// The onboarding gate (CalibrationGate) runs ONLY 'skills'. The old flow ran all
// ~14 screens before anyone could enter the platform, which was the single most
// common complaint (feedback #207). The impact half now surfaces a few days later
// (see lib/impact-schedule.js), and /calibration can run either or both.
//
// Finishing 'skills' writes the calibration profile (which tunes lesson
// difficulty). Finishing 'impact' writes the ai_impact_scores detail that the
// manager dashboard reads. Both call onComplete so the caller can persist a
// `calibrated_at` flag.

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ArrowRight, Loader2 } from 'lucide-react';
import { saveCalibrationData, calculateSkills, appendCalibrationRun } from '@/lib/calibration-store';
import { activeQuestions, measuredCompetencies, shuffleQuiz } from '@/lib/onboarding-quiz';
import { useProfile } from '@/components/profile-provider';
import { saveImpactDetail } from '@/lib/scoring-store';
import { IMPACT_QUESTIONS } from '@/lib/impact-questions';
import {
  IntroStep, ImpactIntroStep, QuizQuestionStep, GradedRatingStep,
  ImpactQuestionCard, SkillResults, ImpactResults,
} from '@/components/assessment-steps';

const N_IMPACT = IMPACT_QUESTIONS.length;
const LOAD_TIMEOUT_MS = 15000;

// `answers` holds authored indices; the quiz renders shuffled ones. Map back so
// stepping away and returning to a question re-highlights the option the learner
// actually picked rather than whatever now sits in that slot.
function toDisplayIndex(question, storedIndex) {
  if (storedIndex === undefined || storedIndex === null) return undefined;
  const at = question?.originalIndex?.indexOf(storedIndex);
  return at === undefined || at < 0 ? undefined : at;
}

export default function CalibrationFlow({
  onComplete,
  gated = false,
  homeOnFinish = true,
  sections = ['skills', 'impact'],
}) {
  const doSkills = sections.includes('skills');
  const doImpact = sections.includes('impact');
  // Only used to seed each learner's answer order. Optional chaining throughout:
  // the provider can still be resolving, and a missing email just means everyone
  // shares one (still per-question varied) order rather than breaking the quiz.
  const { profile } = useProfile() || {};

  const [questions, setQuestions] = useState(doSkills ? null : []); // null = still loading
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  // Per competency: { value, self, label, example }
  const [impactAnswers, setImpactAnswers] = useState({});
  const [scoring, setScoring] = useState(false);   // AI is synthesizing impact scores
  const [impactDetail, setImpactDetail] = useState(null);
  const [completed, setCompleted] = useState(false);

  // Load the admin-authored questions. The route falls back to the code defaults
  // on its own, so an empty list here means the request itself failed — in which
  // case we'd rather show nothing than a broken quiz, and the effect below skips
  // straight past the skills section.
  useEffect(() => {
    if (!doSkills) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    fetch('/api/onboarding-quiz', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => { if (!cancelled) setQuestions(activeQuestions(d?.questions)); })
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [doSkills]);

  const nQuiz = questions ? questions.length : 0;
  const measuredKeys = useMemo(() => measuredCompetencies(questions || []), [questions]);
  // calculateSkills keys off question id and reads each answer's `scores`, which
  // authored questions carry in the same shape the old scenarios did.
  //
  // NOTE it reads `questions`, not `shownQuestions` — scoring runs against the
  // AUTHORED answer order, and `answers` stores authored indices to match.
  const skills = useMemo(() => calculateSkills(answers, questions || []), [answers, questions]);

  // What the learner actually sees: same questions, same sequence, options
  // reordered for them specifically. Seeded by email so it holds steady across
  // refreshes and the back button.
  const shownQuestions = useMemo(
    () => shuffleQuiz(questions || [], profile?.email),
    [questions, profile?.email],
  );

  // Step map. The impact section starts right after the quiz when both sections
  // run; when only impact runs, its intro is step 0.
  const IMPACT_INTRO_STEP = doSkills ? nQuiz + 1 : 0;
  const FIRST_IMPACT_STEP = IMPACT_INTRO_STEP + 1;
  const LAST_IMPACT_STEP = FIRST_IMPACT_STEP + N_IMPACT - 1;

  const isIntro = doSkills && step === 0;
  const isQuiz = doSkills && step >= 1 && step <= nQuiz;
  const isImpactIntro = doImpact && step === IMPACT_INTRO_STEP;
  const isImpact = doImpact && step >= FIRST_IMPACT_STEP && step <= LAST_IMPACT_STEP;
  const isLastImpact = doImpact && step === LAST_IMPACT_STEP;
  // The last quiz question is the end of the road when impact is deferred.
  const isLastQuiz = doSkills && !doImpact && step === nQuiz;

  const currentQuestion = isQuiz && shownQuestions.length ? shownQuestions[step - 1] : null;
  const currentImpact = isImpact ? IMPACT_QUESTIONS[step - FIRST_IMPACT_STEP] : null;

  const totalSteps = (doSkills ? 1 + nQuiz : 0) + (doImpact ? 1 + N_IMPACT : 0);
  const progressPercent = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0;

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

  // Skills-only finish: persist the graded scores and land on the results.
  function finishSkills() {
    try {
      saveCalibrationData({ skills, measuredKeys, answers });
      appendCalibrationRun({ skills, measuredKeys });
    } catch (error) {
      console.error('Failed to save calibration:', error);
    }
    setCompleted(true);
  }

  // After the last impact question, synthesize the competency scores + why.
  async function runScoring() {
    setScoring(true);
    const entries = IMPACT_QUESTIONS.map(q => {
      const a = impactAnswers[q.dimension] || {};
      return { dimension: q.dimension, selfLevel: a.self ?? 3, mcLabel: a.label || '', exampleText: (a.example || '').trim() };
    });
    // Only meaningful when the quiz ran in the same session; on the deferred
    // impact-only run there are no fresh skill scores to summarize.
    const calibrationSummary = doSkills
      ? 'calibration skill scores (0-100): ' +
        measuredKeys.map((k) => `${k} ${Math.round((skills[k] ?? 0) * 100)}`).join(', ')
      : '';

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
      if (doSkills) saveCalibrationData({ skills, measuredKeys, answers });
      saveImpactDetail(detail);
      appendCalibrationRun(doSkills ? { skills, measuredKeys, impact: detail } : { impact: detail });
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
    setImpactDetail(detail);
    setScoring(false);
    setCompleted(true);
  }

  const canAdvance = () => {
    if (isIntro) return true;
    // Answering reveals the best answer and locks the options, so having an
    // answer at all is what unlocks Next.
    if (isQuiz) return currentQuestion && answers[currentQuestion.id] !== undefined;
    if (isImpactIntro) return true;
    if (isImpact) return !!impactAnswers[currentImpact.dimension]?.value;
    return false;
  };

  function onNext() {
    if (isLastQuiz) { finishSkills(); return; }
    if (isQuiz && step === nQuiz && doImpact) { setStep(IMPACT_INTRO_STEP); return; }
    if (isImpactIntro) { setStep(FIRST_IMPACT_STEP); return; }
    if (isLastImpact) { runScoring(); return; }
    setStep(step + 1);
  }

  function nextLabel() {
    if (isLastQuiz) return 'See my scores';
    if (isLastImpact) return 'See my results';
    if (isImpactIntro) return 'Got it, start';
    return 'Next';
  }

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Skills-only: the graded scale IS the result — showing GradedRatingStep
            and SkillResults together would say the same thing twice. */}
        {doSkills && !doImpact && <GradedRatingStep skills={skills} measuredKeys={measuredKeys} />}
        {doSkills && doImpact && <SkillResults skills={skills} measuredKeys={measuredKeys} />}
        {doImpact && (
          <div className={doSkills ? 'mt-6' : ''}>
            <ImpactResults detail={impactDetail} />
          </div>
        )}
        <div className="flex justify-center mt-8">
          <FinishButton
            gated={gated}
            homeOnFinish={homeOnFinish}
            onDone={() => onComplete?.({ skills, measuredKeys, impactDetail })}
          />
        </div>
      </div>
    );
  }

  // Still fetching the questions, or the fetch failed outright.
  if (doSkills && questions === null) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <LoadingStep />
      </main>
    );
  }
  if (doSkills && nQuiz === 0) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 text-center">
          <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">We couldn&apos;t load the questions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Something went wrong on our side. Reload and we&apos;ll try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-2xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden my-3">
            <div className="h-full bg-brand rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="pb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Step {step + 1} of {totalSteps}</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {scoring ? (
          <ScoringStep />
        ) : (
          <>
            <div key={step} className="animate-fade-in">
              {isIntro && <IntroStep onNext={() => setStep(1)} questionCount={nQuiz} />}

              {isQuiz && currentQuestion && (
                <QuizQuestionStep
                  question={currentQuestion}
                  questionNumber={step}
                  totalQuestions={nQuiz}
                  selectedAnswer={toDisplayIndex(currentQuestion, answers[currentQuestion.id])}
                  onAnswer={(idx) => setAnswers(prev => ({
                    ...prev,
                    // Store the AUTHORED index, never the displayed one.
                    [currentQuestion.id]: currentQuestion.originalIndex[idx],
                  }))}
                />
              )}

              {isImpactIntro && <ImpactIntroStep />}

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

            {/* Shown for every step EXCEPT the skills intro card, which carries its
                own "Let's go" button. Keying this off `step > 0` instead used to
                strand the impact-only flow: its first screen is the impact intro at
                step 0, which has no button of its own, so there was no way forward.
                Back only appears once there's somewhere to go back to. */}
            {!isIntro && (
              // Back sits beside the primary action, matching the lesson wizard
              // (app/lesson/page.jsx) rather than floating in the progress header.
              <div className="flex justify-center gap-3 mt-8">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 px-5 py-3 rounded-pill cine-glass text-slate-600 dark:text-slate-300 font-semibold text-sm hover:opacity-80 transition-all"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back
                  </button>
                )}
                <button
                  onClick={onNext}
                  disabled={!canAdvance()}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {nextLabel()}
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

function LoadingStep() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 text-center">
      <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto mb-4" />
      <h2 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Getting your questions ready…</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">One moment.</p>
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
