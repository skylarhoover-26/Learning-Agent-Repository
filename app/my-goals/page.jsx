'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/components/profile-provider';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { Target, Check, Plus, Save, Loader2 } from 'lucide-react';
import { GOALS } from '@/lib/onboarding-options';
import { resolveTaskAdd, normalizeTaskText, taskNoticeText } from '@/lib/task-input';

// Goals were editable in exactly one place — buried inside the role editor, next
// to department and experience level — even though they're one of the four signals
// every lesson is built from. Tools, tasks and projects each had their own
// profile-menu page; goals did not. This is that page. (The role editor still
// covers goals too, as the role-manager card on /profile.)
function MyGoalsContent() {
  const { profile, updateProfile } = useProfile();
  const [goals, setGoals] = useState([]);
  const [customGoal, setCustomGoal] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  // Feedback for the custom-goal input: {kind: 'duplicate'|'selected', task}.
  const [goalNotice, setGoalNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (Array.isArray(profile?.goals)) {
      setGoals([...profile.goals]);
    } else if (profile?.goal) {
      // Older profiles stored a single joined string.
      setGoals(profile.goal.split(';').map((g) => g.trim()).filter(Boolean));
    }
  }, [profile?.goals, profile?.goal]);

  function handleToggle(goal) {
    setGoals(prev => (prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]));
    setGoalNotice(null);
    setSaved(false);
  }

  function handleAddCustomGoal() {
    const result = resolveTaskAdd({ typed: customGoal, selected: goals, available: GOALS });
    if (result.status === 'empty') return;
    if (result.status === 'duplicate') {
      setGoalNotice({ kind: 'duplicate', task: result.match });
      return;
    }
    setGoals(result.tasks);
    setCustomGoal('');
    setShowCustomInput(false);
    setGoalNotice(result.status === 'selected' ? { kind: 'selected', task: result.match } : null);
    setSaved(false);
  }

  async function handleSave() {
    if (goals.length === 0) return;
    setSaving(true);
    try {
      // Keep the legacy joined `goal` string in sync — several prompt sites still
      // read it (lib/ai.js chat, discovery, video scripts).
      await updateProfile({ goals, goal: goals.join('; ') });
      setSaved(true);
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setSaving(false);
    }
  }

  const highlightKey = goalNotice?.task ? normalizeTaskText(goalNotice.task) : null;
  const isHighlighted = goal => !!highlightKey && normalizeTaskText(goal) === highlightKey;
  const noticeText = taskNoticeText(goalNotice);
  const savedGoals = Array.isArray(profile?.goals) ? profile.goals : [];
  const hasChanges = JSON.stringify(goals) !== JSON.stringify(savedGoals);

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <PageHeader icon={Target} title="My Goals" subtitle="What you want to get out of AI" />

      <main className="max-w-2xl mx-auto px-6 pt-6 pb-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your goals sit alongside your tasks, tools and projects: every lesson connects
            what it teaches back to one of them, and Today&apos;s Pick uses them to word your
            next lesson around where you&apos;re headed.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {GOALS.map(goal => {
            const isSelected = goals.includes(goal);
            return (
              <button
                key={goal}
                onClick={() => handleToggle(goal)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
                } ${isHighlighted(goal) ? 'ring-2 ring-cta ring-offset-2 dark:ring-offset-slate-900' : ''}`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'bg-white dark:bg-slate-800 border-white' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                </div>
                <span className="font-medium text-sm">{goal}</span>
              </button>
            );
          })}

          {goals.filter(g => !GOALS.includes(g)).map(goal => (
            <button
              key={goal}
              onClick={() => handleToggle(goal)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all bg-brand text-white border-brand shadow-sm ${
                isHighlighted(goal) ? 'ring-2 ring-cta ring-offset-2 dark:ring-offset-slate-900' : ''
              }`}
            >
              <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-white">
                <Check className="w-3.5 h-3.5 text-brand" />
              </div>
              <span className="font-medium text-sm">{goal}</span>
            </button>
          ))}

          {showCustomInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customGoal}
                onChange={e => { setCustomGoal(e.target.value); setGoalNotice(null); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddCustomGoal();
                  if (e.key === 'Escape') { setShowCustomInput(false); setCustomGoal(''); setGoalNotice(null); }
                }}
                placeholder="What do you want to get out of AI?"
                autoFocus
                className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
              />
              <button
                onClick={handleAddCustomGoal}
                disabled={!customGoal.trim()}
                className="px-4 py-3.5 rounded-xl bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCustomInput(false); setCustomGoal(''); setGoalNotice(null); }}
                className="px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowCustomInput(true); setGoalNotice(null); }}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-left transition-all hover:border-brand-200 hover:text-brand hover:bg-brand-50"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">Something else not listed here</span>
            </button>
          )}

          {noticeText && (
            <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300 px-1">
              {noticeText}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {goals.length} selected{goals.length === 0 ? ' — pick at least 1' : ''}
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
              disabled={!hasChanges || goals.length === 0 || saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Goals
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyGoalsPage() {
  return <CinematicFrame><MyGoalsContent /></CinematicFrame>;
}
