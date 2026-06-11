'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Trophy, ChevronRight, ChevronLeft, CheckCircle2, Circle, Lightbulb, Target, ArrowLeft, PartyPopper } from 'lucide-react';
import { QUESTS } from '@/lib/quest-data';
import { getQuestState, startQuest, completeStep, completeQuest } from '@/lib/quest-store';
import { addXpEvent, addBadgeEarned } from '@/lib/learner-store';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { trackQuestComplete } from '@/lib/track';

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quest = QUESTS.find(q => q.id === params.id);
  const { profile } = useProfile();
  const { refresh: refreshProgression } = useProgression() || {};

  const [questState, setQuestState] = useState(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!quest) return;

    let state = getQuestState(quest.id);
    if (!state) {
      state = startQuest(quest.id);
    }
    setQuestState(state);
    setActiveStepIdx(state.currentStep < quest.steps.length ? state.currentStep : quest.steps.length - 1);
  }, [quest]);

  const handleCompleteStep = useCallback(() => {
    if (!quest || !questState) return;

    const updated = completeStep(quest.id, activeStepIdx);

    if (activeStepIdx === quest.steps.length - 1) {
      const completed = completeQuest(quest.id);
      const lid = resolveLearnerId(profile);
      addXpEvent(lid, {
        source: 'quest_complete',
        amount: quest.xpReward,
        created_at: new Date().toISOString(),
        meta: { quest: quest.id },
      });

      const completedCount = Object.values(
        JSON.parse(localStorage.getItem('learner_quest_state') || '{}')
      ).filter(q => q.status === 'completed').length;
      if (completedCount === 1) {
        addBadgeEarned(lid, 'first_quest');
      }
      refreshProgression?.();

      setQuestState(completed);
      setShowCompletion(true);
      trackQuestComplete(quest.id, quest.title, quest.xpReward);
    } else {
      setQuestState(updated);
      setActiveStepIdx(activeStepIdx + 1);
    }
  }, [quest, questState, activeStepIdx, profile, refreshProgression]);

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400 mb-4">Quest not found</p>
          <Link href="/quests" className="text-brand hover:underline">Back to quests</Link>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Trophy} title={quest.title} subtitle="Loading..." />
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={Trophy} title={quest.title} subtitle="Quest Complete!" />
        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-10 text-center">
            <div className="text-6xl mb-4"><PartyPopper className="w-16 h-16 mx-auto text-green-500" /></div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2">Quest Complete!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-2">{quest.title}</p>
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-green-200 rounded-full px-4 py-2 mb-6">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-ink dark:text-slate-200">+{quest.xpReward} XP earned</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                href="/quests"
                className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
              >
                More Quests
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const step = quest.steps[activeStepIdx];
  const isStepCompleted = questState?.completedSteps?.includes(activeStepIdx);
  const isQuestCompleted = questState?.status === 'completed';
  const completedStepCount = questState?.completedSteps?.length || 0;
  const progressPercent = Math.round((completedStepCount / quest.steps.length) * 100);

  return (
    <div className="min-h-screen">
      <PageHeader icon={Trophy} title={quest.title} subtitle={`Step ${activeStepIdx + 1} of ${quest.steps.length}`} />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href="/quests"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All quests
        </Link>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{completedStepCount} of {quest.steps.length} steps completed</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-4 h-fit">
            <h3 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-3 px-1">Steps</h3>
            <div className="space-y-1">
              {quest.steps.map((s, idx) => {
                const completed = questState?.completedSteps?.includes(idx);
                const active = idx === activeStepIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveStepIdx(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      active
                        ? 'bg-brand-50 text-brand font-medium ring-1 ring-brand-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-slate-300'}`} />
                    )}
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center text-brand shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-1">{step.title}</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
                </div>
              </div>

              <div className="bg-bg-warm dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
                <h3 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-2">Your Task</h3>
                <p className="text-sm text-ink dark:text-slate-200 whitespace-pre-line">{step.task}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
                <h3 className="text-xs uppercase tracking-wide text-green-600 font-semibold mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Success Criteria
                </h3>
                <p className="text-sm text-green-800">{step.successCriteria}</p>
              </div>

              {step.tips && step.tips.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                  <h3 className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" /> Tips
                  </h3>
                  <ul className="space-y-1.5">
                    {step.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveStepIdx(Math.max(0, activeStepIdx - 1))}
                  disabled={activeStepIdx === 0}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {isStepCompleted || isQuestCompleted ? (
                  activeStepIdx < quest.steps.length - 1 ? (
                    <button
                      onClick={() => setActiveStepIdx(activeStepIdx + 1)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Completed
                    </span>
                  )
                ) : (
                  <button
                    onClick={handleCompleteStep}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
                  >
                    {activeStepIdx === quest.steps.length - 1 ? (
                      <>Complete Quest <Trophy className="w-4 h-4" /></>
                    ) : (
                      <>Mark Complete & Continue <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
