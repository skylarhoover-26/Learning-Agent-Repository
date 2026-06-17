'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { trackOnboardingComplete } from '@/lib/track';
import { useProfile } from '@/components/profile-provider';
import {
  Sparkles, ChevronRight, ChevronLeft,
  Building2, Zap, Target, Check, Briefcase, Plus, PanelsTopLeft, Star,
} from 'lucide-react';
import {
  DEPARTMENTS, SUBTEAMS, getTaskList,
} from '@/lib/curriculum-data';
import { toolKey, normalizeTool, serializeTools } from '@/lib/ai-tools';
import { useToolCatalog } from '@/components/tool-catalog-provider';
import { TIERS, GOALS } from '@/lib/onboarding-options';

const SUB_TEAMS = SUBTEAMS;

const TOTAL_STEPS = 5;

// No cap — users can add as many tasks as they want (minimum 1).
const MAX_TASKS = Infinity;

export default function OnboardingPage() {
  const { data: session } = useSession();
  const { refreshProfile, profile: existingProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');

  const [department, setDepartment] = useState('');
  const [subTeam, setSubTeam] = useState(null);
  const [showSubTeams, setShowSubTeams] = useState(false);
  const [topTasks, setTopTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [tier, setTier] = useState('');
  const [goals, setGoals] = useState([]);
  // No tool is pre-selected — the learner actively picks the one(s) they use
  // (first entry is the primary). Step 5 requires at least one to finish.
  const [aiTools, setAiTools] = useState([]);
  const [customTool, setCustomTool] = useState('');
  const [addingTool, setAddingTool] = useState(false);

  const availableTasks = department ? getTaskList(department, subTeam) : [];

  const canAdvance = useCallback(() => {
    if (step === 1) {
      if (!department) return false;
      if (SUB_TEAMS[department] && !subTeam) return false;
      return true;
    }
    if (step === 2) return topTasks.length >= 1;
    if (step === 3) return tier.length > 0;
    if (step === 4) return goals.length > 0;
    if (step === 5) return aiTools.length > 0;
    return false;
  }, [step, department, subTeam, topTasks, tier, goals, aiTools]);

  function goNext() {
    if (!canAdvance()) return;
    setDirection('forward');
    setStep(prev => prev + 1);
  }

  function goBack() {
    setDirection('back');
    if (step === 1 && showSubTeams) {
      setShowSubTeams(false);
      setSubTeam(null);
      setDepartment('');
      return;
    }
    if (step <= 1) return;
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
      setStep(2);
    }
  }

  function handleSubTeamSelect(team) {
    setSubTeam(team);
    setTopTasks([]);
    setDirection('forward');
    setStep(2);
  }

  function handleTaskToggle(task) {
    setTopTasks(prev => {
      if (prev.includes(task)) {
        return prev.filter(t => t !== task);
      }
      if (prev.length >= MAX_TASKS) return prev;
      return [...prev, task];
    });
  }

  function handleTierSelect(tierId) {
    setTier(tierId);
  }

  function handleGoalToggle(selectedGoal) {
    setGoals(prev =>
      prev.includes(selectedGoal)
        ? prev.filter(g => g !== selectedGoal)
        : [...prev, selectedGoal]
    );
  }

  function toggleAiTool(choice) {
    const t = normalizeTool(choice);
    const key = toolKey(t);
    setAiTools(prev => {
      const exists = prev.some(x => toolKey(normalizeTool(x)) === key);
      // Allow deselecting freely (even to empty) — the "Start Learning" button
      // stays disabled until at least one tool is picked (see canAdvance).
      if (exists) return prev.filter(x => toolKey(normalizeTool(x)) !== key);
      return [...prev, choice];
    });
  }

  function setPrimaryAiTool(choice) {
    const key = toolKey(normalizeTool(choice));
    setAiTools(prev => [choice, ...prev.filter(x => toolKey(normalizeTool(x)) !== key)]);
  }

  async function addCustomAiTool() {
    const label = customTool.trim();
    if (!label || addingTool) return;
    setCustomTool('');
    setAddingTool(true);
    let extra = {};
    try {
      const res = await fetch('/api/tools/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      });
      if (res.ok) extra = await res.json();
    } catch {
      // fall back to just the name
    }
    toggleAiTool({ id: 'other', label, strengths: extra.strengths || null, url: extra.url || null });
    setAddingTool(false);
  }

  async function handleFinish(selectedGoals) {
    const chosenGoals = selectedGoals || goals;
    const email = session?.user?.email?.toLowerCase() || '';
    // Keep an existing name if one is already set (e.g. demo mode, where the
    // session has no name) instead of blanking it on re-onboarding.
    const name = session?.user?.name || existingProfile?.display_name || '';
    const nameParts = name.split(' ');
    const profile = {
      id: email,
      display_name: name,
      first_name: nameParts[0] || existingProfile?.first_name || '',
      last_name: nameParts.slice(1).join(' ') || existingProfile?.last_name || '',
      email,
      department,
      sub_team: subTeam || null,
      top_tasks: topTasks,
      tier,
      goals: chosenGoals,
      // Keep the legacy single `goal` string in sync (joined) so lesson/AI
      // prompts and other read sites that expect `profile.goal` keep working.
      goal: chosenGoals.join('; '),
      preferred_tools: serializeTools(aiTools),
      onboarded_at: new Date().toISOString(),
    };
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', data: profile }),
      });
      await refreshProfile();
      trackOnboardingComplete(profile);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
    // Hard navigate so both the server render and the client profile context
    // re-read the freshly saved profile (tasks, tier, goal) across the board.
    // Land on the dashboard, where the interactive (driver.js) welcome tour
    // fires — NOT the static /getting-started slide deck.
    window.location.href = '/';
  }

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const displayName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-[17px] leading-tight">
              AI Learning Coach
            </h1>
            <p className="text-xs text-white/60 leading-tight">By Housecall Pro</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-1 bg-bg-subtle dark:bg-slate-700 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between pb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {step} of {TOTAL_STEPS}
            </p>
            {(step > 1 || showSubTeams) && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-brand transition-colors"
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
          {step === 1 && !showSubTeams && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight">
                  Hey {displayName}, let's set up your learning path
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                  This only takes a minute.
                </p>
              </div>
              <StepDepartment
                selected={department}
                onSelect={handleDepartmentSelect}
              />
            </>
          )}
          {step === 1 && showSubTeams && (
            <StepSubTeam
              department={department}
              teams={SUB_TEAMS[department] || []}
              selected={subTeam}
              onSelect={handleSubTeamSelect}
            />
          )}
          {step === 2 && (
            <StepTopTasks
              department={department}
              tasks={availableTasks}
              selected={topTasks}
              onToggle={handleTaskToggle}
              customTask={customTask}
              onCustomTaskChange={setCustomTask}
              showCustomInput={showCustomInput}
              onAddCustomTask={() => {
                const trimmed = customTask.trim();
                if (trimmed && !topTasks.includes(trimmed) && topTasks.length < MAX_TASKS) {
                  setTopTasks(prev => [...prev, trimmed]);
                  setCustomTask('');
                  setShowCustomInput(false);
                }
              }}
              onShowCustomInput={() => setShowCustomInput(true)}
              onHideCustomInput={() => { setShowCustomInput(false); setCustomTask(''); }}
              onNext={goNext}
              canAdvance={canAdvance()}
            />
          )}
          {step === 3 && (
            <StepTier
              selected={tier}
              onSelect={handleTierSelect}
              onNext={goNext}
              canAdvance={tier.length > 0}
            />
          )}
          {step === 4 && (
            <StepGoal
              selected={goals}
              onToggle={handleGoalToggle}
              onNext={goNext}
              canAdvance={goals.length > 0}
            />
          )}
          {step === 5 && (
            <StepTool
              selected={aiTools}
              onToggle={toggleAiTool}
              onSetPrimary={setPrimaryAiTool}
              customTool={customTool}
              onCustomToolChange={setCustomTool}
              onAddCustom={addCustomAiTool}
              adding={addingTool}
              onFinish={() => handleFinish(goals)}
              canAdvance={canAdvance()}
            />
          )}
        </div>
      </main>
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
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          What department are you in?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
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
                : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
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
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          Which team in {department}?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
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
                : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            {team}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTopTasks({ department, tasks, selected, onToggle, customTask, onCustomTaskChange, showCustomInput, onAddCustomTask, onShowCustomInput, onHideCustomInput, onNext, canAdvance }) {
  const atLimit = selected.length >= MAX_TASKS;

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Briefcase className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          What are your top tasks?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Pick the tasks you do most in {department}. We'll personalize your quick wins and learning path.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto mb-6">
        {tasks.map(task => {
          const isSelected = selected.includes(task);
          const isDisabled = !isSelected && atLimit;
          return (
            <button
              key={task}
              onClick={() => !isDisabled && onToggle(task)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : isDisabled
                  ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-100 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? 'bg-white dark:bg-slate-800 border-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
              </div>
              <span className="font-medium text-sm">{task}</span>
            </button>
          );
        })}

        {selected.filter(t => !tasks.includes(t)).map(task => (
          <button
            key={task}
            onClick={() => onToggle(task)}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all bg-brand text-white border-brand shadow-sm"
          >
            <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-white">
              <Check className="w-3.5 h-3.5 text-brand" />
            </div>
            <span className="font-medium text-sm">{task}</span>
          </button>
        ))}

        {showCustomInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTask}
              onChange={e => onCustomTaskChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onAddCustomTask(); if (e.key === 'Escape') onHideCustomInput(); }}
              placeholder="Describe your task..."
              autoFocus
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
            />
            <button
              onClick={onAddCustomTask}
              disabled={!customTask.trim() || atLimit}
              className="px-4 py-3.5 rounded-xl bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
            >
              Add
            </button>
            <button
              onClick={onHideCustomInput}
              className="px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onShowCustomInput}
            disabled={atLimit}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-dashed text-left transition-all ${
              atLimit
                ? 'border-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-200 hover:text-brand hover:bg-brand-50'
            }`}
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">Something else not listed here</span>
          </button>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {selected.length} selected{selected.length === 0 ? ' — pick at least 1' : ''}
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

function StepTier({ selected, onSelect, onNext, canAdvance }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Zap className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          How would you describe your AI experience?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          No wrong answer — this sets your starting point.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto mb-6">
        {TIERS.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
              selected === t.id
                ? 'bg-brand text-white border-brand shadow-sm'
                : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
            }`}
          >
            <span className="text-2xl shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{t.label}</p>
              <p className={`text-sm ${selected === t.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                {t.description}
              </p>
            </div>
            {selected === t.id && (
              <Check className="w-5 h-5 shrink-0" />
            )}
          </button>
        ))}
      </div>
      <div className="text-center">
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

function StepGoal({ selected, onToggle, onNext, canAdvance }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-50 mb-4">
          <Target className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          What are your goals?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Pick everything that fits — we'll tailor your lessons to all of them. You can always change this later.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto mb-6">
        {GOALS.map(g => {
          const isSelected = selected.includes(g);
          return (
            <button
              key={g}
              onClick={() => onToggle(g)}
              aria-pressed={isSelected}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-white/20 border-white/40' : 'border-slate-300 dark:border-slate-600'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{g}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center">
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

function StepTool({ selected, onToggle, onSetPrimary, customTool, onCustomToolChange, onAddCustom, adding, onFinish, canAdvance }) {
  const { catalog } = useToolCatalog();
  const selectedKeys = new Set(selected.map((s) => toolKey(normalizeTool(s))));
  const primaryKey = selected.length ? toolKey(normalizeTool(selected[0])) : null;
  const customSelected = selected.map(normalizeTool).filter((t) => t.id === 'other');
  const rows = [...catalog, ...customSelected];

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <PanelsTopLeft className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          Which AI tools do you use?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
          Pick all that apply — you might use one or several. We&apos;ll tailor lessons to them and tell you when one fits a task better. Star the one to open by default. You can change this anytime.
        </p>
      </div>
      <div className="space-y-2 max-w-lg mx-auto mb-4">
        {rows.map((t) => {
          const key = toolKey(t);
          const isSelected = selectedKeys.has(key);
          const isPrimary = key === primaryKey;
          return (
            <div
              key={key}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <button onClick={() => onToggle(t.id === 'other' ? t : t.id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 border-white/50' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </span>
                <span className="text-2xl shrink-0">{t.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{t.label}</span>
                  {t.strengths && (
                    <span className={`block text-sm ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>Best for {t.strengths}</span>
                  )}
                </span>
              </button>
              {isSelected && (
                <button
                  onClick={() => onSetPrimary(t.id === 'other' ? t : t.id)}
                  title={isPrimary ? 'Primary tool' : 'Set as primary'}
                  aria-label={isPrimary ? 'Primary tool' : 'Set as primary'}
                  className="shrink-0 p-1"
                >
                  <Star className={`w-5 h-5 ${isPrimary ? 'fill-cta text-cta' : 'text-white/70'}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="max-w-lg mx-auto mb-6 flex items-center gap-2">
        <input
          type="text"
          value={customTool}
          onChange={(e) => onCustomToolChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddCustom()}
          placeholder="Add another tool (e.g. Perplexity)"
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-brand"
        />
        <button
          onClick={onAddCustom}
          disabled={!customTool.trim() || adding}
          className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 text-sm font-medium disabled:opacity-40 transition-all"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      <div className="text-center">
        <button
          onClick={onFinish}
          disabled={!canAdvance}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Start Learning
        </button>
      </div>
    </div>
  );
}
