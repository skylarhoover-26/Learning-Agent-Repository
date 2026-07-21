'use client';

// Presentational steps shared by the unified calibration + impact assessment.
// Kept separate from the coordinator (calibration-flow.jsx) so each file stays
// small and the same pieces can be reused by the /my-impact results view.

import { useState } from 'react';
import {
  Crosshair, Check, ArrowRight, Info,
  Shield, MessageSquare, Brain, Bot, Database, Wand2, Cpu,
  Award, TrendingUp, User, Users, Building2,
} from 'lucide-react';
import { SKILL_LABELS, SKILL_KEYS, SKILL_DEFINITIONS } from '@/lib/calibration-store';
import { SCORE_LABELS, DIMENSION_LABELS, getOverallLevel } from '@/lib/scoring-store';

export const SKILL_ICONS = {
  privacy: Shield,
  prompting: Wand2,
  comms: MessageSquare,
  eval: Brain,
  agents: Bot,
  data: Database,
  models: Cpu,
};

// Small (i) affordance that reveals plain-language help text on hover or keyboard
// focus. Reused for competency definitions and for the self-vs-measured verdict.
function InfoTip({ text, label = 'More info' }) {
  if (!text) return null;
  return (
    <span className="group relative inline-flex items-center">
      <Info
        className="w-3.5 h-3.5 text-slate-400 hover:text-brand focus:text-brand cursor-help outline-none"
        tabIndex={0}
        aria-label={label}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 rounded-lg bg-slate-900 dark:bg-slate-700 px-3 py-2 text-xs font-normal leading-snug text-white text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

// Definition tooltip for a competency (e.g. what "AI Evaluation" covers), shown
// next to each skill so people know what they mean before rating themselves.
function SkillInfo({ skillKey }) {
  return <InfoTip text={SKILL_DEFINITIONS[skillKey]} label={`What ${SKILL_LABELS[skillKey]} means`} />;
}

// The self-vs-measured verdict for one competency, plus a plain-language note on
// what it means going forward (revealed in the badge's (i) tooltip).
function calibrationStatus(delta) {
  if (Math.abs(delta) < 10) {
    return {
      label: 'Calibrated',
      tone: 'text-green-600',
      explain: 'Your self-rating closely matched how you actually did on the scenarios — nice self-awareness. Your lessons start right where you expect.',
    };
  }
  if (delta > 0) {
    return {
      label: `Overrated by ${delta}`,
      tone: 'text-amber-600',
      explain: `You rated yourself ${delta} points higher than your scenario answers showed. Totally normal — we'll make sure the fundamentals are solid before speeding up, so nothing feels shaky.`,
    };
  }
  return {
    label: `Underrated by ${Math.abs(delta)}`,
    tone: 'text-blue-600',
    explain: `You did ${Math.abs(delta)} points better than you gave yourself credit for. We'll pitch your lessons a little higher so they stay challenging instead of feeling too basic.`,
  };
}

const DIMENSION_ICONS = {
  personal: User,
  team: Users,
  org: Building2,
  development: Brain,
};

// --- Intro (Brian's "placement" card) -------------------------------------
export function IntroStep({ onNext }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="bg-gradient-to-br from-brand to-brand-700 text-white p-8 rounded-t-2xl">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-3">
          <Crosshair className="w-3.5 h-3.5" />
          Placement &middot; ~5 minutes
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Let&apos;s find your starting point.
        </h2>
      </div>
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          A few quick questions about how you work with AI today.
          {' '}<strong>Answer honestly</strong> — your answers shape your experience
          with the app going forward.
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

// --- Skill scenario --------------------------------------------------------
export function ScenarioStep({ scenario, questionNumber, totalQuestions, selectedAnswer, onAnswer }) {
  const Icon = SKILL_ICONS[scenario.primary];
  const label = SKILL_LABELS[scenario.primary];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium">
          <Icon className="w-4 h-4" />
          Scenario {questionNumber} of {totalQuestions} &middot; {label}
        </span>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{scenario.setup}</p>
      </div>

      <h3 className="text-xl font-bold text-ink dark:text-slate-200 mb-4 tracking-tight">{scenario.prompt}</h3>

      <div className="space-y-3">
        {scenario.answers.map((answer, i) => {
          const isSelected = selectedAnswer === i;
          return (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              className={`w-full flex items-start gap-3 px-5 py-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                isSelected ? 'border-white bg-white/20' : 'border-slate-300 dark:border-slate-600'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </span>
              <span className="text-sm leading-relaxed">{answer.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Skill self-rating -----------------------------------------------------
export function SelfRateStep({ selfRating, onRatingChange }) {
  const ratingLabels = ['Beginner', 'Comfortable', 'Confident', 'Strong', 'Expert'];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">
          How would you rate yourself?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Be honest — the gap between what you think and what we measured is the most valuable insight.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 space-y-6">
        {SKILL_KEYS.map(key => {
          const value = selfRating[key];
          const labelIdx = Math.min(4, Math.floor(value * 5));
          const Icon = SKILL_ICONS[key];

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-brand" />
                  <span className="text-sm font-semibold text-ink dark:text-slate-200">{SKILL_LABELS[key]}</span>
                  <SkillInfo skillKey={key} />
                </div>
                <span className="text-xs font-bold text-brand">{ratingLabels[labelIdx]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={value}
                onChange={e => onRatingChange(key, parseFloat(e.target.value))}
                className="w-full accent-brand"
              />
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

// --- Impact question (multiple choice = self-claim, + optional example) ------
export function ImpactQuestionCard({ question, selectedValue, exampleText, onSelect, onExampleChange }) {
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
      <div className="max-w-lg mx-auto mt-5">
        <label className="block text-sm font-medium text-ink dark:text-slate-200 mb-1.5">{question.example}</label>
        <textarea
          value={exampleText || ''}
          onChange={e => onExampleChange(e.target.value)}
          rows={3}
          placeholder="A specific example makes your score more accurate (optional, but it helps)."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}

// --- Skill results (self vs measured + stats + radar) ----------------------
export function SkillResults({ skills, selfRating }) {
  const dims = SKILL_KEYS.map(k => ({ k, v: skills[k] }));
  const top = [...dims].sort((a, b) => b.v - a.v)[0];
  const bottom = [...dims].sort((a, b) => a.v - b.v)[0];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
        <div className="p-6">
          <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-1">Self vs. Measured</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            The gap between your self-assessment and scenario performance.
          </p>

          <div className="space-y-4">
            {SKILL_KEYS.map(key => {
              const measured = Math.round(skills[key] * 100);
              const self = Math.round(selfRating[key] * 100);
              const delta = self - measured;
              const Icon = SKILL_ICONS[key];

              const status = calibrationStatus(delta);

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-ink dark:text-slate-200">{SKILL_LABELS[key]}</span>
                      <SkillInfo skillKey={key} />
                    </div>
                    <span className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${status.tone}`}>{status.label}</span>
                      <InfoTip text={status.explain} label={`What "${status.label}" means`} />
                    </span>
                  </div>

                  {/* Two SEPARATE, distinctly-colored bars so self and measured
                      are both visible at once — a single overlapping track hid
                      whichever value was shorter. Each bar's label and value are
                      grouped and color-matched to the bar. */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-16 shrink-0 text-[11px] font-semibold text-amber-600 dark:text-amber-400">Self</span>
                      <div className="relative flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="absolute h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${self}%` }} />
                      </div>
                      <span className="w-7 shrink-0 text-right text-xs font-bold text-amber-600 dark:text-amber-400">{self}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-16 shrink-0 text-[11px] font-semibold text-brand">Measured</span>
                      <div className="relative flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="absolute h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${measured}%` }} />
                      </div>
                      <span className="w-7 shrink-0 text-right text-xs font-bold text-brand">{measured}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Self-rated</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand" /> Measured</span>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This is a snapshot of today. In about 6 weeks we&apos;ll invite you to recalibrate, so your scores and lessons keep pace as you grow.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 text-green-700 text-xs font-bold uppercase tracking-wide mb-2">
            <Award className="w-4 h-4" /> Strongest
          </div>
          <p className="text-sm font-bold text-ink dark:text-slate-200">{SKILL_LABELS[top.k]}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{Math.round(top.v * 100)}/100 mastery</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wide mb-2">
            <TrendingUp className="w-4 h-4" /> Biggest gap
          </div>
          <p className="text-sm font-bold text-ink dark:text-slate-200">{SKILL_LABELS[bottom.k]}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{Math.round(bottom.v * 100)}/100 mastery</p>
        </div>
      </div>

    </div>
  );
}

// --- Impact results (self vs measured + why) --------------------------------
// `detail` = { personal: { self, measured, why }, team, org, development }.
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
        <div className="flex justify-end gap-3 text-[10px] text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand" /> Measured</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand/30" /> You rated yourself</span>
        </div>
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
  // Self-claim now tops out at 4 (5 is earned via the measured score). Normalize
  // any legacy self of 5 from pre-fix runs so it never displays as "self-rated 5".
  const self = (d.self === 0 || d.self) ? Math.min(4, d.self) : null;
  const label = SCORE_LABELS[measured] || 'Not Assessed';
  const delta = (prev !== undefined && prev !== null) ? measured - prev : null;
  const gap = self !== null ? measured - self : null;

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
              {self !== null && <div className="absolute h-full bg-brand/30 rounded-full" style={{ width: `${(self / 5) * 100}%` }} />}
              <div className="absolute h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${(measured / 5) * 100}%` }} />
            </div>
            <span className="text-sm font-bold text-ink dark:text-slate-200 w-6 text-right">{measured}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {label}
            {gap !== null && gap !== 0 && (
              <span className="text-slate-400"> · you rated yourself {self} ({gap > 0 ? `measured ${gap} higher` : `${Math.abs(gap)} higher than measured`})</span>
            )}
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
