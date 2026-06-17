'use client';

import Link from 'next/link';
import PageHeader from '@/components/page-header';
import TodaysPick from '@/components/todays-pick';
import { Sparkles, BookOpen, GraduationCap, Compass } from 'lucide-react';

// "Today's Pick" — a single personalized lesson chosen for the learner each day
// (based on skill gaps, freshness, and recent activity). This replaced the old
// browsable "Daily feed"; the recommendation logic lives in <TodaysPick /> so
// the home card and this page stay in sync.
export default function TodaysPickPage() {
  return (
    <div className="min-h-screen" data-tour="page-daily">
      <PageHeader
        icon={Sparkles}
        title="Today's Pick"
        subtitle="A personalized lesson chosen for you, refreshed daily"
      />

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Based on your skills, the gaps in your knowledge, and what you&rsquo;ve practiced recently,
          here&rsquo;s the one thing worth doing today.
        </p>

        <TodaysPick />

        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            More ways to learn
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MoreLink href="/lesson" icon={BookOpen} label="Pick a topic" desc="Choose any lesson + depth" />
            <MoreLink href="/modules" icon={GraduationCap} label="Modules" desc="Multi-lesson paths" />
            <MoreLink href="/discover" icon={Compass} label="Discovery Library" desc="Find AI for your work" />
          </div>
        </div>
      </main>
    </div>
  );
}

function MoreLink({ href, icon: Icon, label, desc }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
    >
      <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-400 group-hover:bg-brand group-hover:text-white flex items-center justify-center shrink-0 transition-all">
        <Icon className="w-4 h-4" />
      </div>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink dark:text-slate-200">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{desc}</span>
      </span>
    </Link>
  );
}
