'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ChevronRight, ChevronLeft, User,
  Building2, Zap, Target, Check, Briefcase,
} from 'lucide-react';
import { saveProfile, generateLearnerId } from '@/lib/profile-client';
import {
  DEPARTMENTS, SUBTEAMS, getTaskList,
} from '@/lib/curriculum-data';

const SUB_TEAMS = SUBTEAMS;

const TIERS = [
  {
    id: 'beginner',
    label: 'Beginner',
    emoji: '🌱',
    description: "I'm new to AI — not sure where to start",
  },
  {
    id: 'practitioner',
    label: 'Practitioner',
    emoji: '🚀',
    description: "I've used ChatGPT or similar tools a few times",
  },
  {
    id: 'power_user',
    label: 'Power User',
    emoji: '⚡',
    description: 'I use AI regularly in my work',
  },
  {
    id: 'builder',
    label: 'Builder',
    emoji: '🏗️',
    description: 'I build workflows and automations with AI',
  },
  {
    id: 'developer',
    label: 'Developer',
    emoji: '🛠️',
    description: 'I write code with AI and build AI-powered tools',
  },
];

const GOALS = [
  'Confidently use AI for everyday tasks',
  'Integrate AI into my daily workflow',
  'Master advanced prompting & workflows',
  'Build agents and automations',
  'Use AI for coding and apps',
  "Explore what's possible",
];

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [subTeam, setSubTeam] = useState(null);
  const [showSubTeams, setShowSubTeams] = useState(false);
  const [topTasks, setTopTasks] = useState([]);
  const [tier, setTier] = useState('');
  const [goal, setGoal] = useState('');

  const availableTasks = department ? getTaskList(department, subTeam) : [];

  const canAdvance = useCallback(() => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) {
      if (!department) return false;
      if (SUB_TEAMS[department] && !subTeam) return false;
      return true;
    }
    if (step === 3) return topTasks.length >= 1;
    if (step === 4) return tier.length > 0;
    if (step === 5) return goal.length > 0;
    return false;
  }, [step, name, department, subTeam, topTasks, tier, goal]);

  function goNext() {
    if (!canAdvance()) return;
    setDirection('forward');
    setStep(prev => prev + 1);
  }

  function goBack() {
    if (step <= 1) return;
    setDirection('back');
    if (step === 2 && showSubTeams) {
      setShowSubTeams(false);
      setSubTeam(null);
      return;
    }
    setStep(prev => prev - 1);
  }

  function handleDepartmentSelect(dept) {
    setDepartment(dept);
    setSubTeam(null);
    setTopTasks([]);
    if (SUB_TEAMS[dept]) {
      setShowSubTeams(true);
    } else {
      setShowSubTeams(false);
      setDirection('forward');
      setStep(3);
    }
  }

  function handleSubTeamSelect(team) {
    setSubTeam(team);
    setTopTasks([]);
    setDirection('forward');
    setStep(3);
  }

  function handleTaskToggle(task) {
    setTopTasks(prev => {
      if (prev.includes(task)) {
        return prev.filter(t => t !== task);
      }
      if (prev.length >= 3) return prev;
      return [...prev, task];
    });
  }

  function handleTierSelect(tierId) {
    setTier(tierId);
    setDirection('forward');
    setStep(5);
  }

  function handleGoalSelect(selectedGoal) {
    setGoal(selectedGoal);
    handleFinish(selectedGoal);
  }

  function handleFinish(selectedGoal) {
    const profile = {
      id: generateLearnerId(),
      display_name: name.trim(),
      department,
      sub_team: subTeam || null,
      top_tasks: topTasks,
      tier,
      goal: selectedGoal || goal,
      onboarded_at: new Date().toISOString(),
    };
    saveProfile(profile);
    window.location.href = '/';
  }

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      {/* Header */}
      <header className="bg-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-[17px] leading-tight">
              AI Learning Platform
            </h1>
            <p className="text-xs text-white/60 leading-tight">By Housecall Pro</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs text-slate-500">
              Step {step} of {TOTAL_STEPS}
            </p>
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div
          key={`${step}-${showSubTeams}`}
          className="w-full max-w-2xl animate-fade-in"
        >
          {step === 1 && (
            <StepWelcome
              name={name}
              onNameChange={setName}
              onNext={goNext}
              canAdvance={canAdvance()}
            />
          )}
          {step === 2 && !showSubTeams && (
            <StepDepartment
              selected={department}
              onSelect={handleDepartmentSelect}
            />
          )}
          {step === 2 && showSubTeams && (
            <StepSubTeam
              department={department}
              teams={SUB_TEAMS[department] || []}
              selected={subTeam}
              onSelect={handleSubTeamSelect}
            />
          )}
          {step === 3 && (
            <StepTopTasks
              department={department}
              tasks={availableTasks}
              selected={topTasks}
              onToggle={handleTaskToggle}
              onNext={goNext}
              canAdvance={canAdvance()}
            />
          )}
          {step === 4 && (
            <StepTier
              selected={tier}
              onSelect={handleTierSelect}
            />
          )}
          {step === 5 && (
            <StepGoal
              selected={goal}
              onSelect={handleGoalSelect}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Step Components ---------- */

function StepWelcome({ name, onNameChange, onNext, canAdvance }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && canAdvance) {
      onNext();
    }
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand mb-6 shadow-card">
        <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
      </div>
      <h2 className="text-3xl font-bold text-ink mb-2 tracking-tight">
        Welcome to the AI Learning Platform
      </h2>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        Your personalized journey to mastering AI starts here. Let's get to know you.
      </p>
      <div className="max-w-sm mx-auto mb-6">
        <label htmlFor="name-input" className="block text-sm font-medium text-ink mb-2 text-left">
          What's your name?
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your first name"
            autoFocus
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-base"
          />
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!canAdvance}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Get Started
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepDepartment({ selected, onSelect }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <Building2 className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-1 tracking-tight">
          What department are you in?
        </h2>
        <p className="text-slate-600 text-sm">
          We'll tailor your learning path to your team's needs.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => onSelect(dept)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              selected === dept
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-white text-ink border-slate-200 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepSubTeam({ department, teams, selected, onSelect }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <Building2 className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-1 tracking-tight">
          Which team in {department}?
        </h2>
        <p className="text-slate-600 text-sm">
          This helps us find the most relevant AI use cases for you.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
        {teams.map(team => (
          <button
            key={team}
            onClick={() => onSelect(team)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              selected === team
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-white text-ink border-slate-200 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            {team}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTopTasks({ department, tasks, selected, onToggle, onNext, canAdvance }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Briefcase className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-1 tracking-tight">
          What are your top tasks?
        </h2>
        <p className="text-slate-600 text-sm">
          Pick up to 3 tasks you do most in {department}. We'll personalize your quick wins and learning path.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto mb-6">
        {tasks.map(task => {
          const isSelected = selected.includes(task);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={task}
              onClick={() => !isDisabled && onToggle(task)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : isDisabled
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                  : 'bg-white text-ink border-slate-200 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? 'bg-white border-white'
                  : 'border-slate-300'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
              </div>
              <span className="font-medium text-sm">{task}</span>
            </button>
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 mb-4">
          {selected.length}/3 selected{selected.length === 0 ? ' — pick at least 1' : ''}
        </p>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StepTier({ selected, onSelect }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Zap className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-1 tracking-tight">
          How would you describe your AI experience?
        </h2>
        <p className="text-slate-600 text-sm">
          No wrong answer — this sets your starting point.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto">
        {TIERS.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
              selected === t.id
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-white text-ink border-slate-200 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            <span className="text-2xl shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{t.label}</p>
              <p className={`text-sm ${selected === t.id ? 'text-white/80' : 'text-slate-500'}`}>
                {t.description}
              </p>
            </div>
            {selected === t.id && (
              <Check className="w-5 h-5 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepGoal({ selected, onSelect }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-50 mb-4">
          <Target className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-1 tracking-tight">
          What's your main goal?
        </h2>
        <p className="text-slate-600 text-sm">
          Pick what excites you most — you can always change it later.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto">
        {GOALS.map(g => (
          <button
            key={g}
            onClick={() => onSelect(g)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
              selected === g
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-white text-ink border-slate-200 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{g}</p>
            </div>
            {selected === g && (
              <Check className="w-5 h-5 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
