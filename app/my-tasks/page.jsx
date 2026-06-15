'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfile } from '@/components/profile-provider';
import PageHeader from '@/components/page-header';
import {
  Briefcase, Check, Plus, Save, Loader2, ArrowLeft,
} from 'lucide-react';
import { getTaskList } from '@/lib/curriculum-data';

// No cap — users can add as many tasks as they want (minimum 1).
const MAX_TASKS = Infinity;

function MyTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDiscover = searchParams.get('from') === 'discover';
  const { profile, updateProfile } = useProfile();
  const [topTasks, setTopTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const department = profile?.department || '';
  const subTeam = profile?.sub_team || null;
  const availableTasks = department ? getTaskList(department, subTeam) : [];

  useEffect(() => {
    if (profile?.top_tasks) {
      setTopTasks([...profile.top_tasks]);
    }
  }, [profile?.top_tasks]);

  function handleTaskToggle(task) {
    setTopTasks(prev => {
      if (prev.includes(task)) {
        return prev.filter(t => t !== task);
      }
      if (prev.length >= MAX_TASKS) return prev;
      return [...prev, task];
    });
    setSaved(false);
  }

  function handleAddCustomTask() {
    const trimmed = customTask.trim();
    if (trimmed && !topTasks.includes(trimmed) && topTasks.length < MAX_TASKS) {
      setTopTasks(prev => [...prev, trimmed]);
      setCustomTask('');
      setShowCustomInput(false);
      setSaved(false);
    }
  }

  async function handleSave() {
    if (topTasks.length === 0) return;
    setSaving(true);
    try {
      await updateProfile({ top_tasks: topTasks });
      setSaved(true);
      // If they came from "Find AI for your work", send them back with the
      // refreshed tasks prefilled.
      if (fromDiscover) {
        const dept = profile?.department || 'my team';
        const prompt = `I work in ${dept}. My main tasks are: ${topTasks.join(', ')}.`;
        router.push(`/discover?q=${encodeURIComponent(prompt)}`);
      }
    } catch (error) {
      console.error('Failed to save tasks:', error);
    } finally {
      setSaving(false);
    }
  }

  const atLimit = topTasks.length >= MAX_TASKS;
  const hasChanges = JSON.stringify(topTasks) !== JSON.stringify(profile?.top_tasks || []);

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <PageHeader icon={Briefcase} title="My Tasks" subtitle="What you do day-to-day" />

      <main className="max-w-2xl mx-auto px-6 py-10">
        {fromDiscover && (
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand mb-4 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Find AI for your work
          </Link>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            These are the tasks AI will help you with. Your lessons, quick wins, and
            &quot;Find AI for your work&quot; recommendations are all personalized based on these.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {availableTasks.map(task => {
            const isSelected = topTasks.includes(task);
            const isDisabled = !isSelected && atLimit;
            return (
              <button
                key={task}
                onClick={() => !isDisabled && handleTaskToggle(task)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : isDisabled
                    ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-100 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 border-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                </div>
                <span className="font-medium text-sm">{task}</span>
              </button>
            );
          })}

          {topTasks.filter(t => !availableTasks.includes(t)).map(task => (
            <button
              key={task}
              onClick={() => handleTaskToggle(task)}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all bg-brand text-white border-brand shadow-sm"
            >
              <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-white">
                <Check className="w-3.5 h-3.5 text-brand" />
              </div>
              <span className="font-medium text-sm">{task}</span>
            </button>
          ))}

          {showCustomInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTask}
                onChange={e => setCustomTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTask(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomTask(''); } }}
                placeholder="Describe your task..."
                autoFocus
                className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
              />
              <button
                onClick={handleAddCustomTask}
                disabled={!customTask.trim() || atLimit}
                className="px-4 py-3.5 rounded-xl bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCustomInput(false); setCustomTask(''); }}
                className="px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              disabled={atLimit}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-dashed text-left transition-all ${
                atLimit
                  ? 'border-slate-100 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                  : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-200 hover:text-brand hover:bg-brand-50'
              }`}
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">Something else not listed here</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {topTasks.length} selected{topTasks.length === 0 ? ' — pick at least 1' : ''}
          </p>
          <div className="flex items-center gap-3">
            {saved && !hasChanges && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || topTasks.length === 0 || saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {fromDiscover ? 'Save & continue' : 'Save Tasks'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyTasksPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>}>
      <MyTasksContent />
    </Suspense>
  );
}
