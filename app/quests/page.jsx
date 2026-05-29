import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Trophy, Clock, ChevronRight, Star } from 'lucide-react';

const QUESTS = [
  {
    id: 'prompt-library',
    title: 'Build Your Personal Prompt Library',
    description: 'Create a reusable collection of 5+ prompts tailored to your daily tasks. Walk away with a document you can reference every day.',
    duration: '20-30 min',
    difficulty: 'Beginner',
    difficultyColor: 'bg-green-100 text-green-700',
    steps: 4,
    icon: '📚',
  },
  {
    id: 'email-workflow',
    title: 'Automate Your Email Workflow',
    description: 'Design and test an AI-powered email response system for your most common customer inquiries.',
    duration: '30-45 min',
    difficulty: 'Intermediate',
    difficultyColor: 'bg-yellow-100 text-yellow-700',
    steps: 5,
    icon: '📧',
  },
  {
    id: 'meeting-assistant',
    title: 'Create a Meeting Assistant',
    description: 'Build a complete meeting workflow: agenda generation, real-time note-taking prompts, and automated follow-up emails.',
    duration: '45-60 min',
    difficulty: 'Intermediate',
    difficultyColor: 'bg-yellow-100 text-yellow-700',
    steps: 6,
    icon: '🤝',
  },
];

export default function QuestsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader icon={Trophy} title="Project Quests" subtitle="Build something real in 20-60 minutes" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-cta-50 ring-1 ring-cta-200 flex items-center justify-center text-cta-600 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-ink mb-1">Quests are guided projects</h2>
              <p className="text-sm text-slate-600">
                Each quest walks you through building a real artifact — a prompt library, a workflow, or a tool — that you can use immediately.
                You'll earn XP and badges along the way.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {QUESTS.map(quest => (
            <div
              key={quest.id}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-200 hover:shadow-card-hover shadow-card transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl shrink-0">{quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-lg mb-1">{quest.title}</h3>
                    <p className="text-sm text-slate-600 mb-3">{quest.description}</p>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${quest.difficultyColor}`}>
                        {quest.difficulty}
                      </span>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {quest.duration}
                      </span>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Star className="w-3 h-3" /> {quest.steps} steps
                      </span>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
                    >
                      Start Quest
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
