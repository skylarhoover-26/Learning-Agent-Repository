'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Trophy, Clock, ChevronRight, Star, CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { QUESTS } from '@/lib/quest-data';
import { getQuestProgress, getCompletedQuestCount } from '@/lib/quest-store';
import { getTotalEarnedXp } from '@/lib/xp-store';

export default function QuestsPage() {
  const [progressMap, setProgressMap] = useState({});
  const [completedCount, setCompletedCount] = useState(0);
  const [totalXp, setTotalXp] = useState(0);

  useEffect(() => {
    const map = {};
    for (const quest of QUESTS) {
      map[quest.id] = getQuestProgress(quest.id, quest.steps.length);
    }
    setProgressMap(map);
    setCompletedCount(getCompletedQuestCount());
    setTotalXp(getTotalEarnedXp());
  }, []);

  const totalXpAvailable = QUESTS.reduce((sum, q) => sum + q.xpReward, 0);

  return (
    <div className="min-h-screen">
      <PageHeader icon={Trophy} title="Project Quests" subtitle="Build something real in 20-60 minutes" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-cta-50 ring-1 ring-cta-200 flex items-center justify-center text-cta-600 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-ink mb-1">Quests are guided projects</h2>
              <p className="text-sm text-slate-600">
                Each quest walks you through building a real artifact — a prompt library, a workflow, or a tool — that you can use immediately.
                Complete steps to earn XP and badges.
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{completedCount} of {QUESTS.length} quests completed</span>
                <span>{totalXp} XP earned</span>
                <span>{totalXpAvailable} XP available</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {QUESTS.map(quest => {
            const progress = progressMap[quest.id] || { status: 'not_started', percent: 0, completedSteps: 0, totalSteps: quest.steps.length };
            return (
              <QuestCard key={quest.id} quest={quest} progress={progress} />
            );
          })}
        </div>
      </main>
    </div>
  );
}

function QuestCard({ quest, progress }) {
  const isCompleted = progress.status === 'completed';
  const isInProgress = progress.status === 'in_progress';

  return (
    <Link
      href={`/quests/${quest.id}`}
      className={`group block bg-white rounded-2xl border shadow-card transition-all overflow-hidden ${
        isCompleted
          ? 'border-green-200 bg-green-50/30'
          : 'border-slate-200 hover:border-brand-200 hover:shadow-card-hover'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl shrink-0">{quest.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-ink text-lg">{quest.title}</h3>
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
            </div>
            <p className="text-sm text-slate-600 mb-3">{quest.description}</p>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${quest.difficultyColor}`}>
                {quest.difficulty}
              </span>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {quest.duration}
              </span>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Star className="w-3 h-3" /> {quest.steps.length} steps
              </span>
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {quest.xpReward} XP
              </span>
            </div>

            {isInProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Step {progress.completedSteps} of {progress.totalSteps}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <span
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-pill font-semibold text-sm transition-all shadow-sm ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : isInProgress
                    ? 'bg-brand text-white'
                    : 'bg-cta text-ink hover:bg-cta-600'
              }`}
            >
              {isCompleted ? (
                <>Review Quest <RotateCcw className="w-4 h-4" /></>
              ) : isInProgress ? (
                <>Continue <Play className="w-4 h-4" /></>
              ) : (
                <>Start Quest <ChevronRight className="w-4 h-4" /></>
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
