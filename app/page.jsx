import Link from 'next/link';
import {
  Sparkles, TrendingUp, BookOpen,
  ChevronRight, BarChart2, GitBranch, Compass, Rss,
} from 'lucide-react';
import LiveLevelBadges from '@/components/live-level-badges';
import LiveStreakCard from '@/components/live-streak-card';
import HomeLeaderboard from '@/components/home-leaderboard';
import LiveSourcesFeed from '@/components/live-sources-feed';
import UserMenu from '@/components/user-menu';
import { SidebarToggle } from '@/components/sidebar';
import WelcomeGreeting from '@/components/welcome-greeting';
import FindAiHero from '@/components/find-ai-hero';
import TodaysPick from '@/components/todays-pick';
import ImpactAssessmentModal from '@/components/impact-assessment-modal';
import HomeQuickActions from '@/components/home-quick-action';
import GatedHomeSection from '@/components/gated-home-section';
import {
  getCurrentLearner, getAggregatedSkills,
} from '@/lib/data';
import { ArrowRight } from 'lucide-react';

const TIER_LABELS = {
  beginner: { label: 'Beginner', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', color: 'bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 ring-1 ring-slate-300' },
};

function getGreetingPrefix() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSkills(learnerId) {
  const agg = getAggregatedSkills(learnerId);
  const strong = agg.strong.slice(0, 3).map(s => s.skill);
  const growing = agg.growing.slice(0, 3).map(s => s.skill);
  let gaps = agg.gap.slice(0, 3).map(s => s.skill);
  if (strong.length === 0 && growing.length === 0 && gaps.length === 0) {
    gaps = ['Pick a topic to start building skills'];
  }
  return { strong, growing, gaps };
}

export default async function Dashboard() {
  const learner = await getCurrentLearner();

  if (!learner) {
    return (
      <div className="min-h-screen">
        <header className="bg-ink sticky top-0 z-50 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-bold tracking-tight text-[17px] leading-tight">AI Learning Coach</h1>
                <p className="text-xs text-white/60 leading-tight">By Housecall Pro</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 ring-1 ring-brand-200 mx-auto mb-6 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-3xl font-bold text-ink dark:text-slate-200 mb-3">Welcome to AI Learning Coach</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Set up your profile in under 2 minutes and get a personalized AI learning experience.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold text-base hover:bg-cta-600 transition-all shadow-sm"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const skills = getSkills(learner.id);
  const tier = TIER_LABELS[learner.tier] || TIER_LABELS.beginner;
  const displayName = learner.display_name || 'there';
  const greetingPrefix = getGreetingPrefix();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-ink sticky top-0 z-50 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarToggle />
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-[17px] leading-tight">AI Learning Coach</h1>
              <p className="text-xs text-white/60 leading-tight">By Housecall Pro</p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <main data-tour="page-home" className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ═══════════════════════════════════════════ */}
        {/* TOP ZONE: LEARNING                         */}
        {/* ═══════════════════════════════════════════ */}

        {/* Welcome text */}
        <div>
          <WelcomeGreeting fallbackName={displayName} />
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your AI Learning Coach helps you discover and apply AI in your daily work.
            <span className={`inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-md text-xs font-medium ${tier.color}`}>
              {tier.label}
            </span>
          </p>
        </div>

        {/* Level + XP bar (XP explainer now lives inside this card) */}
        <LiveLevelBadges />

        {/* Learning section header */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-bg-warm dark:bg-slate-900 pr-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-ink dark:text-slate-200">Find something to learn</span>
            </span>
          </div>
        </div>

        {/* "Find AI for your work" hero */}
        <FindAiHero />

        {/* Other ways to learn section header — matches "Find something to learn" */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-bg-warm dark:bg-slate-900 pr-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-ink dark:text-slate-200">Other ways to learn</span>
            </span>
          </div>
        </div>

        {/* Primary nav — alphabetized */}
        <HomeQuickActions />

        {/* Today's Pick */}
        <GatedHomeSection href="/daily">
          <TodaysPick />
        </GatedHomeSection>

        {/* ═══════════════════════════════════════════ */}
        {/* DIVIDER                                    */}
        {/* ═══════════════════════════════════════════ */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-bg-warm dark:bg-slate-900 pr-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-ink dark:text-slate-200">Your AI Stats</span>
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* BOTTOM ZONE: STATS                         */}
        {/* ═══════════════════════════════════════════ */}

        {/* Streak + Leaderboard row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <LiveStreakCard />
          <div data-tour="home-leaderboard" className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink dark:text-slate-200">Top Learners</h3>
              <GatedHomeSection href="/leaderboard">
                <Link
                  href="/leaderboard"
                  className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
                >
                  View full leaderboard &rarr;
                </Link>
              </GatedHomeSection>
            </div>
            <HomeLeaderboard />
          </div>
        </div>

        {/* Skills: Strong / Growing / Gaps */}
        <div data-tour="home-skills" className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" />
              <h3 className="font-semibold text-ink dark:text-slate-200">Your Skills</h3>
            </div>
            <GatedHomeSection href="/skill-graph">
              <Link
                href="/skill-graph"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-600 transition-all"
              >
                <GitBranch className="w-4 h-4" />
                View Skill Graph
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </GatedHomeSection>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SkillColumn label="Strong" dotColor="bg-green-500" items={skills.strong} bgClass="bg-green-50 border-green-100" emptyText="Keep learning to build strong skills" />
            <SkillColumn label="Growing" dotColor="bg-cta-500" items={skills.growing} bgClass="bg-cta-50 border-cta-100" emptyText="Try a new topic" />
            <SkillColumn label="Gaps" dotColor="bg-slate-400" items={skills.gaps} bgClass="bg-bg-subtle dark:bg-slate-700 border-slate-200 dark:border-slate-700" emptyText="No gaps identified" />
          </div>
        </div>

        {/* AI News section header */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-start">
            <span className="bg-bg-warm dark:bg-slate-900 pr-4 flex items-center gap-2">
              <Rss className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-ink dark:text-slate-200">AI News</span>
            </span>
          </div>
        </div>

        {/* AI News Feed */}
        <LiveSourcesFeed />
      </main>
      <ImpactAssessmentModal />
    </div>
  );
}

function SkillColumn({ label, dotColor, items, bgClass, emptyText }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-medium text-ink dark:text-slate-200">{label}</span>
        <span className="text-xs text-slate-400">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.length > 0 ? items.map((s, i) => (
          <div key={i} className={`text-sm text-ink dark:text-slate-200 px-3 py-2 rounded-lg border ${bgClass} dark:bg-slate-700 dark:border-slate-600`}>
            {s.length <= 40 ? s : s.substring(0, 37) + '...'}
          </div>
        )) : (
          <div className="text-sm text-slate-400 italic">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

