'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '@/components/profile-provider';
import {
  Sparkles, ChevronRight, ChevronLeft, X,
  Zap, BookOpen, Crosshair, BarChart3,
  MessageCircle, Trophy, GraduationCap,
  ArrowRight, Check, Lightbulb,
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    icon: Sparkles,
    title: 'Your Dashboard',
    description: 'This is your home base. It shows your level, streak, recent lessons, goals, and skills at a glance. Everything updates in real time as you learn.',
    tip: 'Check your dashboard daily to see what to work on next.',
    color: 'bg-brand',
  },
  {
    icon: Zap,
    title: 'Quick Wins',
    description: 'Get a ready-to-use AI prompt for your specific role and tasks. Tap Surprise me on the Lesson screen, copy the prompt, try it in your AI tool, and see results in under 5 minutes.',
    tip: 'Start here — it\'s the fastest way to see AI help with your actual work.',
    action: { label: 'Surprise me', href: '/lesson?surprise=1' },
    color: 'bg-cta',
  },
  {
    icon: GraduationCap,
    title: 'Learning Modules',
    description: '5 modules take you from AI foundations to measuring business impact. Each has reading content, interactive activities, and hands-on practice.',
    tip: 'Work through them in order — each builds on the last.',
    action: { label: 'Browse Modules', href: '/modules' },
    color: 'bg-purple-500',
  },
  {
    icon: BookOpen,
    title: 'Interactive Lessons',
    description: 'AI-generated lessons adapt to your department and skill level. The structured lesson player grades your work and shows you how AI would approach the same task differently.',
    tip: 'Each lesson takes 5-10 minutes and earns you 50 XP.',
    action: { label: 'Start a Lesson', href: '/lesson' },
    color: 'bg-green-500',
  },
  {
    icon: Crosshair,
    title: 'Skill Calibration',
    description: '6 real-world scenarios test your judgment on privacy, prompting, communication, and more. Then rate yourself — the gap between what you think and what we measure is the real insight.',
    tip: 'Take this early — it personalizes everything that comes after.',
    action: { label: 'Take the Calibration', href: '/calibration' },
    color: 'bg-indigo-500',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn XP from lessons, maintain streaks for daily learning, unlock badges for milestones, and complete project quests that build real work artifacts.',
    tip: 'Check your achievements page to see what badges you can earn next.',
    action: { label: 'View Achievements', href: '/achievements' },
    color: 'bg-amber-500',
  },
  {
    icon: MessageCircle,
    title: 'AI Chat',
    description: 'Ask any AI question and get a response tailored to your role and department. Use it to brainstorm, draft, analyze, or learn — it\'s your AI companion.',
    tip: 'Try asking: "How can AI help me with [your top task]?"',
    action: { label: 'Open Chat', href: '/chat' },
    color: 'bg-sky-500',
  },
];

export default function GettingStartedPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const { profile } = useProfile();

  useEffect(() => {
    if (profile?.first_name) {
      setDisplayName(profile.first_name);
    } else if (profile?.display_name) {
      setDisplayName(profile.display_name.split(' ')[0]);
    }
  }, [profile]);

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  function markCompleted() {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
  }

  function goNext() {
    markCompleted();
    if (isLast) {
      localStorage.setItem('tutorial_completed', 'true');
      router.push('/');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }

  function skip() {
    localStorage.setItem('tutorial_completed', 'true');
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-[17px] leading-tight">
                Getting Started
              </h1>
              <p className="text-xs text-white/60 leading-tight">Quick tour of the platform</p>
            </div>
          </div>
          <button
            onClick={skip}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            Skip tour
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Progress dots */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-8 bg-brand'
                    : completedSteps.has(i)
                    ? 'w-2 bg-green-400'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
            <span className="ml-auto text-xs text-slate-400">
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div key={currentStep} className="w-full max-w-2xl animate-fade-in">
          {/* Welcome message on first step */}
          {currentStep === 0 && displayName && (
            <div className="text-center mb-6">
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Welcome, <span className="font-semibold text-ink dark:text-slate-200">{displayName}</span>! Here's a quick tour of what you can do.
              </p>
            </div>
          )}

          {/* Step card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <div className={`${step.color} p-6 flex items-center gap-4`}>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {step.title}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-5">
                {step.description}
              </p>

              {/* Tip */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{step.tip}</p>
              </div>

              {/* Action button */}
              {step.action && (
                <Link
                  href={step.action.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition-all"
                >
                  {step.action.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <span />
            )}

            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 transition-all"
            >
              {isLast ? 'Go to Dashboard' : 'Next'}
              {isLast ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
