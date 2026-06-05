import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getCurrentLearner, getActiveGoals,
  calculateGoalProgressForGoal, getAggregatedSkills,
} from '@/lib/data';
import {
  Sparkles, Target, TrendingUp, BookOpen,
  MessageCircle, ChevronRight, Library,
  Gamepad2, Lightbulb, Trophy, GitBranch, BarChart3,
  ClipboardCheck, Crosshair, GraduationCap, HelpCircle,
} from 'lucide-react';
import MiniHeatmap from '@/components/mini-heatmap';
import { findDoThisNowSkill } from '@/lib/heatmap-data';
import LiveStatsPills from '@/components/live-stats-pills';
import LiveLevelBadges from '@/components/live-level-badges';
import LiveStreakCard from '@/components/live-streak-card';
import LiveRecentLesson from '@/components/live-recent-lesson';

const TIER_LABELS = {
  beginner: { label: 'Beginner', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', color: 'bg-slate-100 text-ink ring-1 ring-slate-300' },
};

const DEPT_LEADERBOARD = [];

const WEEKLY_CHANGES = [];

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
    redirect('/onboarding');
  }

  const skills = getSkills(learner.id);
  const activeGoals = getActiveGoals(learner.id).map(g => ({
    ...g,
    progress_percent: calculateGoalProgressForGoal(learner.id, g),
  }));

  const tier = TIER_LABELS[learner.tier] || TIER_LABELS.beginner;
  const displayName = learner.display_name || 'there';
  const greetingPrefix = getGreetingPrefix();
  const doThisNow = findDoThisNowSkill();
  const userDept = learner.department || 'Customer Success';

  return (
    <div className="min-h-screen">
      {/* 1. Header bar */}
      <header className="bg-ink sticky top-0 z-10 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-[17px] leading-tight">AI Learning Platform</h1>
              <p className="text-xs text-white/60 leading-tight">By Housecall Pro</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-white/90">
            <span>{learner.display_name || learner.slack_handle || 'Learner'}</span>
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm">
              {(learner.display_name || learner.slack_handle || 'L').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 2. Greeting row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">
              {greetingPrefix}, {displayName} — here&apos;s where you stand.
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">{userDept}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tier.color}`}>
                {tier.label}
              </span>
            </div>
          </div>
          <LiveStatsPills />
        </div>

        {/* 3. "Do This Now" hero card */}
        {doThisNow && (
          <Link
            href={`/lesson?topic=${encodeURIComponent(doThisNow.name)}`}
            className="group block bg-gradient-to-br from-brand to-brand-700 rounded-2xl text-white shadow-card hover:shadow-card-hover transition-all overflow-hidden relative"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute right-20 top-20 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute right-8 bottom-4 w-48 h-48 rounded-full bg-white/5" />
            </div>
            <div className="relative p-7">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-3">
                DO THIS NOW &middot; 6 min &middot; adaptive
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-1.5 leading-tight tracking-tight">
                Refresh your {doThisNow.name} — it&apos;s high-mastery but {doThisNow.freshness} days stale.
              </h3>
              <p className="text-white/80 text-sm mb-5 max-w-2xl">
                Picked from your heatmap: this is your highest-value gap.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-ink font-semibold rounded-pill shadow-sm group-hover:bg-cta-600 transition-all">
                  Start refresher
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="flex items-center gap-2 text-sm text-white/70">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  412 in your org started this today
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* 4. Quick actions strip */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          <QuickAction href="/chat" icon={MessageCircle} label="Chat" />
          <QuickAction href="/lesson" icon={BookOpen} label="Lesson" />
          <QuickAction href="/modules" icon={GraduationCap} label="Modules" />
          <QuickAction href="/games" icon={Gamepad2} label="Games" />
          <QuickAction href="/quick-win" icon={Lightbulb} label="Quick Win" />
          <QuickAction href="/library" icon={Library} label="Library" />
          <QuickAction href="/scoring" icon={ClipboardCheck} label="AI Impact" />
          <QuickAction href="/calibration" icon={Crosshair} label="Calibrate" />
          <QuickAction href="/skill-graph" icon={GitBranch} label="Skill Graph" />
          <QuickAction href="/manager" icon={BarChart3} label="Manager" />
          <QuickAction href="/getting-started" icon={HelpCircle} label="Tutorial" />
        </div>

        {/* 5. Mini heatmap */}
        <MiniHeatmap />

        {/* 6. Level + Badges */}
        <LiveLevelBadges />

        {/* 7. Goals + Streak two-column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/goals"
            className="group md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand" />
                <h3 className="font-semibold text-ink dark:text-slate-200">Your Goals</h3>
                <span className="text-xs text-slate-500">({activeGoals.length})</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
            </div>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-slate-500">
                Set a goal to track your progress &rarr;
              </p>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 2).map(g => (
                  <div key={g.id}>
                    <p className="font-medium text-ink dark:text-slate-200 mb-1 truncate">{g.title}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand transition-all duration-500" style={{ width: `${g.progress_percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-ink dark:text-slate-200 w-10 text-right">{g.progress_percent}%</span>
                    </div>
                  </div>
                ))}
                {activeGoals.length > 2 && (
                  <p className="text-xs text-slate-500">+ {activeGoals.length - 2} more</p>
                )}
              </div>
            )}
          </Link>

          <LiveStreakCard />
        </div>

        {/* 8. "What Changed This Week" */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink dark:text-slate-200">What Changed This Week</h3>
            <Link
              href="/curriculum-pipeline"
              className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
            >
              Scan for updates &rarr;
            </Link>
          </div>
          <p className="text-sm text-slate-500 italic">
            No updates yet. Use the Curriculum Pipeline to scan AI news sources and generate updates.
          </p>
        </div>

        {/* 9. Department leaderboard preview */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink dark:text-slate-200">Department Leaderboard</h3>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
            >
              View full leaderboard &rarr;
            </Link>
          </div>
          <p className="text-sm text-slate-500 italic">
            Leaderboard data will appear as team members complete lessons and earn XP.
          </p>
        </div>

        {/* 10. Skills: Strong / Growing / Gaps */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-ink dark:text-slate-200">Your Skills</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SkillColumn label="Strong" dotColor="bg-green-500" items={skills.strong} bgClass="bg-green-50 border-green-100" emptyText="Keep learning to build strong skills" />
            <SkillColumn label="Growing" dotColor="bg-cta-500" items={skills.growing} bgClass="bg-cta-50 border-cta-100" emptyText="Try a new topic" />
            <SkillColumn label="Gaps" dotColor="bg-slate-400" items={skills.gaps} bgClass="bg-bg-subtle border-slate-200" emptyText="No gaps identified" />
          </div>
        </div>

        {/* 11. Recent lesson CTA */}
        <LiveRecentLesson />

        <Link
          href="/quests"
          className="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover shadow-card p-6 transition-all"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-cta-50 dark:bg-slate-700 ring-1 ring-cta-200 dark:ring-slate-600 flex items-center justify-center text-cta-600 shrink-0">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-ink dark:text-slate-200 text-lg mb-0.5">Project Quests</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Build something real in 20-60 minutes. Walk away with a working artifact you can use.
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </Link>
      </main>
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

function QuickAction({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-slate-700 hover:shadow-card transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-400 group-hover:bg-brand group-hover:text-white flex items-center justify-center transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-ink dark:text-slate-200">{label}</span>
    </Link>
  );
}
