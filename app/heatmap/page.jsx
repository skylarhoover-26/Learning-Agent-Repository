'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Grid3X3, CheckCircle, Circle, Triangle, AlertTriangle,
  ArrowRight, Clock, TrendingDown, GitBranch,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import { useProgression } from '@/components/progression-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';

function getFreshnessZone(days) {
  if (days < 0) return 'none';
  if (days <= 14) return 'fresh';
  if (days <= 60) return 'aging';
  return 'stale';
}

function getCellColor(mastery, freshness) {
  const zone = getFreshnessZone(freshness);
  if (zone === 'none') return 'bg-slate-200/70 dark:bg-slate-700';
  const high = mastery >= 60;
  const mid = mastery >= 30;
  if (zone === 'fresh') return high ? 'bg-blue-400' : mid ? 'bg-blue-200' : 'bg-blue-100';
  if (zone === 'aging') return high ? 'bg-amber-400' : mid ? 'bg-amber-200' : 'bg-amber-100';
  return high ? 'bg-orange-500' : mid ? 'bg-orange-300' : 'bg-orange-200';
}

function getCellOpacity(mastery, hasActivity) {
  if (!hasActivity) return 'opacity-70';
  if (mastery >= 70) return 'opacity-100';
  if (mastery >= 40) return 'opacity-80';
  return 'opacity-50';
}

function getBadge(mastery, freshness, hasActivity) {
  if (!hasActivity) {
    return { icon: Circle, label: 'Not started', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700' };
  }
  const zone = getFreshnessZone(freshness);
  if (zone === 'fresh' && mastery >= 60) {
    return { icon: CheckCircle, label: 'Strong', color: 'text-green-700 bg-green-50' };
  }
  if (zone === 'fresh') {
    return { icon: Circle, label: 'Growing', color: 'text-blue-700 bg-blue-50' };
  }
  if (zone === 'aging') {
    return { icon: Triangle, label: 'Aging', color: 'text-yellow-700 bg-yellow-50' };
  }
  return { icon: AlertTriangle, label: 'Stale', color: 'text-orange-700 bg-orange-50' };
}

function findDoThisNow(skills) {
  const staleHighMastery = skills
    .filter(s => s.hasActivity && getFreshnessZone(s.freshness) === 'stale' && s.mastery >= 40)
    .sort((a, b) => b.freshness - a.freshness);
  return staleHighMastery[0]?.name || null;
}

function getDiagnostics(skills) {
  const active = skills.filter(s => s.hasActivity);
  const highMasteryLowFreshness = active.filter(
    s => s.mastery >= 60 && getFreshnessZone(s.freshness) !== 'fresh'
  );
  const midDrifting = active.filter(
    s => s.mastery >= 30 && s.mastery < 60 && getFreshnessZone(s.freshness) !== 'fresh'
  );
  const recentSlips = active.filter(
    s => s.mastery < 30 && s.freshness >= 0 && s.freshness <= 30
  );
  return { highMasteryLowFreshness, midDrifting, recentSlips };
}

function SkillCell({ skill, isDoThisNow, onSelect, isSelected }) {
  const badge = getBadge(skill.mastery, skill.freshness, skill.hasActivity);
  const BadgeIcon = badge.icon;

  return (
    <button
      onClick={() => onSelect(isSelected ? null : skill.name)}
      className={`relative text-left rounded-xl border p-3 transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brand ${
        isSelected
          ? 'border-brand ring-2 ring-brand/30 shadow-card-hover'
          : 'border-slate-200 dark:border-slate-700 shadow-card'
      }`}
      aria-label={`${skill.name}: ${skill.hasActivity ? `${skill.mastery}% mastery` : 'Not started'}`}
    >
      <div className={`absolute inset-0 rounded-xl ${getCellColor(skill.mastery, skill.freshness)} ${getCellOpacity(skill.mastery, skill.hasActivity)}`} />
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badge.color}`}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
          {isDoThisNow && (
            <span className="animate-heatmap-pulse inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-600 text-white whitespace-nowrap">
              DO THIS NOW
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-ink leading-tight mb-1 line-clamp-2">
          {skill.name}
        </p>
        {skill.hasActivity ? (
          <>
            <p className="text-[11px] text-ink/70 font-medium">{skill.mastery}% mastery</p>
            <p className="text-[10px] text-ink/50">
              {skill.freshness === 0 ? 'Today' : `${skill.freshness}d ago`}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-ink/50">No activity yet</p>
        )}
      </div>
    </button>
  );
}

function ExpandedView({ skill }) {
  if (!skill) return null;
  const badge = getBadge(skill.mastery, skill.freshness, skill.hasActivity);
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <BadgeIcon className={`w-5 h-5 ${badge.color.split(' ')[0]}`} />
        <h3 className="font-bold text-ink dark:text-slate-200 text-base">{skill.name}</h3>
        <span className="text-xs text-slate-400 ml-auto">{skill.category}</span>
      </div>
      {skill.hasActivity ? (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Mastery</span>
              <span className="font-semibold">{skill.mastery}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-brand rounded-full h-2.5 transition-all duration-500"
                style={{ width: `${skill.mastery}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              {skill.freshness === 0
                ? 'Studied today'
                : `Last studied ${skill.freshness} day${skill.freshness !== 1 ? 's' : ''} ago`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          You haven't explored this skill yet. Start a lesson to begin tracking your progress.
        </p>
      )}
      <Link
        href={`/lesson?topic=${encodeURIComponent(skill.name)}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all"
      >
        {skill.hasActivity ? 'Start a refresher' : 'Start learning'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function DiagnosticCard({ icon: Icon, title, color, skills }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-semibold text-ink dark:text-slate-200 text-sm">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{skills.length} skill{skills.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {skills.length === 0 ? (
        <p className="text-xs text-slate-400">None right now</p>
      ) : (
        <ul className="space-y-1.5">
          {skills.map(s => (
            <li key={s.name} className="flex items-center justify-between text-xs">
              <span className="text-ink dark:text-slate-200 font-medium">{s.name}</span>
              <span className="text-slate-400">{s.mastery}% / {s.freshness}d</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 mx-auto mb-4 flex items-center justify-center">
        <Grid3X3 className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">Your heatmap is empty</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        Complete lessons, modules, or calibration to start tracking your knowledge across skills.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/library" className="px-4 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all">
          Start a lesson
        </Link>
        <Link href="/modules" className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
          Browse modules
        </Link>
      </div>
    </div>
  );
}

export default function HeatmapPage() {
  const [selected, setSelected] = useState(null);
  const prog = useProgression();

  const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
  const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;

  const skills = computeSkills({
    lessonHistory: prog?.lessonHistory || [],
    moduleProgress,
    calibrationSkills,
  });

  const hasAnyActivity = skills.some(s => s.hasActivity);
  const doThisNow = findDoThisNow(skills);
  const diagnostics = getDiagnostics(skills);
  const staleHighValueCount = skills.filter(
    s => s.hasActivity && getFreshnessZone(s.freshness) !== 'fresh' && s.mastery > 40
  ).length;
  const selectedSkill = skills.find(s => s.name === selected) || null;
  const categories = ['Foundations', 'Application', 'Safety', 'Frontier'];

  if (prog && !prog.isLoaded) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader icon={Grid3X3} title="Knowledge Heatmap" subtitle="Mastery x Freshness — find your blind spots" />
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Grid3X3}
        title="Knowledge Heatmap"
        subtitle="Mastery x Freshness — find your blind spots"
      />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {!hasAnyActivity ? (
          <EmptyState />
        ) : (
          <>
            {staleHighValueCount > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-ink dark:text-slate-200 text-sm">
                    {staleHighValueCount} high-value cell{staleHighValueCount !== 1 ? 's are' : ' is'} gathering dust
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Skills you know well but haven&apos;t reviewed recently. A quick refresher keeps them sharp.
                  </p>
                </div>
              </div>
            )}

            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                {categories.map(cat => (
                  <p key={cat} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                    {cat}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {skills.map(skill => (
                  <SkillCell
                    key={skill.name}
                    skill={skill}
                    isDoThisNow={skill.name === doThisNow}
                    onSelect={setSelected}
                    isSelected={selected === skill.name}
                  />
                ))}
              </div>
            </section>

            {selectedSkill && <ExpandedView skill={selectedSkill} />}

            <section>
              <h2 className="font-bold text-ink dark:text-slate-200 text-lg mb-4">Diagnostics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DiagnosticCard
                  icon={AlertTriangle}
                  title="High mastery, low freshness"
                  color="bg-orange-100 text-orange-600"
                  skills={diagnostics.highMasteryLowFreshness}
                />
                <DiagnosticCard
                  icon={TrendingDown}
                  title="Mid-mastery, drifting"
                  color="bg-amber-100 text-amber-600"
                  skills={diagnostics.midDrifting}
                />
                <DiagnosticCard
                  icon={Circle}
                  title="Recent slips"
                  color="bg-blue-100 text-blue-600"
                  skills={diagnostics.recentSlips}
                />
              </div>
            </section>
          </>
        )}

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-ink dark:text-slate-200 text-sm mb-3">How to read this map</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <p className="font-semibold text-ink dark:text-slate-200 mb-1.5">Color = Freshness</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-blue-300 inline-block" />
                  <span>Fresh (0-14 days) — recently studied</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-amber-300 inline-block" />
                  <span>Aging (14-60 days) — review soon</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-orange-400 inline-block" />
                  <span>Stale (60+ days) — knowledge is fading</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-600 inline-block" />
                  <span>No activity — start a lesson to track</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-ink dark:text-slate-200 mb-1.5">Mastery Sources</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Lessons completed on this topic</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-blue-600" />
                  <span>Module completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Triangle className="w-4 h-4 text-yellow-600" />
                  <span>Calibration assessment scores</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Mastery is computed from your lesson history, module progress, and calibration results. Freshness tracks how recently you studied each skill.
          </p>
        </section>

        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand" />
          <Link href="/skill-graph" className="text-sm font-medium text-brand hover:text-brand-600 transition-colors">
            View Skill Graph — see how skills connect &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
