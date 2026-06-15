'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import WalkthroughIconButton from '@/components/walkthrough-icon-button';
import { useMenuWalkthrough } from '@/components/use-menu-walkthrough';
import {
  Play, ChevronRight, ChevronLeft, ArrowRight,
  MessageCircle, BarChart3, BookOpen, Zap,
  Target, Trophy, Crosshair, RefreshCw, Rss, Compass,
} from 'lucide-react';

const TOUR_STEPS = [
  {
    title: 'Welcome to AI Learning Coach',
    description: 'A personalized AI learning experience for every employee at Housecall Pro. This tour walks you through the full learner and manager journey, step by step.',
    panels: {
      left: { label: 'Web App', content: 'The web platform is where employees onboard, take lessons, track progress, and explore AI use cases. Managers see team views.' },
      right: {
        label: 'Slack',
        badge: 'Coming soon',
        content: 'The Slack bot isn\'t installed yet. Once it is, you\'ll be able to DM it for quick tips and commands like:',
        commands: [
          { cmd: '/learn [topic]', desc: 'Get a quick AI tip on any topic' },
          { cmd: '/streak', desc: 'Check your learning streak & progress' },
          { cmd: '/heatmap', desc: 'See your knowledge heatmap' },
          { cmd: '/skills', desc: 'View your skill breakdown' },
        ],
      },
    },
    icon: Play,
  },
  {
    title: 'Step 1: Set up your profile',
    description: 'Tell the app a little about your work so it can personalize everything for you. It takes about two minutes.',
    panels: {
      left: {
        label: 'Web App',
        content: 'You\'ll share:',
        bullets: [
          'Your department and team',
          'The tasks you do most (add as few or as many as you want)',
          'How much you\'ve used AI so far',
          'What you\'d like to get better at',
        ],
      },
      right: { label: 'Slack', badge: 'Coming soon', content: 'The Slack bot isn\'t installed yet. Setting up your profile in Slack is planned — for now, do it in the web app.' },
    },
    icon: MessageCircle,
    link: '/onboarding',
  },
  {
    title: 'Step 2: See where AI helps you',
    description: 'A few quick questions show where AI is already helping your work and where it could help more.',
    panels: {
      left: {
        label: 'Web App',
        content: 'What you\'ll do:',
        bullets: [
          'Answer four short questions about your work',
          'Add a sentence or two where it helps',
          'Get a simple Low, Medium, or High read on your AI impact',
        ],
      },
      right: { label: 'Slack', badge: 'Coming soon', content: 'The Slack bot isn\'t installed yet, so this runs in the web app for now. Quick tips and progress checks will come to Slack later.' },
    },
    icon: BarChart3,
    link: '/scoring',
  },
  {
    title: 'Step 3: Check your AI skills',
    description: 'Compare how your AI skills actually hold up against how confident you feel. The gap shows you where to focus.',
    panels: {
      left: {
        label: 'What you\'ll do',
        bullets: [
          'Work through six real work situations, like keeping data private or writing a tricky email',
          'Rate how confident you feel in each area',
        ],
      },
      right: {
        label: 'What you get',
        bullets: [
          'A clear picture of your strengths and gaps',
          'Lesson suggestions aimed at your biggest gaps',
        ],
      },
    },
    icon: Crosshair,
    link: '/calibration',
  },
  {
    title: 'Step 4: Get quick wins',
    description: 'Ready-to-use AI prompts for the exact tasks you do, so you can try something useful right away.',
    panels: {
      left: {
        label: 'How it works',
        bullets: [
          'Pick a task you do often',
          'Get a complete prompt you can paste into AI chat',
          'No blanks to fill in, it\'s ready to go',
        ],
      },
      right: { label: 'For example', content: 'Pick "prep for a customer meeting" and get a prompt that drafts a full agenda with talking points, tailored to that customer.' },
    },
    icon: Zap,
    link: '/quick-win',
  },
  {
    title: 'Step 5: Follow your learning path',
    description: 'A step-by-step path from AI basics to using it confidently in your day-to-day work.',
    panels: {
      left: {
        label: 'The five steps',
        bullets: [
          'Start with the basics',
          'Use AI for your core tasks',
          'Learn to write better prompts',
          'Build and automate your work',
          'Measure your impact',
        ],
      },
      right: { label: 'How lessons work', content: 'Each lesson walks you through reading something, trying it yourself, and getting instant feedback on what you wrote.' },
    },
    icon: BookOpen,
    link: '/modules',
  },
  {
    title: 'Step 6: Earn points and track progress',
    description: 'Earn points and badges, keep a streak going, and watch your progress add up over time.',
    panels: {
      left: {
        label: 'Ways to earn',
        bullets: [
          'Points for every lesson you finish',
          'Bonuses for keeping a daily streak',
          'Badges for hitting milestones',
          'Quests: short guided projects that build something real',
        ],
      },
      right: { label: 'Track your progress', content: 'Your dashboard shows your level, streak, recent lessons, and badges, all in one place.' },
    },
    icon: Trophy,
    link: '/achievements',
  },
  {
    title: 'Step 7: For managers',
    description: 'If you manage a team, see how everyone is progressing and where to lend a hand.',
    panels: {
      left: {
        label: 'Your team at a glance',
        bullets: [
          'See each person\'s progress',
          'Spot who\'s on track and who could use a nudge',
        ],
      },
      right: { label: 'Support your team', content: 'Score your team on AI skills and use it to guide your coaching and recognition.' },
    },
    icon: BarChart3,
    link: '/manager',
  },
  {
    title: 'Step 8: Check in every six weeks',
    description: 'Every six weeks, a quick check-in shows how far you\'ve come and what to focus on next.',
    panels: {
      left: {
        label: 'The check-in',
        bullets: [
          'A couple of quick questions about how your AI use has changed',
          'Takes just a minute or two',
        ],
      },
      right: { label: 'What you see', content: 'Your old and new scores side by side, plus a suggestion for what to work on next.' },
    },
    icon: RefreshCw,
    link: '/checkin',
  },
  {
    title: 'Step 9: Always up to date',
    description: 'The content keeps itself fresh, so what you learn stays in step with how fast AI changes.',
    panels: {
      left: {
        label: 'Always current',
        bullets: [
          'Scans trusted AI news every day',
          'Drafts updates to lessons automatically',
          'A person reviews every change before it goes live',
        ],
      },
      right: { label: 'Safe and on-topic', content: 'Everything is checked to keep it work-appropriate and relevant before it reaches you.' },
    },
    icon: Rss,
    link: '/curriculum-pipeline',
  },
];

// One column of a step card. A label, an optional intro line, then optional
// layered lists: `bullets` (simple points) or `commands` (Slack command chips).
function Panel({ panel }) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {panel.label}
        </p>
        {panel.badge && (
          <span className="px-1.5 py-0.5 rounded-full bg-cta-100 dark:bg-cta-700/25 text-cta-700 dark:text-cta-200 text-[10px] font-semibold uppercase tracking-wide">
            {panel.badge}
          </span>
        )}
      </div>
      {panel.content && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{panel.content}</p>
      )}
      {panel.bullets && (
        <ul className="mt-3 space-y-2">
          {panel.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      )}
      {panel.commands && (
        <ul className="mt-3 space-y-2">
          {panel.commands.map(item => (
            <li key={item.cmd} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
              <code className="shrink-0 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-brand dark:text-brand-200 text-xs font-mono">
                {item.cmd}
              </code>
              <span className="leading-snug">{item.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TourPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const startMenuWalkthrough = useMenuWalkthrough();
  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={Play}
        title="Platform Tour"
        subtitle="A guided walkthrough of the full learner + manager experience"
        iconButton={<WalkthroughIconButton />}
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
              <Panel panel={step.panels.left} />
              <Panel panel={step.panels.right} />
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
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentStep < TOUR_STEPS.length - 1 && (
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-brand transition-colors"
              >
                Skip tour
              </Link>
            )}
            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
              >
                Next step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={startMenuWalkthrough}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all"
                >
                  <Compass className="w-4 h-4" />
                  Walk me through the menu
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
