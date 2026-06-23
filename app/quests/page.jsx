'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Trophy, Clock, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { QUESTS } from '@/lib/quest-data';
import { sortByDifficulty } from '@/lib/difficulty';
import { useProgression } from '@/components/progression-provider';
import { getLessonHistory } from '@/lib/progression';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';

const QUEST_MAX_XP = 200;
const norm = (s) => String(s || '').trim().toLowerCase();

// Launch a Project Quest through the AI build engine in the lesson flow.
function questHref(topic) {
  return `/lesson?format=project_quest&mode=read&topic=${encodeURIComponent(topic)}`;
}

export default function QuestsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { xpEvents = [] } = useProgression() || {};
  const [custom, setCustom] = useState('');

  // Project Quests now complete through the lesson flow, so progress + XP come
  // from lesson history (format 'project_quest'), not the old quest store.
  const completedTopics = useMemo(() => {
    try {
      const hist = getLessonHistory(resolveLearnerId(profile)) || [];
      return new Set(hist.filter((l) => l.format === 'project_quest').map((l) => norm(l.topic)));
    } catch {
      return new Set();
    }
  }, [profile]);

  const xpEarned = xpEvents
    .filter((e) => e.source === 'lesson_complete' && e.meta?.format === 'project_quest')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  function startCustom() {
    const t = custom.trim();
    if (t) router.push(questHref(t));
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Trophy} title="Project Quests" subtitle="Build something real in 20-60 minutes" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-cta-50 ring-1 ring-cta-200 flex items-center justify-center text-cta-600 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-ink dark:text-slate-200 mb-1">Quests are guided builds</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Pick a project or type your own. We&rsquo;ll guide you step by step, you build each piece in your AI tool, and you walk away with a real artifact you can copy and keep — earning up to {QUEST_MAX_XP} XP.
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{completedTopics.size} {completedTopics.size === 1 ? 'project' : 'projects'} completed</span>
                <span>{xpEarned} XP earned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Type your own project */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">Build your own project</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') startCustom(); }}
              placeholder="e.g., 'a weekly report generator for my team'"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            <button
              onClick={startCustom}
              disabled={!custom.trim()}
              className="px-5 py-3 rounded-xl bg-brand text-white font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Build it
            </button>
          </div>
        </div>

        <h3 className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 font-semibold">Featured projects</h3>
        <div data-tour="page-quests" className="space-y-4">
          {sortByDifficulty(QUESTS).map((quest) => (
            <QuestCard key={quest.id} quest={quest} completed={completedTopics.has(norm(quest.title))} />
          ))}
        </div>
      </main>
    </div>
  );
}

function QuestCard({ quest, completed }) {
  return (
    <Link
      href={questHref(quest.title)}
      className={`group block bg-white dark:bg-slate-800 rounded-2xl border shadow-card transition-all overflow-hidden ${
        completed
          ? 'border-green-200 bg-green-50/30'
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl shrink-0">{quest.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-ink dark:text-slate-200 text-lg">{quest.title}</h3>
              {completed && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{quest.description}</p>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {quest.difficulty && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${quest.difficultyColor}`}>{quest.difficulty}</span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {quest.duration}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Up to {QUEST_MAX_XP} XP
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-pill font-semibold text-sm transition-all shadow-sm ${
                completed ? 'bg-green-100 text-green-700' : 'bg-cta text-ink hover:bg-cta-600'
              }`}
            >
              {completed ? <>Build again <ChevronRight className="w-4 h-4" /></> : <>Start project <ChevronRight className="w-4 h-4" /></>}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
