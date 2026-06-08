'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Play, ChevronRight, ChevronLeft, ArrowRight,
  MessageCircle, BarChart3, BookOpen, Zap,
  Target, Trophy, Crosshair, RefreshCw, Rss,
} from 'lucide-react';

const TOUR_STEPS = [
  {
    title: 'Welcome to AI Learning Platform',
    description: 'A personalized AI learning experience for every employee at Housecall Pro. This tour walks you through the full learner and manager journey in 9 steps.',
    panels: {
      left: { label: 'Slack Bot', content: 'The AI Learning Platform lives in Slack. When an employee DMs the bot for the first time, it starts a 5-minute onboarding conversation.' },
      right: { label: 'Web Dashboard', content: 'The web platform is where employees track progress, take lessons, and explore AI use cases. Managers see team views.' },
    },
    icon: Play,
  },
  {
    title: 'Step 1: Onboarding',
    description: 'New users set up their profile — name, department, sub-team, top tasks, AI experience level, and learning goal. This takes under 2 minutes.',
    panels: {
      left: { label: 'Slack', content: 'Bot asks: "Which team are you on?" and "What are your top 3 tasks?" — shown as tap-to-select buttons. Results are saved to the user\'s profile.' },
      right: { label: 'Web', content: 'Same flow available at /onboarding — department selection, sub-team picker, top tasks (up to 3), experience tier, and goal selection.' },
    },
    icon: MessageCircle,
    link: '/onboarding',
  },
  {
    title: 'Step 2: AI Impact Assessment',
    description: 'Users answer 4 questions across Personal, Team, Org, and AI Development dimensions. Free-text follow-ups are scored by Claude Haiku.',
    panels: {
      left: { label: 'Slack', content: 'Bot asks multiple-choice questions with follow-up free text for top answers. Claude scores responses and builds a P/T/O/D profile.' },
      right: { label: 'Web', content: 'The /scoring page mirrors the same flow. Results show overall impact level (Low/Medium/High) with score bars for each dimension.' },
    },
    icon: BarChart3,
    link: '/scoring',
  },
  {
    title: 'Step 3: Skill Calibration',
    description: '6 scenario-based questions test real judgment (privacy, prompting, communication, evaluation, agents, data). Then users self-rate — the gap is the insight.',
    panels: {
      left: { label: 'Scenarios', content: 'Real HCP situations: data privacy in AI tools, analyzing 200 transcripts, handling a cancellation email, verifying AI-generated policy info.' },
      right: { label: 'Results', content: 'Calibration chart shows Self vs Measured for each skill. Radar chart visualizes the full skill profile. Biggest gaps drive lesson recommendations.' },
    },
    icon: Crosshair,
    link: '/calibration',
  },
  {
    title: 'Step 4: Personalized Quick Wins',
    description: 'Based on department and top tasks, users get curated, ready-to-use AI prompts. ~60 pre-built quick wins across all 20 departments.',
    panels: {
      left: { label: 'How it works', content: 'User picks a task → gets a specific prompt they can copy-paste into Claude or ChatGPT right now. No placeholders — complete and ready to use.' },
      right: { label: 'Example', content: 'A CSM picks "QBR preparation" → gets a prompt that drafts a 45-min agenda with talking points, tailored to their customer\'s industry and goals.' },
    },
    icon: Zap,
    link: '/quick-win',
  },
  {
    title: 'Step 5: Learning Path',
    description: '5 modules from foundations to measuring impact. Each module has reading content, interactive activities, and links to hands-on practice.',
    panels: {
      left: { label: 'Modules', content: 'Module 1: AI Foundations → Module 2: Core Tasks → Module 3: Prompting → Module 4: Building & Automating → Module 5: Measuring Impact' },
      right: { label: 'Structured Lessons', content: 'The 5-step lesson player (Read → Try → Compare → Ship → Reflect) grades submissions via Claude and shows AI tone variants.' },
    },
    icon: BookOpen,
    link: '/modules',
  },
  {
    title: 'Step 6: Gamification & Progress',
    description: 'XP, levels, badges, streaks, quests, spaced repetition, and a department leaderboard keep learners engaged over time.',
    panels: {
      left: { label: 'Earning', content: '50 XP per lesson, streak bonuses, 11 earnable badges. Quests are 20-60 min guided projects that build real artifacts. 10 structured lessons with Claude-graded submissions.' },
      right: { label: 'Tracking', content: 'Dashboard shows live stats, level progress, streak counter, recent lessons, and achievement badges. Data syncs to the cloud so managers can see team progress.' },
    },
    icon: Trophy,
    link: '/achievements',
  },
  {
    title: 'Step 7: Manager Dashboard',
    description: 'Managers look up their team via Snowflake, see AI Impact Competency scores (P/T/O/D with Self + Manager ratings), and track learning progress.',
    panels: {
      left: { label: 'Team View', content: 'Direct reports table from Snowflake. Status badges: On Track, Not Started, Needs Nudge, Completed.' },
      right: { label: 'Competencies', content: 'Color-coded dot pairs for each dimension (1=red → 5=purple). Rate Team button lets managers enter their own scores.' },
    },
    icon: BarChart3,
    link: '/manager',
  },
  {
    title: 'Step 8: 6-Week Check-In',
    description: 'Every 6 weeks, learners re-answer scoring questions. The check-in shows progress deltas and adjusts recommendations.',
    panels: {
      left: { label: 'Flow', content: '2-3 quick questions about personal and team AI usage changes. Optional blocker question if no improvement. Free-text follow-ups scored by Claude.' },
      right: { label: 'Results', content: 'Side-by-side old → new scores with delta arrows. "Nice growth!" or "Focus on Module X next" messaging based on progress.' },
    },
    icon: RefreshCw,
    link: '/checkin',
  },
  {
    title: 'Step 9: Auto-Refresh Pipeline',
    description: 'The curriculum stays current. An automated scanner checks 13 AI news sources daily, Claude generates update proposals, and admins review them behind the scenes.',
    panels: {
      left: { label: 'Scanner', content: 'Fetches RSS from OpenAI, Anthropic, DeepMind, Meta AI, Microsoft AI, Mistral, MIT Tech Review, The Verge, VentureBeat, Hugging Face, arXiv, and Hacker News. Dedupes and stores findings.' },
      right: { label: 'Safety Filter', content: 'Claude reviews every article for content safety — filtering out politics, off-topic content, and anything not work-appropriate before it reaches learners.' },
    },
    icon: Rss,
    link: '/curriculum-pipeline',
  },
];

export default function TourPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Play}
        title="Platform Tour"
        subtitle="9-step walkthrough of the full learner + manager experience"
      />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1 shrink-0 ${i < TOUR_STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === currentStep
                  ? 'bg-brand text-white shadow-sm'
                  : i < currentStep
                  ? 'bg-[#009FDA] text-white'
                  : 'bg-slate-200 text-slate-500 dark:text-slate-400'
              }`}>
                {i + 1}
              </span>
              {i < TOUR_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-4 rounded-full transition-all ${
                  i < currentStep ? 'bg-[#009FDA]' : 'bg-slate-200'
                }`} />
              )}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div key={currentStep} className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <div className="bg-gradient-to-br from-[#00205C] to-brand p-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">{step.title}</h2>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{step.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {step.panels.left.label}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step.panels.left.content}</p>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {step.panels.right.label}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step.panels.right.content}</p>
              </div>
            </div>

            {step.link && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-3 bg-slate-50 dark:bg-slate-800/50">
                <Link
                  href={step.link}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-600 transition-colors"
                >
                  Try it live
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
              >
                Next step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
