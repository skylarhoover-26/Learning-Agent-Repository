'use client';

// Presentational steps shared by the unified calibration + impact assessment.
// Kept separate from the coordinator (calibration-flow.jsx) so each file stays
// small and the same pieces can be reused by the /my-impact results view.

import { useState } from 'react';
import {
  Crosshair, Check, ArrowRight, X,
  Shield, MessageSquare, Brain, Bot, Database, Wand2, Cpu,
  Award, TrendingUp, User, Users, Building2,
} from 'lucide-react';
import { SKILL_LABELS, SKILL_KEYS, SKILL_DEFINITIONS } from '@/lib/calibration-store';
import { SCORE_LABELS, DIMENSION_LABELS, getOverallLevel } from '@/lib/scoring-store';

// The five rungs a measured competency score maps onto. Shared by the graded
// results step and the results card so one score never gets two different names.
const RATING_LABELS = ['Beginner', 'Comfortable', 'Confident', 'Strong', 'Expert'];

export function ratingLabel(value) {
  return RATING_LABELS[Math.min(4, Math.max(0, Math.floor((value || 0) * 5)))];
}

export const SKILL_ICONS = {
  privacy: Shield,
  prompting: Wand2,
  comms: MessageSquare,
  eval: Brain,
  agents: Bot,
  data: Database,
  models: Cpu,
};

// A competency's plain-language definition, as small grey text directly under the
// name. This used to be an (i) tooltip; people either never found it or had to
// hover to read something they needed while answering (feedback #205).
function CompetencyDefinition({ skillKey, className = '' }) {
  const text = SKILL_DEFINITIONS[skillKey];
  if (!text) return null;
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 leading-snug ${className}`}>
      {text}
    </p>
  );
}

const DIMENSION_ICONS = {
  personal: User,
  team: Users,
  org: Building2,
  development: Brain,
};

// --- Intro (Brian's "placement" card) -------------------------------------
export function IntroStep({ onNext, questionCount = 5 }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-brand to-brand-700 text-white p-8 rounded-t-2xl">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-3">
          <Crosshair className="w-3.5 h-3.5" />
          Placement &middot; {questionCount} question{questionCount === 1 ? '' : 's'}
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Let&apos;s find your starting point.
        </h2>
      </div>
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          {questionCount} situations you might actually run into.
          {' '}<strong>Answer honestly.</strong> That&apos;s how you get the most accurate read on
          where you are, and lessons that actually fit.
        </p>
        {/* Two things people asked for after the first round: tell me if I got it
            right, and don't make me grade myself (feedback #204, #207). */}
        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          You&apos;ll see the best answer and why straight after each one, and we&apos;ll score you
          at the end — no rating yourself.
        </p>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-bold text-lg hover:bg-cta-600 transition-all shadow-md"
        >
          Let&apos;s go
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- Impact intro ----------------------------------------------------------
// Sits in front of the four AI-impact questions.
//
// This used to promise that a written example would be weighed against the pick
// ("both halves get scored"), and warn that blank boxes would cost you. The
// boxes are gone, so that copy would now be a straight lie. It says what's
// actually true instead: this half is self-reported, it's quick, and honesty is
// what makes it useful.
export function ImpactIntroStep() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-brand to-brand-700 text-white p-8 rounded-t-2xl">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-3">
          <TrendingUp className="w-3.5 h-3.5" />
          AI Impact &middot; 4 questions
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Four quick ones, in your own words.
        </h2>
      </div>
      <div className="p-8 space-y-4">
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          These four aren&apos;t a test and there&apos;s nothing to write. Pick the option that
          sounds most like you right now &mdash; <strong>where you actually are, not where you
          think you should be.</strong>
        </p>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          This half is self-reported, and it&apos;s shown that way to you and your manager.
          It&apos;s a snapshot you&apos;ll retake as things change, so an honest low answer today
          is worth far more than a generous one.
        </p>
      </div>
    </div>
  );
}

// --- Quiz question ---------------------------------------------------------
// Answering is a one-shot commit: pick an option and the best answer is revealed
// immediately with a short "why", after which the options lock. That directly
// answers "doesn't tell you if it's right or wrong" (feedback #204), and locking
// is what keeps the score meaningful — otherwise the reveal just shows you which
// button to press.
export function QuizQuestionStep({ question, questionNumber, totalQuestions, selectedAnswer, onAnswer }) {
  const Icon = SKILL_ICONS[question.competency];
  const label = SKILL_LABELS[question.competency];
  const revealed = selectedAnswer !== undefined && selectedAnswer !== null;
  const gotItRight = revealed && selectedAnswer === question.best;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium">
          <Icon className="w-4 h-4" />
          Question {questionNumber} of {totalQuestions} &middot; {label}
        </span>
      </div>

      {question.setup && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{question.setup}</p>
        </div>
      )}

      <h3 className="text-xl font-bold text-ink dark:text-slate-200 mb-4 tracking-tight">{question.prompt}</h3>

      <div className="space-y-3">
        {question.answers.map((answer, i) => {
          const isSelected = selectedAnswer === i;
          const isBest = i === question.best;
          // Before answering: plain options, one highlighted on hover.
          // After answering: the best answer goes green, a wrong pick goes amber,
          // and everything else fades back so the eye lands on those two.
          let tone = 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50';
          if (revealed) {
            if (isBest) {
              tone = 'bg-green-50 dark:bg-green-500/10 text-ink dark:text-slate-200 border-green-500 dark:border-green-500/50 ring-1 ring-green-500';
            } else if (isSelected) {
              tone = 'bg-amber-50 dark:bg-amber-500/10 text-ink dark:text-slate-200 border-amber-500 dark:border-amber-500/50';
            } else {
              tone = 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700';
            }
          }

          return (
            <button
              key={i}
              onClick={() => !revealed && onAnswer(i)}
              disabled={revealed}
              aria-pressed={isSelected}
              className={`w-full flex items-start gap-3 px-5 py-4 rounded-xl border text-left transition-all ${tone} ${revealed ? 'cursor-default' : ''}`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                revealed && isBest
                  ? 'border-green-600 bg-green-600'
                  : revealed && isSelected
                    ? 'border-amber-600 bg-amber-600'
                    : 'border-slate-300 dark:border-slate-600'
              }`}>
                {revealed && isBest && <Check className="w-3.5 h-3.5 text-white" />}
                {revealed && isSelected && !isBest && <X className="w-3.5 h-3.5 text-white" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm leading-relaxed">{answer.text}</span>
                {revealed && (isBest || isSelected) && (
                  <span className={`mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider ${
                    isBest ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {isBest ? (isSelected ? 'Best answer · you picked this' : 'Best answer') : 'You picked this'}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-fade-in">
          <p className={`text-sm font-bold mb-1.5 ${gotItRight ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {gotItRight ? 'Nailed it.' : 'Not quite.'}
          </p>
          {question.why
            ? <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{question.why}</p>
            : <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">The highlighted option is the strongest move here.</p>}
        </div>
      )}
    </div>
  );
}

// --- Graded rating scale ---------------------------------------------------
// Replaces the old seven-slider self-rating. Learners no longer grade
// themselves; we score them from their quiz answers and show them the result
// (feedback #207). Read-only on purpose — the number is a measurement, so
// letting someone drag it would make it a self-rating again.
//
// `measuredKeys` limits this to the competencies the active quiz actually asked
// about. Without it a competency nobody was asked about would display its 0.3
// baseline as though we had measured it.
export function GradedRatingStep({ skills, measuredKeys }) {
  const keys = (measuredKeys?.length ? measuredKeys : SKILL_KEYS).filter(k => SKILL_LABELS[k]);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          Here&apos;s where you landed
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
          Scored from your answers, not a self-rating. This is where your lessons will start — and it
          moves as you learn.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 space-y-6">
        {keys.map(key => {
          const value = skills?.[key] ?? 0;
          const Icon = SKILL_ICONS[key];

          return (
            <div key={key}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-brand shrink-0" />
                  <span className="text-sm font-semibold text-ink dark:text-slate-200">{SKILL_LABELS[key]}</span>
                </div>
                <span className="text-xs font-bold text-brand shrink-0">{ratingLabel(value)}</span>
              </div>
              {/* #205: definition as plain small grey text, not a tooltip. */}
              <CompetencyDefinition skillKey={key} className="mb-2.5" />
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Beginner</span>
                <span>Expert</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Impact question (multiple choice; the pick IS the score) ---------------
// The written-example box that used to sit under these is gone. It made every
// recalibration a four-essay job, re-typing evidence already given, and the
// friction bought us little: the pick is now the score, plainly labelled as
// self-reported wherever it appears.
export function ImpactQuestionCard({ question, selectedValue, onSelect }) {
  const Icon = DIMENSION_ICONS[question.dimension];
  const label = DIMENSION_LABELS[question.dimension];
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium mb-4">
          <Icon className="w-4 h-4" /> {label}
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">{question.question}</h2>
      </div>
      <div className="space-y-3 max-w-lg mx-auto">
        {question.options.map(option => {
          const isSel = selectedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                isSel
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 ${isSel ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand'}`}>{option.value}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Skill results ---------------------------------------------------------
// Measured scores only. There is no "Self vs. Measured" comparison any more
// because we stopped asking people to rate themselves (feedback #207) — the quiz
// grades them instead, so there is no second number to compare against.
//
// `measuredKeys` scopes this to the competencies the quiz actually covered.
// Older runs saved before that field existed fall back to all competencies.
export function SkillResults({ skills, measuredKeys }) {
  const keys = (measuredKeys?.length ? measuredKeys : SKILL_KEYS).filter(k => SKILL_LABELS[k] && skills?.[k] !== undefined);
  const dims = keys.map(k => ({ k, v: skills[k] }));
  const top = [...dims].sort((a, b) => b.v - a.v)[0];
  const bottom = [...dims].sort((a, b) => a.v - b.v)[0];
  if (!dims.length) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
        <div className="p-6">
          <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Your competency scores</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Scored from how you answered the quiz.
          </p>

          <div className="space-y-5">
            {keys.map(key => {
              const measured = Math.round(skills[key] * 100);
              const Icon = SKILL_ICONS[key];

              return (
                <div key={key}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-ink dark:text-slate-200">{SKILL_LABELS[key]}</span>
                    </div>
                    <span className="text-xs font-bold text-brand shrink-0">{ratingLabel(skills[key])}</span>
                  </div>
                  {/* #205: definitions as small grey text rather than a tooltip. */}
                  <CompetencyDefinition skillKey={key} className="mb-2" />
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="absolute h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${measured}%` }} />
                    </div>
                    <span className="w-7 shrink-0 text-right text-xs font-bold text-brand">{measured}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This is a snapshot of today. In about a month we&apos;ll invite you to recalibrate, so your scores and lessons keep pace as you grow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-100 dark:border-green-500/20">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
            <Award className="w-4 h-4" /> Strongest
          </div>
          <p className="text-sm font-bold text-ink dark:text-slate-100">{SKILL_LABELS[top.k]}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{Math.round(top.v * 100)}/100 mastery</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wide mb-2">
            <TrendingUp className="w-4 h-4" /> Biggest gap
          </div>
          <p className="text-sm font-bold text-ink dark:text-slate-100">{SKILL_LABELS[bottom.k]}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{Math.round(bottom.v * 100)}/100 mastery</p>
        </div>
      </div>

    </div>
  );
}

// --- Impact results (self-reported) -----------------------------------------
// `detail` = { personal: { self, measured, why }, team, org, development }.
//
// `measured` is kept as the field name because every consumer and every saved
// run already keys off it — but it is now simply what the person picked. There
// is no second number to compare against, so the two-bar legend and the
// "you rated yourself N" gap text are gone. Runs saved back when an AI graded a
// written example still carry their `why`, and those still expand.
export function ImpactResults({ detail, previousScores = null }) {
  const dimensions = ['personal', 'team', 'org', 'development'];
  const measuredMap = Object.fromEntries(dimensions.map(d => [d, detail?.[d]?.measured || 0]));
  const overall = getOverallLevel(measuredMap);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
      <div className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-3">Your AI Impact Profile</h2>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-bold ${overall.color}`}>
            Overall: {overall.level} Impact
          </span>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-5">
          Self-reported &mdash; this is what you told us, not a graded score.
        </p>
        <div className="space-y-4">
          {dimensions.map(dim => (
            <ImpactRow key={dim} dim={dim} d={detail?.[dim] || {}} prev={previousScores?.[dim]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ImpactRow({ dim, d, prev }) {
  const [open, setOpen] = useState(false);
  const Icon = DIMENSION_ICONS[dim];
  const measured = d.measured || 0;
  const label = SCORE_LABELS[measured] || 'Not Assessed';
  const delta = (prev !== undefined && prev !== null) ? measured - prev : null;

  return (
    <div className="p-4 rounded-xl bg-bg-warm dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-ink dark:text-slate-200">{DIMENSION_LABELS[dim]}</span>
            {delta !== null && delta !== 0 && (
              <span className={`text-xs font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>{delta > 0 ? '+' : ''}{delta} vs last</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="absolute h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${(measured / 5) * 100}%` }} />
            </div>
            <span className="text-sm font-bold text-ink dark:text-slate-200 w-6 text-right">{measured}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {label}
          </p>
        </div>
      </div>
      {d.why && (
        <div className="mt-2 pl-14">
          <button onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-brand hover:underline">
            {open ? 'Hide why' : 'Why this score?'}
          </button>
          {open && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{d.why}</p>}
        </div>
      )}
    </div>
  );
}
