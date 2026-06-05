'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Target, Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { getGoals, addGoal, completeGoal, deleteGoal } from '@/lib/goal-store';

const GOAL_SUGGESTIONS = [
  { title: 'Write my first AI prompt using the RCTF framework', category: 'Prompting' },
  { title: 'Use AI to draft 3 emails this week', category: 'Productivity' },
  { title: 'Complete all 5 learning modules', category: 'Learning' },
  { title: 'Build a reusable prompt template for my weekly tasks', category: 'Prompting' },
  { title: 'Try all 4 AI games and beat my high score', category: 'Practice' },
  { title: 'Learn how to spot AI hallucinations', category: 'Safety' },
  { title: 'Create an AI workflow that saves me 30+ minutes a week', category: 'Productivity' },
  { title: 'Understand data privacy best practices for AI tools', category: 'Safety' },
  { title: 'Share a useful prompt with my team', category: 'Impact' },
  { title: 'Complete the calibration assessment', category: 'Learning' },
  { title: 'Reach Level 3 on the platform', category: 'Progress' },
  { title: 'Use AI to summarize a meeting or document', category: 'Productivity' },
];

const CATEGORY_COLORS = {
  Prompting: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Productivity: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Learning: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Practice: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Safety: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Impact: 'bg-cta-50 text-cta-700 dark:bg-cta-900/30 dark:text-cta-300',
  Progress: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [customGoal, setCustomGoal] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setGoals(getGoals());
  }, []);

  function handleAdd(title) {
    const goal = addGoal(title);
    setGoals(prev => [...prev, goal]);
    setCustomGoal('');
    setShowForm(false);
  }

  function handleComplete(id) {
    completeGoal(id);
    setGoals(getGoals());
  }

  function handleDelete(id) {
    deleteGoal(id);
    setGoals(getGoals());
  }

  function handleSubmitCustom(e) {
    e.preventDefault();
    const text = customGoal.trim();
    if (!text) return;
    handleAdd(text);
  }

  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');
  const usedTitles = new Set(goals.map(g => g.title));
  const availableSuggestions = GOAL_SUGGESTIONS.filter(s => !usedTitles.has(s.title));

  return (
    <div className="min-h-screen">
      <PageHeader icon={Target} title="Your Goals" subtitle="Track your AI learning progress" />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {active.length > 0 && (
          <section>
            <h2 className="font-bold text-ink dark:text-slate-200 text-lg mb-4">
              Active Goals ({active.length})
            </h2>
            <div className="space-y-3">
              {active.map(goal => (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4"
                >
                  <button
                    onClick={() => handleComplete(goal.id)}
                    className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center shrink-0 transition-all group"
                    aria-label="Mark complete"
                  >
                    <Check className="w-4 h-4 text-transparent group-hover:text-green-500 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink dark:text-slate-200">{goal.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Added {new Date(goal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {showForm ? (
          <form onSubmit={handleSubmitCustom} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-brand-200 dark:border-brand-700 p-6">
            <h3 className="font-bold text-ink dark:text-slate-200 mb-3">Write your own goal</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="e.g., Use AI to prep for my next QBR"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
                autoFocus
              />
              <button
                type="submit"
                disabled={!customGoal.trim()}
                className="px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Add
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setShowForm(false); setCustomGoal(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 mt-2 transition-colors"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-slate-700 p-6 text-center transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-slate-700 ring-1 ring-brand-100 dark:ring-slate-600 mx-auto mb-2 flex items-center justify-center group-hover:bg-brand group-hover:ring-brand transition-all">
              <Plus className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
            </div>
            <p className="font-semibold text-ink dark:text-slate-200 text-sm">Write your own goal</p>
          </button>
        )}

        {availableSuggestions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-cta-500" />
              <h2 className="font-bold text-ink dark:text-slate-200 text-lg">Goal inspiration</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableSuggestions.map(suggestion => (
                <button
                  key={suggestion.title}
                  onClick={() => handleAdd(suggestion.title)}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-brand-200 hover:shadow-card transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-600 group-hover:border-brand group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 flex items-center justify-center shrink-0 mt-0.5 transition-all">
                      <Plus className="w-3 h-3 text-slate-400 group-hover:text-brand transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-slate-200 leading-snug">
                        {suggestion.title}
                      </p>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 ${CATEGORY_COLORS[suggestion.category] || 'bg-slate-100 text-slate-600'}`}>
                        {suggestion.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="font-bold text-ink dark:text-slate-200 text-lg mb-4">
              Completed ({completed.length})
            </h2>
            <div className="space-y-3">
              {completed.map(goal => (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4 opacity-60"
                >
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink dark:text-slate-200 line-through">{goal.title}</p>
                    {goal.completed_at && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Completed {new Date(goal.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
