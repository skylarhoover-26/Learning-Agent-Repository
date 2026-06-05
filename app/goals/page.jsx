import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Target, Plus } from 'lucide-react';
import { getCurrentLearner, getActiveGoals, calculateGoalProgressForGoal } from '@/lib/data';

export default async function GoalsPage() {
  const learner = await getCurrentLearner();
  if (!learner) redirect('/onboarding');
  const goals = getActiveGoals(learner.id).map(g => ({
    ...g,
    progress_percent: calculateGoalProgressForGoal(learner.id, g),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader icon={Target} title="Your Goals" subtitle="Track your AI learning progress" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-4 mb-8">
          {goals.map(goal => (
            <div key={goal.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-ink dark:text-slate-200 mb-1">{goal.title}</h3>
              {goal.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{goal.description}</p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-500 rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-ink dark:text-slate-200 w-12 text-right">{goal.progress_percent}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-3 flex items-center justify-center">
            <Plus className="w-6 h-6 text-brand" />
          </div>
          <h3 className="font-bold text-ink dark:text-slate-200 mb-1">Add a new goal</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Goals help personalize your lessons and track progress.</p>
          <button className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm">
            Add Goal
          </button>
        </div>
      </main>
    </div>
  );
}
