'use client';

// Presentational steps shared by the unified calibration + impact assessment.
// Kept separate from the coordinator (calibration-flow.jsx) so each file stays
// small and the same pieces can be reused by the /my-impact results view.

import {
  Crosshair, ChevronRight, Check, ArrowRight, Loader2,
  Shield, MessageSquare, Brain, Bot, Database, Wand2,
  Award, TrendingUp, User, Users, Building2,
} from 'lucide-react';
import { SKILL_LABELS, SKILL_KEYS } from '@/lib/calibration-store';
import { SCORE_LABELS, DIMENSION_LABELS, getOverallLevel } from '@/lib/scoring-store';

export const SKILL_ICONS = {
  privacy: Shield,
  prompting: Wand2,
  comms: MessageSquare,
  eval: Brain,
  agents: Bot,
  data: Database,
};

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
          Let&apos;s figure out where you are with AI — and where to take you next.
        </h2>
      </div>
      <div className="p-8">
        <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          We use this once, then your home screen, lessons, and updates all adapt to{' '}
          <strong>your role</strong> and <strong>your gaps</strong>. It&apos;s how we make sure
          your lessons aren&apos;t too basic or too advanced. No right answers — just honest signal.
        </p>
        <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-2 mb-6 list-disc pl-5">
          <li>A few real Housecall Pro scenarios to see how you actually work with AI</li>
          <li>A quick self-rating we compare to your measured score</li>
          <li>A short read on how AI is changing your day-to-day</li>
          <li>You&apos;ll see your profile and where to grow first</li>
        </ul>
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

// --- Impact question (multiple choice, auto-advances) ----------------------
export function ImpactQuestionCard({ question, onSelect }) {
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
        {question.options.map(option => (
          <button
            key={option.value}
            onClick={() => onSelect(option)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50"
          >
            <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand font-bold text-sm flex items-center justify-center shrink-0">{option.value}</span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Impact follow-up (free text, AI-scored) -------------------------------
export function ImpactFollowUpCard({ question, text, onTextChange, onSubmit, isScoring }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-2">{question}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">The more specific you are, the more accurate your score will be.</p>
      </div>
      <textarea
        value={text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="Describe what you've done..."
        rows={4}
        autoFocus
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm leading-relaxed resize-none"
      />
      <div className="text-center mt-6">
        <button
          onClick={onSubmit}
          disabled={!text.trim() || isScoring}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isScoring ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>) : (<>Continue <ChevronRight className="w-4 h-4" /></>)}
        </button>
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

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-ink dark:text-slate-200">{SKILL_LABELS[key]}</span>
                    </div>
                    <span className={`text-xs font-bold ${
                      Math.abs(delta) < 10 ? 'text-green-600' :
                      delta > 0 ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {Math.abs(delta) < 10 ? 'Calibrated' :
                       delta > 0 ? `Overrated by ${delta}` : `Underrated by ${Math.abs(delta)}`}
                    </span>
                  </div>
                  <div className="relative h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-brand/30 rounded-full transition-all duration-700" style={{ width: `${self}%` }} />
                    <div className="absolute h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${measured}%` }} />
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-[10px] font-bold text-ink dark:text-slate-200">{measured}/100</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>Self: {self}</span>
                    <span>Measured: {measured}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand" /> Measured</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand/30" /> Self-rated</span>
          </div>
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
        <h3 className="text-sm font-semibold text-ink dark:text-slate-200 mb-4">Skill Profile</h3>
        <RadarChart skills={skills} />
      </div>
    </div>
  );
}

function RadarChart({ skills }) {
  const cx = 150;
  const cy = 140;
  const r = 100;
  const keys = SKILL_KEYS;

  const points = keys.map((k, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    const v = skills[k];
    return {
      key: k,
      x: cx + Math.cos(angle) * r * v,
      y: cy + Math.sin(angle) * r * v,
      lx: cx + Math.cos(angle) * (r + 18),
      ly: cy + Math.sin(angle) * (r + 18),
    };
  });

  const ringPoints = (frac) =>
    keys.map((_, i) => {
      const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
      return `${cx + Math.cos(angle) * r * frac},${cy + Math.sin(angle) * r * frac}`;
    }).join(' ');

  return (
    <div className="flex justify-center">
      <svg width={300} height={280} style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <polygon key={frac} points={ringPoints(frac)} fill="none" stroke="#E2E8F0" strokeWidth={1} />
        ))}
        {keys.map((_, i) => {
          const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="#F1F5F9" strokeWidth={1} />
          );
        })}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(0,85,255,0.12)"
          stroke="#0055FF"
          strokeWidth={2}
          className="transition-all duration-1000"
        />
        {points.map(p => (
          <circle key={p.key} cx={p.x} cy={p.y} r={4} fill="#0055FF" className="transition-all duration-1000" />
        ))}
        {points.map(p => (
          <text
            key={`${p.key}-label`}
            x={p.lx} y={p.ly}
            textAnchor={p.lx > cx + 10 ? 'start' : p.lx < cx - 10 ? 'end' : 'middle'}
            fontSize={11}
            fontWeight={600}
            fill="#475569"
          >
            {SKILL_LABELS[p.key]}
          </text>
        ))}
      </svg>
    </div>
  );
}

// --- Impact results --------------------------------------------------------
export function ImpactResults({ scores, previousScores = null }) {
  const overall = getOverallLevel(scores);
  const dimensions = ['personal', 'team', 'org', 'development'];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-brand via-[#009FDA] to-[#0055FF]" />
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-3">Your AI Impact Profile</h2>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-bold ${overall.color}`}>
            Overall: {overall.level} Impact
          </span>
        </div>
        <div className="space-y-4">
          {dimensions.map(dim => {
            const score = scores[dim] || 0;
            const label = SCORE_LABELS[score] || 'Not Assessed';
            const Icon = DIMENSION_ICONS[dim];
            const prev = previousScores?.[dim];
            const delta = prev ? score - prev : null;
            return (
              <div key={dim} className="flex items-center gap-4 p-4 rounded-xl bg-bg-warm dark:bg-slate-900 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-ink dark:text-slate-200">{DIMENSION_LABELS[dim]}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={`text-xs font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>{delta > 0 ? '+' : ''}{delta}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-ink dark:text-slate-200 w-6 text-right">{score}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
