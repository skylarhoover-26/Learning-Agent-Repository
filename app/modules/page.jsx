'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { MODULES } from '@/lib/modules-data';
import {
  getModuleProgress, isSectionRead, markSectionRead,
  saveQuizAnswer, markModuleComplete,
} from '@/lib/module-store';
import {
  GraduationCap, ChevronRight, ChevronLeft,
  Check, BookOpen, Zap, Wand2, Cog, BarChart3,
  ArrowRight, Play,
} from 'lucide-react';

const MODULE_ICONS = [BookOpen, Zap, Wand2, Cog, BarChart3];

export default function ModulesPage() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [expandedSection, setExpandedSection] = useState(0);
  const [progressVersion, setProgressVersion] = useState(0);

  const refreshProgress = useCallback(() => {
    setProgressVersion((v) => v + 1);
  }, []);

  if (selectedModule !== null) {
    const mod = MODULES[selectedModule];
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader
          icon={GraduationCap}
          title={`Module ${mod.num}: ${mod.title}`}
          subtitle={mod.subtitle}
        />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <button
            onClick={() => { setSelectedModule(null); setExpandedSection(0); }}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> All modules
          </button>

          <ModuleDetail
            module={mod}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            onProgressChange={refreshProgress}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={GraduationCap}
        title="Learning Path"
        subtitle="5 modules from foundations to measuring impact"
      />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {MODULES.map((mod, i) => {
            const Icon = MODULE_ICONS[i];
            // progressVersion is used to trigger re-reads from localStorage
            const progress = progressVersion >= 0 ? getModuleProgress(mod.num) : null; // eslint-disable-line no-unused-expressions
            const totalSections = mod.sections.length;
            const readCount = progress?.sectionsRead?.length || 0;
            const pct = totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0;
            return (
              <button
                key={mod.num}
                onClick={() => setSelectedModule(i)}
                className="w-full group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card hover:border-brand-200 hover:shadow-card-hover p-6 transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white text-brand transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Module {mod.num}
                      </span>
                      <span className="text-xs text-slate-400">&middot; {mod.duration}</span>
                      {progress?.completed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          <Check className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {!progress?.completed && readCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                          {pct}% In Progress
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-ink dark:text-slate-200 mb-0.5 tracking-tight">{mod.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{mod.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ModuleDetail({ module: mod, expandedSection, setExpandedSection, onProgressChange }) {
  const [sectionReadState, setSectionReadState] = useState(() =>
    mod.sections.map((_, i) => isSectionRead(mod.num, i))
  );

  function handleExpandSection(idx) {
    const willExpand = expandedSection !== idx;
    setExpandedSection(willExpand ? idx : -1);
    if (willExpand && !sectionReadState[idx]) {
      markSectionRead(mod.num, idx);
      setSectionReadState((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      onProgressChange?.();
    }
  }

  function handleNextSection(currentIdx) {
    const nextIdx = currentIdx + 1;
    setExpandedSection(nextIdx);
    if (nextIdx < mod.sections.length && !sectionReadState[nextIdx]) {
      markSectionRead(mod.num, nextIdx);
      setSectionReadState((prev) => {
        const next = [...prev];
        next[nextIdx] = true;
        return next;
      });
      onProgressChange?.();
    }
  }

  const handleActivityDone = useCallback(() => {
    const allRead = mod.sections.every((_, i) => isSectionRead(mod.num, i));
    if (allRead) {
      markModuleComplete(mod.num);
      onProgressChange?.();
    }
  }, [mod.num, mod.sections, onProgressChange]);

  return (
    <div className="space-y-6">
      {/* Sections */}
      <div className="space-y-3">
        {mod.sections.map((section, i) => {
          const isExpanded = expandedSection === i;
          const isDone = sectionReadState[i];

          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden"
            >
              <button
                onClick={() => handleExpandSection(i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone
                    ? 'bg-green-100 text-green-700'
                    : isExpanded
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-sm font-semibold flex-1 ${isExpanded ? 'text-ink dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                  {section.title}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-10">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {section.content}
                    </p>
                    {section.action && (
                      <Link
                        href={section.action.href}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 transition-all"
                      >
                        {section.action.label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleNextSection(i)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-600 transition-colors"
                      >
                        {i < mod.sections.length - 1 ? 'Next section' : 'Go to activity'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity */}
      {mod.activity && (
        <ActivityCard activity={mod.activity} moduleNum={mod.num} onActivityDone={handleActivityDone} />
      )}
    </div>
  );
}

function ActivityCard({ activity, moduleNum, onActivityDone }) {
  const storedProgress = getModuleProgress(moduleNum);
  const [selectedAnswer, setSelectedAnswer] = useState(storedProgress?.quizAnswer);
  const [showResult, setShowResult] = useState(storedProgress?.quizAnswer !== null && storedProgress?.quizAnswer !== undefined);

  function handleQuizAnswer(answerIdx) {
    setSelectedAnswer(answerIdx);
    setShowResult(true);
    saveQuizAnswer(moduleNum, answerIdx);
    onActivityDone?.();
  }

  if (activity.type === 'quiz') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.question}</p>
        <div className="space-y-2 mb-4">
          {activity.options.map((opt, i) => {
            const isCorrect = showResult && i === activity.correct;
            const isWrong = showResult && selectedAnswer === i && i !== activity.correct;
            return (
              <button
                key={i}
                onClick={() => handleQuizAnswer(i)}
                disabled={showResult}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  isCorrect
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : isWrong
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : selectedAnswer === i
                    ? 'bg-brand-50 border-brand-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-200 disabled:opacity-60'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {showResult && (
          <div className={`rounded-xl p-4 text-sm ${
            selectedAnswer === activity.correct
              ? 'bg-green-50 border border-green-100 text-green-800'
              : 'bg-amber-50 border border-amber-100 text-amber-800'
          }`}>
            {activity.explanation}
          </div>
        )}
      </div>
    );
  }

  if (activity.type === 'action' || activity.type === 'build') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.description}</p>
        {activity.steps && (
          <ol className="space-y-2 mb-4">
            {activity.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}
        {activity.action && (
          <Link
            href={activity.action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
          >
            {activity.action.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  if (activity.type === 'reflect') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-brand" />
          <h3 className="font-bold text-ink dark:text-slate-200">{activity.title}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{activity.description}</p>
        <div className="space-y-3">
          {activity.questions.map((q, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm font-medium text-ink dark:text-slate-200 mb-2">{i + 1}. {q}</p>
              <textarea
                placeholder="Your answer..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
