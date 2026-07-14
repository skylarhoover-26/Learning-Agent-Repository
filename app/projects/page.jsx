import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { Briefcase, ListChecks, ChevronRight } from 'lucide-react';
import { getCurrentLearner } from '@/lib/data';
import ProjectsManager from '@/components/projects-manager';

export default async function ProjectsPage() {
  const guard = await getCurrentLearner();
  if (!guard) redirect('/onboarding');
  return <CinematicFrame><ProjectsPageInner /></CinematicFrame>;
}

async function ProjectsPageInner() {
  const learner = await getCurrentLearner();
  if (!learner) redirect('/onboarding');

  return (
    <div className="min-h-screen">
      <PageHeader
        iconButton={(
          <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
        )}
        title="Your Projects"
        subtitle="What you're working on"
      />

      <main className="max-w-4xl mx-auto px-6 pt-6 pb-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tell the AI Learning Coach about your real work projects, and every lesson will be tailored
            to help you apply AI to what you&apos;re actually doing.
          </p>
          <Link
            href="/my-tasks"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-brand-300 text-sm font-medium hover:bg-brand-100 dark:hover:bg-slate-600 transition-all"
          >
            <ListChecks className="w-4 h-4" />
            Your tasks
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ProjectsManager />
      </main>
    </div>
  );
}
