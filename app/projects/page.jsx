import { redirect } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Briefcase, Plus } from 'lucide-react';
import { getCurrentLearner, getActiveWorkProjects } from '@/lib/data';

export function getActiveWorkProjectsFromData(learnerId) {
  return getActiveWorkProjects(learnerId);
}

export default async function ProjectsPage() {
  const learner = await getCurrentLearner();
  if (!learner) redirect('/onboarding');
  const projects = getActiveWorkProjects(learner.id);

  return (
    <div className="min-h-screen">
      <PageHeader icon={Briefcase} title="Your Projects" subtitle="What you're working on" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <p className="text-sm text-slate-600">
            Tell the AI coach about your real work projects, and every lesson will be tailored
            to help you apply AI to what you're actually doing.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-ink mb-1">{p.title}</h3>
                  {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
                  <span className="inline-block mt-2 text-xs text-slate-500 bg-bg-subtle px-2 py-1 rounded">
                    {p.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-3 flex items-center justify-center">
            <Plus className="w-6 h-6 text-brand" />
          </div>
          <h3 className="font-bold text-ink mb-1">Add a work project</h3>
          <p className="text-sm text-slate-600 mb-4">Lessons will be personalized to your real work.</p>
          <button className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm">
            Add Project
          </button>
        </div>
      </main>
    </div>
  );
}
