import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Briefcase } from 'lucide-react';
import { getCurrentLearner } from '@/lib/data';
import ProjectsManager from '@/components/projects-manager';

export default async function ProjectsPage() {
  const learner = await getCurrentLearner();
  if (!learner) redirect('/onboarding');

  return (
    <div className="min-h-screen">
      <PageHeader icon={Briefcase} title="Your Projects" subtitle="What you're working on" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tell the AI Learning Coach about your real work projects, and every lesson will be tailored
            to help you apply AI to what you&apos;re actually doing.
          </p>
        </div>

        <ProjectsManager />
      </main>
    </div>
  );
}
