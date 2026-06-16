'use client';

import { useRouter } from 'next/navigation';
import { useProfile } from '@/components/profile-provider';
import { Search, ChevronRight } from 'lucide-react';

export default function FindAiHero() {
  const router = useRouter();
  const { profile } = useProfile();
  const topTasks = profile?.top_tasks || [];

  function handleClick() {
    if (topTasks.length > 0) {
      const prompt = `I work in ${profile.department || 'my team'}. My main tasks are: ${topTasks.join(', ')}.`;
      router.push(`/discover?q=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/discover');
    }
  }

  return (
    <div data-tour="home-find-ai" className="relative bg-gradient-to-br from-brand to-brand-700 rounded-2xl shadow-card overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute right-24 top-24 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-4 w-48 h-48 rounded-full bg-white/5" />
      </div>

      <div className="relative p-7">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-cta text-ink px-3 py-1 rounded-pill mb-3">
              Start Here
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight tracking-tight">
              Find AI for your work
            </h3>
            <p className="text-sm text-white/80 mb-4 max-w-lg">
              Tell me about your day-to-day work and I&apos;ll find specific AI opportunities you can use
              today — for YOUR actual work, not generic ideas.
            </p>

            {topTasks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {topTasks.map(task => (
                  <span
                    key={task}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 text-xs font-medium text-white"
                  >
                    {task}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-ink font-semibold rounded-pill shadow-sm hover:bg-cta-600 transition-all"
            >
              Discover what AI can do for you
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleClick}
            aria-label="Find AI for your work"
            className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 items-center justify-center shrink-0 hover:bg-white/20 transition-all cursor-pointer"
          >
            <Search className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
