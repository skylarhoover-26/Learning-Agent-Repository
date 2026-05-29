import Link from 'next/link';
import {
  getCurrentLearner, getLessonHistory, getRecentKnowledge,
  getActiveWorkProjects, getActiveGoals, calculateGoalProgressForGoal,
  getAggregatedSkills, getDueCardsCount, getTotalXp, getLevelProgress,
  getEarnedBadges,
} from '@/lib/data';
import {
  Sparkles, Target, TrendingUp, Flame, BookOpen,
  MessageCircle, Compass, Star, Trophy, ChevronRight,
  Search, Briefcase, Plus, Brain, Award, Zap, Library,
} from 'lucide-react';

const TIER_LABELS = {
  beginner: { label: 'Beginner', emoji: '🌱', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', emoji: '🚀', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', emoji: '⚡', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', emoji: '🏗️', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', emoji: '🛠️', color: 'bg-slate-100 text-ink ring-1 ring-slate-300' },
};

const GOAL_DESCRIPTIONS = {
  basic_tasks: 'Confidently use AI for everyday tasks',
  integrate_daily_workflow: 'Integrate AI into my daily workflow',
  power_user_skills: 'Master advanced prompting & workflows',
  build_custom_solutions: 'Build agents and automations',
  code_with_ai: 'Use AI for coding, MCP, and apps',
  not_sure: "Explore what's possible with AI",
};

function calculateGoalProgress(lessonHistory) {
  return Math.min(100, lessonHistory.length * 10);
}

function calculateStreak(lessonHistory) {
  if (!lessonHistory.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = new Set();
  lessonHistory.forEach((l) => {
    const date = new Date(l.completed_at || l.started_at);
    date.setHours(0, 0, 0, 0);
    dates.add(date.getTime());
  });
  let streak = 0;
  let cursor = new Date(today);
  if (!dates.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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

function shortTopic(t, max = 50) {
  if (!t) return '';
  return t.length <= max ? t : t.substring(0, max - 1) + '…';
}

export default function Dashboard() {
  const learner = getCurrentLearner();

  if (!learner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-card p-12 border border-slate-200">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-ink mb-3">Welcome to AI Learning Platform</h1>
          <p className="text-slate-600 mb-6">
            Your personalized AI learning journey starts here.
          </p>
        </div>
      </div>
    );
  }

  const lessonHistory = getLessonHistory(learner.id);
  const goalProgress = calculateGoalProgress(lessonHistory);
  const streak = calculateStreak(lessonHistory);
  const skills = getSkills(learner.id);
  const lastLesson = lessonHistory[0];
  const recentNews = getRecentKnowledge(7, 3);
  const activeProjects = getActiveWorkProjects(learner.id);
  const activeGoals = getActiveGoals(learner.id).map(g => ({
    ...g,
    progress_percent: calculateGoalProgressForGoal(learner.id, g),
  }));
  const dueCardsCount = getDueCardsCount(learner.id);
  const totalXp = getTotalXp(learner.id);
  const levelProgress = getLevelProgress(totalXp);
  const earnedBadges = getEarnedBadges(learner.id);
  const recentBadges = earnedBadges
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
    .slice(0, 4);

  const tier = TIER_LABELS[learner.tier] || TIER_LABELS.beginner;
  const greeting = learner.display_name || 'there';

  return (
    <div className="min-h-screen">
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-ink mb-2 tracking-tight">
            Welcome back, {greeting}!
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${tier.color}`}>
              <span>{tier.emoji}</span>
              {tier.label}
            </span>
            <span className="text-sm text-slate-600">
              {learner.total_sessions || 0} sessions completed
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cta-50 text-cta-700 ring-1 ring-cta-200">
                <Flame className="w-3.5 h-3.5" />
                {streak} day streak
              </span>
            )}
          </div>
        </div>

        <Link
          href="/achievements"
          className="group block bg-white rounded-2xl shadow-card border border-slate-200 hover:border-brand-200 hover:shadow-card-hover p-6 mb-6 transition-all"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-5 items-center">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cta-400 to-cta-600 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-ink">{levelProgress.level}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  LV
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="font-bold text-ink">Level {levelProgress.level}</h3>
                  <span className="text-sm text-slate-500">· {totalXp.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center gap-3 max-w-md">
                  <div className="flex-1 h-2 bg-bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cta to-cta-600 transition-all duration-500"
                      style={{ width: `${levelProgress.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {levelProgress.xpToNext} XP to L{levelProgress.level + 1}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {recentBadges.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {recentBadges.map(b => (
                      <div
                        key={b.id}
                        className="w-9 h-9 rounded-full bg-cta-50 ring-2 ring-white flex items-center justify-center text-lg shadow-sm"
                        title={`${b.name}: ${b.description}`}
                      >
                        {b.emoji}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-slate-600 hidden sm:block">
                    {earnedBadges.length} {earnedBadges.length === 1 ? 'badge' : 'badges'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">
                  <Award className="w-4 h-4 inline mr-1" />
                  Earn your first badge
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>

        <Link
          href="/discover"
          className="group block bg-brand rounded-2xl text-white shadow-card hover:shadow-card-hover transition-all overflow-hidden relative mb-6"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute right-20 top-20 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute right-8 bottom-4 w-48 h-48 rounded-full bg-white/5" />
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6 p-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-pill mb-4">
                <Sparkles className="w-3 h-3" />
                Start here
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight tracking-tight">
                Find AI for your work
              </h3>
              <p className="text-white/90 mb-5 max-w-2xl">
                Tell me about your day or a task you do regularly. I'll find specific AI opportunities
                you can try today — tied to YOUR actual work, not generic ideas.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-cta text-ink font-semibold rounded-pill shadow-sm group-hover:bg-cta-600 transition-all">
                <Search className="w-4 h-4" />
                Discover what AI can do for you
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center pr-2">
              <div className="w-32 h-32 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Search className="w-14 h-14 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-ink mb-4">Other ways to learn</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction href="/chat" icon={MessageCircle} title="Just Chat" subtitle="Ask me anything" />
            <QuickAction href="/lesson" icon={BookOpen} title="Quick Lesson" subtitle="Pick a topic" />
            <QuickAction href="/library" icon={Library} title="Library" subtitle="Browse use cases" />
            <QuickAction icon={Star} title="Today's Pick" subtitle="Just for you" comingSoon />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <Link
            href="/goals"
            className="group md:col-span-2 bg-white rounded-2xl shadow-card border border-slate-200 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand" />
                <h3 className="font-semibold text-ink">Your Goals</h3>
                <span className="text-xs text-slate-500">({activeGoals.length})</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
            </div>
            {activeGoals.length === 0 ? (
              <div>
                <p className="text-base text-ink mb-3">
                  {GOAL_DESCRIPTIONS[learner.goal] || 'Growing your AI skills'}
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-3 bg-bg-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all duration-500" style={{ width: `${goalProgress}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-ink">{goalProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.slice(0, 2).map(g => (
                  <div key={g.id}>
                    <p className="font-medium text-ink mb-1 truncate">{g.title}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-bg-subtle rounded-full overflow-hidden">
                        <div className="h-full bg-brand transition-all duration-500" style={{ width: `${g.progress_percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-ink w-10 text-right">{g.progress_percent}%</span>
                    </div>
                  </div>
                ))}
                {activeGoals.length > 2 && (
                  <p className="text-xs text-slate-500">+ {activeGoals.length - 2} more</p>
                )}
              </div>
            )}
          </Link>

          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-cta-600" />
              <h3 className="font-semibold text-ink">Current Streak</h3>
            </div>
            <div className="text-5xl font-bold text-ink mb-1">{streak}</div>
            <p className="text-sm text-slate-500">
              {streak > 0 ? `Day${streak > 1 ? 's' : ''} in a row` : 'Start a lesson today!'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-ink">Your Skills</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SkillColumn label="Strong" dotColor="bg-green-500" items={skills.strong} bgClass="bg-green-50 border-green-100" emptyText="Keep learning to build strong skills" />
            <SkillColumn label="Growing" dotColor="bg-cta-500" items={skills.growing} bgClass="bg-cta-50 border-cta-100" emptyText="Try a new topic" />
            <SkillColumn label="Gaps" dotColor="bg-slate-400" items={skills.gaps} bgClass="bg-bg-subtle border-slate-200" emptyText="No gaps identified" />
          </div>
        </div>

        {dueCardsCount > 0 && (
          <Link
            href="/review"
            className="group block bg-gradient-to-r from-brand to-brand-700 rounded-2xl p-6 mb-6 text-white shadow-card hover:shadow-card-hover transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {dueCardsCount} card{dueCardsCount === 1 ? '' : 's'} due for review
                  </h3>
                  <p className="text-sm text-white/85">
                    Reinforce what you learned — active recall makes it stick
                  </p>
                </div>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold shadow-sm group-hover:bg-cta-600 transition-all shrink-0">
                Start review
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        )}

        <Link
          href="/projects"
          className="group block bg-white rounded-2xl shadow-card border border-slate-200 hover:border-brand-200 hover:shadow-card-hover p-6 mb-6 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand" />
              <h3 className="font-semibold text-ink">Your Active Projects</h3>
              <span className="text-xs text-slate-500">({activeProjects.length})</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
          </div>
          {activeProjects.length === 0 ? (
            <div className="bg-bg-subtle border border-dashed border-slate-300 rounded-xl p-5 text-center">
              <p className="text-sm text-slate-600 mb-3">
                Tell me what you're working on, and every lesson will be tailored to your real work.
              </p>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-cta text-ink font-semibold text-sm shadow-sm">
                <Plus className="w-4 h-4" />
                Add your first project
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-bg-warm rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{p.title}</p>
                    {p.description && (
                      <p className="text-sm text-slate-600 truncate">{p.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Link>

        {lastLesson && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-brand" />
                  <h3 className="font-semibold text-ink">Pick up where you left off</h3>
                </div>
                <p className="text-ink mb-1">{shortTopic(lastLesson.topic, 80)}</p>
                <p className="text-xs text-slate-500">
                  Last completed {new Date(lastLesson.completed_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/lesson?topic=${encodeURIComponent(lastLesson.topic)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold hover:bg-cta-600 transition-all shadow-sm"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {recentNews && recentNews.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-brand" />
              <h3 className="font-semibold text-ink">What's new in AI</h3>
            </div>
            <div className="space-y-3">
              {recentNews.map((n, i) => (
                <div key={i} className="border-l-2 border-brand pl-4 py-1">
                  <p className="font-medium text-ink text-sm">{n.title || 'AI update'}</p>
                  <p className="text-sm text-slate-600">{shortTopic(n.summary, 120)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/quests"
          className="group block bg-white rounded-2xl border border-slate-200 hover:border-brand-200 hover:shadow-card-hover shadow-card p-6 mb-6 transition-all"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-cta-50 ring-1 ring-cta-200 flex items-center justify-center text-cta-600 shrink-0">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-lg mb-0.5">Project Quests</h3>
                <p className="text-sm text-slate-600">
                  Build something real in 20–60 minutes. Walk away with a working artifact you can use.
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
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-slate-400">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.length > 0 ? items.map((s, i) => (
          <div key={i} className={`text-sm text-ink px-3 py-2 rounded-lg border ${bgClass}`}>
            {s.length <= 40 ? s : s.substring(0, 37) + '…'}
          </div>
        )) : (
          <div className="text-sm text-slate-400 italic">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, subtitle, comingSoon }) {
  const inner = (
    <div className={`group flex flex-col items-center gap-2 p-4 rounded-xl border transition-all relative h-full ${
      comingSoon
        ? 'bg-bg-subtle border-slate-200 opacity-60 cursor-not-allowed'
        : 'bg-white border-slate-200 hover:border-brand-200 hover:bg-brand-50 hover:shadow-card cursor-pointer'
    }`}>
      {comingSoon && (
        <span className="absolute top-1 right-1 text-[10px] uppercase tracking-wide bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Soon</span>
      )}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        comingSoon ? 'bg-slate-200 text-slate-500' : 'bg-brand-50 text-brand-600 group-hover:bg-brand group-hover:text-white'
      } transition-all`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-ink">{title}</span>
      <span className="text-xs text-slate-500 text-center">{subtitle}</span>
    </div>
  );

  if (comingSoon) return <button disabled className="text-left w-full">{inner}</button>;
  return <Link href={href}>{inner}</Link>;
}
