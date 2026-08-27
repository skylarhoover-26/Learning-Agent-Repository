'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { trackOnboardingComplete } from '@/lib/track';
import { useProfile } from '@/components/profile-provider';
import {
  Sparkles, ChevronRight, ChevronLeft,
  Building2, Zap, Target, Check, Briefcase, Plus, PanelsTopLeft, Smile, FolderKanban,
} from 'lucide-react';
import {
  DEPARTMENTS, SUBTEAMS, getTaskList,
} from '@/lib/curriculum-data';
import { toolKey, normalizeTool, serializeTools, TOOL_CATEGORIES } from '@/lib/ai-tools';
import { useToolCatalog } from '@/components/tool-catalog-provider';
import { TIERS, GOALS } from '@/lib/onboarding-options';
import { resolveTaskAdd, normalizeTaskText, taskNoticeText } from '@/lib/task-input';
import { addBadgeEarned } from '@/lib/learner-store';
import { isCalibrationPending } from '@/lib/calibration-local';
import { useAssessmentConfig } from '@/lib/use-assessment-config';
import AvatarLocker from '@/components/avatar-locker';
import { DEFAULT_AVATAR } from '@/lib/avatar-catalog';

const SUB_TEAMS = SUBTEAMS;

const TOTAL_STEPS = 7;

// Onboarding auto-save: partial progress is stored here so someone who leaves
// mid-setup drops back exactly where they were. Cleared when onboarding finishes.
//
// v2: step 6 is now Projects and the avatar moved to 7, so a v1 draft's saved
// step number no longer means what it used to. Bumping the key retires those
// drafts instead of dropping someone onto the wrong screen — and it clears the
// v1 leftovers that survived a profile reset and made an already-saved task
// impossible to re-add.
const DRAFT_KEY = 'onboarding_draft_v2';
const LEGACY_DRAFT_KEYS = ['onboarding_draft_v1'];

// During onboarding everyone is level 1, so only level-1 items are unlockable.
const ONBOARDING_AVATAR_CTX = { level: 1, badgeIds: new Set() };

// No cap — users can add as many tasks as they want (minimum 1).
const MAX_TASKS = Infinity;

// Minimum tasks before Continue unlocks. Was 1, which quietly capped the quality
// of every personalized surface downstream: a one-task profile gives Discovery a
// one-line "typical day", makes all four Games "Surprise me" topics rewordings of
// the same task, and narrows chat suggestions. Three is the point where those
// start reading like a real job. Safe to require — the smallest task list any
// department/sub-team offers is 5, and learners can add their own on top.
const MIN_TASKS = 3;

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
  // Feedback for the custom-task input: {kind: 'duplicate'|'selected', task}.
  // Without this a duplicate add was a silent no-op.
  const [taskNotice, setTaskNotice] = useState(null);
  const [customGoal, setCustomGoal] = useState('');
  const [showCustomGoalInput, setShowCustomGoalInput] = useState(false);
  const [tier, setTier] = useState('');
  const [goals, setGoals] = useState([]);
  // No tool is pre-selected — the learner actively picks the one(s) they use
  // (first entry is the primary). Step 5 requires at least one to finish.
  const [aiTools, setAiTools] = useState([]);
  const [customTool, setCustomTool] = useState('');
  const [addingTool, setAddingTool] = useState(false);
  // Step 6: the real work someone is doing right now. Weighted next to tasks and
  // goals by every generator (lib/learner-signals.js), so it's worth asking for up
  // front rather than hoping people find /projects later. Optional in what it
  // stores, but it does require an answer — see canAdvance.
  const [projects, setProjects] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  // "I don't have one right now" — an explicit answer, so an empty list is a
  // decision we can see rather than a step that was silently walked past.
  const [noProjects, setNoProjects] = useState(false);
  // Whether the calibration gate is still ahead of this person, which decides
  // whether the last step reads "Continue setup" or "Finish setup" (#135).
  // Resolved in an effect, not during render: isCalibrationPending reads
  // localStorage, and reading it inline would hydrate-mismatch the button label.
  const [calibrationPending, setCalibrationPending] = useState(true);
  // ...and whether the placement quiz is switched on at all. An admin can turn
  // the whole gate off in /admin/onboarding-quiz, and then there IS no next step
  // — promising "a short calibration" sends people looking for a screen that
  // never comes (#234). Mounted here, at the top of the flow, so the answer has
  // long arrived by the time anyone clicks through to step 7.
  const { config: assessmentConfig, loading: assessmentLoading } = useAssessmentConfig();
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  // A restored draft's avatar is an explicit prior choice — don't override it
  // with the Slack-photo default below.
  const draftHadAvatarRef = useRef(false);

  // Snowflake-sourced prefill (title/manager/hireDate carried onto the saved
  // profile; department/sub-team pre-select the step-1 choices when valid).
  const [prefill, setPrefill] = useState(null);
  // Single source of truth for step 1's view so the department picker can ONLY
  // appear as a final decision — never mid-flight (that was the flash: a timer
  // dropped the loader while the lookup was still running, briefly showing the
  // picker before the confirm card).
  //   'loading' → spinner while we look you up
  //   'confirm' → the "does this look right?" card (Snowflake matched)
  //   'manual'  → the department picker (not matched, lookup failed, or editing)
  const [phase, setPhase] = useState('loading');
  const prefillFetched = useRef(false);
  // Gates the auto-save effect so it doesn't overwrite a saved draft with the
  // default state before the mount effect has restored (or the lookup resolved).
  const readyRef = useRef(false);

  // On mount, look the signed-in user up in the org data and pre-fill what we
  // can. Best-effort: an unlisted email, a failure, or a >15s timeout drops to
  // the manual flow. We never leave 'loading' until the lookup truly resolves,
  // so the picker can't flash before the card.
  useEffect(() => {
    if (prefillFetched.current) return;
    prefillFetched.current = true;

    // Retire drafts from before the step numbering changed (and before a profile
    // reset stopped leaving one behind).
    try {
      LEGACY_DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }

    // Resume a saved draft if one exists for this user — restore everything and
    // skip the Snowflake lookup (they've already moved past step 1).
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const sameUser = !d?.email || !session?.user?.email
          || d.email === session.user.email.toLowerCase();
        if (d && typeof d === 'object' && sameUser) {
          if (typeof d.step === 'number') setStep(d.step);
          if (typeof d.department === 'string') setDepartment(d.department);
          if ('subTeam' in d) setSubTeam(d.subTeam);
          if (typeof d.showSubTeams === 'boolean') setShowSubTeams(d.showSubTeams);
          if (Array.isArray(d.topTasks)) setTopTasks(d.topTasks);
          if (typeof d.tier === 'string') setTier(d.tier);
          if (Array.isArray(d.goals)) setGoals(d.goals);
          if (Array.isArray(d.aiTools)) setAiTools(d.aiTools);
          if (Array.isArray(d.projects)) setProjects(d.projects);
          if (typeof d.noProjects === 'boolean') setNoProjects(d.noProjects);
          if (d.avatar) { setAvatar(d.avatar); draftHadAvatarRef.current = true; }
          if (d.prefill) setPrefill(d.prefill);
          setPhase(d.phase || (d.department ? 'confirm' : 'manual'));
          readyRef.current = true;
          return; // resumed — don't re-run the lookup
        }
      }
    } catch { /* ignore a malformed draft */ }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    (async () => {
      try {
        const res = await fetch('/api/me/profile-prefill', { signal: controller.signal });
        const p = res.ok ? await res.json() : null;
        if (p?.found) {
          setPrefill({
            name: p.name || null,
            title: p.title || null,
            manager: p.manager || null,
            hireDate: p.hireDate || null,
            department: p.department || null, // raw Snowflake value (for display)
            subTeam: p.subTeam || null,
          });
          if (p.department && DEPARTMENTS.includes(p.department)) {
            setDepartment(p.department);
            // Pre-fill the sub-team when valid, but DON'T jump to the sub-team
            // picker — the confirm card shows it, and handleConfirmDetails routes
            // to the picker only if it's missing.
            if (SUB_TEAMS[p.department] && p.subTeam && SUB_TEAMS[p.department].includes(p.subTeam)) {
              setSubTeam(p.subTeam);
            }
            setPhase('confirm');
            return;
          }
        }
        setPhase('manual');
      } catch {
        setPhase('manual');
      } finally {
        clearTimeout(timer);
        readyRef.current = true;
      }
    })();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // Auto-save the draft on every change, once the initial restore/lookup is done.
  useEffect(() => {
    if (!readyRef.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        email: session?.user?.email?.toLowerCase() || null,
        step, department, subTeam, showSubTeams, topTasks, tier, goals, aiTools, projects, noProjects, avatar, phase, prefill,
      }));
    } catch { /* storage unavailable */ }
  }, [step, department, subTeam, showSubTeams, topTasks, tier, goals, aiTools, projects, noProjects, avatar, phase, prefill, session]);

  // Everyone's default avatar is their Slack profile photo. Fetch it once on
  // mount and switch the avatar into photo mode — UNLESS a restored draft
  // already carries an explicit choice (a photo they kept, or a character they
  // started building). If they have no custom Slack photo, we quietly leave the
  // cartoon default in place. They can still flip to Character on the avatar step.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/slack-photo')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !data.imageUrl) return;
        if (draftHadAvatarRef.current) return;
        setAvatar((prev) => (
          // Only default it while still pristine — never clobber a character the
          // user has already started customizing.
          prev === DEFAULT_AVATAR ? { mode: 'photo', photo_url: data.imageUrl } : prev
        ));
      })
      .catch(() => { /* no Slack photo — keep the cartoon default */ });
    return () => { cancelled = true; };
  }, []);

  // Resolve "is calibration still ahead of me?" on the client, where
  // localStorage is readable. Re-runs if the profile arrives after mount.
  useEffect(() => {
    setCalibrationPending(
      isCalibrationPending(existingProfile, session?.user?.email)
    );
  }, [existingProfile, session?.user?.email]);

  // "Is there actually another step after this one?" — both halves have to be
  // true: the person still owes us a calibration AND the quiz is switched on.
  // While the switches are still loading we answer no, so a disabled quiz can
  // never flash a promise of a step that isn't coming.
  const calibrationAhead = calibrationPending
    && !assessmentLoading
    && assessmentConfig.quiz_enabled;

  const availableTasks = department ? getTaskList(department, subTeam) : [];

  const canAdvance = useCallback(() => {
    if (step === 1) {
      if (!department) return false;
      if (SUB_TEAMS[department] && !subTeam) return false;
      return true;
    }
    if (step === 2) return topTasks.length >= MIN_TASKS;
    if (step === 3) return tier.length > 0;
    if (step === 4) return goals.length > 0;
    if (step === 5) return aiTools.length > 0;
    // Projects stay optional, but the step now needs an ANSWER: either a project,
    // or "I don't have one right now". A required field would just manufacture junk
    // ("various", "my job") and that string becomes the worked example in every
    // lesson — worse than empty, since a project outranks tasks as an example source.
    if (step === 6) return projects.length > 0 || noProjects;
    if (step === 7) return true; // avatar always valid (starts on defaults)
    return false;
    // projects/noProjects belong here for the same reason as every other answer:
    // without them this callback keeps the value it had when the step opened, so
    // adding a project would leave Continue disabled with no way to un-stick it.
  }, [step, department, subTeam, topTasks, tier, goals, aiTools, projects, noProjects]);

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

  // Confirm the Snowflake-detected details from step 1's summary card. If their
  // department needs a sub-team and we didn't pre-fill one, send them to pick it;
  // otherwise jump straight to top tasks.
  function handleConfirmDetails() {
    if (SUB_TEAMS[department] && !subTeam) {
      setDirection('forward');
      setShowSubTeams(true);
    } else {
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
    // The notice points at a specific task; once they touch the list it's stale.
    setTaskNotice(null);
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
    toggleAiTool({ id: 'other', label, strengths: extra.strengths || null, url: extra.url || null, emoji: extra.emoji || null });
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
      avatar,
      // Snowflake-sourced context (kept for the manager dashboard / compare).
      title: prefill?.title || existingProfile?.title || null,
      manager: prefill?.manager || existingProfile?.manager || null,
      hire_date: prefill?.hireDate || existingProfile?.hire_date || null,
      onboarded_at: new Date().toISOString(),
    };
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', data: profile }),
      });
      // Projects are their own user-data key (the same one /projects writes), not
      // a profile field. Only written when they actually added something, so
      // skipping the step can never wipe projects added earlier.
      if (projects.length > 0) {
        await fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'work_projects', data: projects }),
        });
      }
      await refreshProfile();
      // First learning goal set → award the "Aim High" badge.
      if (profile.id && chosenGoals.length > 0) addBadgeEarned(profile.id, 'first_goal');
      trackOnboardingComplete(profile);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
    // Onboarding complete — clear the saved draft so a fresh start next time.
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
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
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div
          key={`${step}-${showSubTeams}`}
          // The tools step lays eleven options out in two columns, so it gets more
          // room. Every other step is a short single column and stays narrow —
          // widening them all would leave long lines of text to track across.
          className={`w-full animate-fade-in ${step === 5 ? 'max-w-4xl' : 'max-w-2xl'}`}
        >
          {step === 1 && !showSubTeams && phase === 'loading' && (
            <OnboardingPrefillLoading />
          )}
          {step === 1 && !showSubTeams && phase === 'confirm' && (
            <StepConfirmDetails
              displayName={displayName}
              prefill={prefill}
              department={department}
              subTeam={subTeam}
              onConfirm={handleConfirmDetails}
            />
          )}
          {step === 1 && !showSubTeams && phase === 'manual' && (
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
            <>
              {prefill && (
                <PrefillBanner prefill={prefill} />
              )}
              <StepSubTeam
                department={department}
                teams={SUB_TEAMS[department] || []}
                selected={subTeam}
                onSelect={handleSubTeamSelect}
              />
            </>
          )}
          {step === 2 && (
            <StepTopTasks
              department={department}
              tasks={availableTasks}
              selected={topTasks}
              onToggle={handleTaskToggle}
              customTask={customTask}
              onCustomTaskChange={value => { setCustomTask(value); setTaskNotice(null); }}
              showCustomInput={showCustomInput}
              taskNotice={taskNotice}
              onAddCustomTask={() => {
                if (topTasks.length >= MAX_TASKS) return;
                const result = resolveTaskAdd({
                  typed: customTask,
                  selected: topTasks,
                  available: availableTasks,
                });
                if (result.status === 'empty') return;
                if (result.status === 'duplicate') {
                  // Keep the text and the input open — they can reword it into a
                  // distinct task instead of wondering why Add did nothing.
                  setTaskNotice({ kind: 'duplicate', task: result.match });
                  return;
                }
                setTopTasks(result.tasks);
                setCustomTask('');
                setShowCustomInput(false);
                setTaskNotice(result.status === 'selected' ? { kind: 'selected', task: result.match } : null);
              }}
              onShowCustomInput={() => { setShowCustomInput(true); setTaskNotice(null); }}
              onHideCustomInput={() => { setShowCustomInput(false); setCustomTask(''); setTaskNotice(null); }}
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
              customGoal={customGoal}
              onCustomGoalChange={setCustomGoal}
              showCustomGoalInput={showCustomGoalInput}
              onAddCustomGoal={() => {
                const trimmed = customGoal.trim();
                if (trimmed && !goals.includes(trimmed)) {
                  handleGoalToggle(trimmed);
                  setCustomGoal('');
                  setShowCustomGoalInput(false);
                }
              }}
              onShowCustomGoalInput={() => setShowCustomGoalInput(true)}
              onHideCustomGoalInput={() => { setShowCustomGoalInput(false); setCustomGoal(''); }}
            />
          )}
          {step === 5 && (
            <StepTool
              selected={aiTools}
              onToggle={toggleAiTool}
              customTool={customTool}
              onCustomToolChange={setCustomTool}
              onAddCustom={addCustomAiTool}
              adding={addingTool}
              onNext={goNext}
              canAdvance={canAdvance()}
            />
          )}
          {step === 6 && (
            <StepProjects
              projects={projects}
              title={projectTitle}
              description={projectDesc}
              onTitleChange={setProjectTitle}
              onDescriptionChange={setProjectDesc}
              onAdd={() => {
                const t = projectTitle.trim();
                if (!t) return;
                setNoProjects(false); // they do have one after all
                if (projects.some((p) => p.title.toLowerCase() === t.toLowerCase())) {
                  setProjectTitle('');
                  setProjectDesc('');
                  return;
                }
                setProjects(prev => [...prev, {
                  // No Date.now(): a stable id from the title keeps this
                  // deterministic and is enough to key a list this small.
                  id: `proj_${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
                  title: t,
                  description: projectDesc.trim(),
                  status: 'active',
                }]);
                setProjectTitle('');
                setProjectDesc('');
              }}
              onRemove={(id) => setProjects(prev => prev.filter(p => p.id !== id))}
            />
          )}
          {step === 7 && (
            <StepAvatar
              avatar={avatar}
              onChange={setAvatar}
              onFinish={() => handleFinish(goals)}
            />
          )}

          {/* Shared bottom navigation: Back sits next to the primary action.
              Step 6 (projects) stays optional — canAdvance returns true with an
              empty list — but the button reads "Continue" like every other step.
              It said "Skip for now", which advertised skipping the step instead of
              inviting people to fill it in. The step's own copy already tells them
              it's optional and can be done later from My Projects. */}
          {step >= 2 && step <= 6 && (
            <div className="mt-8">
              <StepNav
                onBack={goBack}
                onNext={goNext}
                disabled={!canAdvance()}
                alt={step === 6 && projects.length === 0
                  ? { label: "I don't have one right now", onClick: () => { setNoProjects(true); goNext(); } }
                  : null}
              />
            </div>
          )}
          {/* "Finish setup" was a lie whenever calibration was still pending:
              the button handed you straight to the ~13-step calibration gate
              (feedback #135). Say "Continue setup" and name what's coming, so
              the last onboarding step doesn't read as the last step overall.
              The reverse is just as wrong: with the placement quiz switched off
              this IS the last step, so "Up next" pointed at nothing (#234). */}
          {step === 7 && (
            <div className="mt-8">
              <StepNav
                onBack={goBack}
                onNext={() => handleFinish(goals)}
                label={calibrationAhead ? 'Continue setup' : 'Finish setup'}
                variant="finish"
              />
              {calibrationAhead && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
                  Up next: a short calibration so your lessons start at the right level.
                </p>
              )}
            </div>
          )}
          {step === 1 && showSubTeams && (
            <div className="mt-8">
              <StepNav onBack={goBack} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Shared bottom nav: a "Back" button paired with the step's primary action, so
// Back gets its own button next to Continue instead of a link up in the header.
// Omit onNext to render a Back-only footer (e.g. the sub-team picker, which
// advances on selection).
// `alt` is an optional second way forward, shown beside the primary action — used
// by the projects step, where "I don't have one right now" is a real answer rather
// than a skip. Keeping it in the nav (not buried in the step body) is the point:
// the choice has to be as visible as Continue, or it's just a hidden skip again.
function StepNav({ onBack, onNext, disabled = false, label = 'Continue', variant = 'default', alt = null }) {
  const primaryClass = variant === 'finish'
    ? 'inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
    : 'inline-flex items-center gap-2 px-8 py-3 rounded-pill bg-cta text-ink font-semibold shadow-sm hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all';
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-pill border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>
      {alt && (
        <button
          type="button"
          onClick={alt.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-pill border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          {alt.label}
        </button>
      )}
      {onNext && (
        <button type="button" onClick={onNext} disabled={disabled} className={primaryClass}>
          {variant === 'finish' && <Sparkles className="w-4 h-4" />}
          {label}
          {variant !== 'finish' && <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

function PrefillBanner({ prefill }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-3">
      <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
        We pulled your details from your Housecall Pro profile
        {prefill?.title ? <> — <span className="font-semibold">{prefill.title}</span></> : ''}
        {prefill?.manager ? <>, reporting to <span className="font-semibold">{prefill.manager}</span></> : ''}.
        {' '}Confirm the department below or pick another if it's not right.
      </p>
    </div>
  );
}

function OnboardingPrefillLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 rounded-md bg-brand animate-pulse" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Getting your details…</p>
    </div>
  );
}

function StepConfirmDetails({ displayName, prefill, department, subTeam, onConfirm }) {
  const rows = [
    { label: 'Name', value: prefill?.name },
    { label: 'Title', value: prefill?.title },
    { label: 'Department', value: department },
    { label: 'Team', value: subTeam },
    { label: 'Manager', value: prefill?.manager },
  ].filter((r) => r.value);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <Sparkles className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          Welcome, {displayName}!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          We pulled these details straight from your Housecall Pro profile.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 mb-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{r.label}</span>
            <span className="text-sm font-semibold text-ink dark:text-slate-200 text-right">{r.value}</span>
          </div>
        ))}
      </div>

      {/* These come from the HCP/Namely record and can't be edited here — if
          they're wrong, it has to be corrected at the source, so point people to
          HCP Help rather than letting them type over it (which would drift from
          reporting). */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        This comes straight from your Housecall Pro record, so it isn&rsquo;t editable here. If your
        name, title, team, or manager looks wrong, let us know in{' '}
        <a
          href="https://housecall.slack.com/archives/C02CDBABC1M"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand hover:underline"
        >
          #hcp_help
        </a>{' '}
        and we&rsquo;ll get it corrected.
      </p>

      <button
        onClick={onConfirm}
        className="w-full flex items-center justify-center gap-2 bg-brand text-white font-semibold rounded-xl px-6 py-3 hover:bg-brand-600 transition-colors"
      >
        Continue
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

function StepTopTasks({ department, tasks, selected, onToggle, customTask, onCustomTaskChange, showCustomInput, taskNotice, onAddCustomTask, onShowCustomInput, onHideCustomInput, onNext, canAdvance }) {
  const atLimit = selected.length >= MAX_TASKS;
  // Ring the task they just tried to re-add, so "already on your list" points at
  // something instead of being a claim they have to go hunting for.
  const highlightKey = taskNotice?.task ? normalizeTaskText(taskNotice.task) : null;
  const isHighlighted = task => !!highlightKey && normalizeTaskText(task) === highlightKey;
  const noticeText = taskNoticeText(taskNotice);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Briefcase className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          What are your top tasks?
        </h2>
        {/* #202: the minimum was getting skimmed past, so it's bolded and
            underlined rather than sitting flat in the sentence. */}
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Pick <strong className="font-bold text-ink dark:text-slate-200 underline decoration-2 underline-offset-2">at least {MIN_TASKS} tasks</strong>
          {' '}you do most in {department} — the more you add, the more your
          lessons, examples and games get built around your actual work.
        </p>
        {/* Continue stays disabled until MIN_TASKS, so say how many are left rather
            than leaving a dead button unexplained. */}
        {selected.length < MIN_TASKS && (
          <p className="text-sm font-semibold text-brand mt-2">
            {selected.length === 0
              ? `Pick ${MIN_TASKS} to continue`
              : `${MIN_TASKS - selected.length} more to continue`}
          </p>
        )}
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
              } ${isHighlighted(task) ? 'ring-2 ring-cta ring-offset-2 dark:ring-offset-slate-900' : ''}`}
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
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all bg-brand text-white border-brand shadow-sm ${
              isHighlighted(task) ? 'ring-2 ring-cta ring-offset-2 dark:ring-offset-slate-900' : ''
            }`}
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

        {noticeText && (
          <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300 px-1">
            {noticeText}
          </p>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {/* Was hardcoded to "pick at least 1", which contradicted the MIN_TASKS
              requirement stated at the top of the very same step. */}
          {selected.length} selected{selected.length < MIN_TASKS ? ` — pick at least ${MIN_TASKS}` : ''}
        </p>
        {/* Continue moved to the shared bottom nav (StepNav). */}
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
        {/* Continue moved to the shared bottom nav (StepNav). */}
      </div>
    </div>
  );
}

function StepGoal({ selected, onToggle, customGoal, onCustomGoalChange, showCustomGoalInput, onAddCustomGoal, onShowCustomGoalInput, onHideCustomGoalInput }) {
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

        {/* Custom goals the user added that aren't in the preset list. */}
        {selected.filter(g => !GOALS.includes(g)).map(g => (
          <button
            key={g}
            onClick={() => onToggle(g)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all bg-brand text-white border-brand shadow-sm"
          >
            <div className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 bg-white/20 border-white/40">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{g}</p>
            </div>
          </button>
        ))}

        {showCustomGoalInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customGoal}
              onChange={e => onCustomGoalChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onAddCustomGoal(); if (e.key === 'Escape') onHideCustomGoalInput(); }}
              placeholder="Describe your goal..."
              autoFocus
              className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
            />
            <button
              onClick={onAddCustomGoal}
              disabled={!customGoal.trim()}
              className="px-4 py-3.5 rounded-xl bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
            >
              Add
            </button>
            <button
              onClick={onHideCustomGoalInput}
              className="px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onShowCustomGoalInput}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-left transition-all hover:border-brand-200 hover:text-brand hover:bg-brand-50"
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">Something else not listed here</span>
          </button>
        )}
      </div>
    </div>
  );
}

function StepTool({ selected, onToggle, customTool, onCustomToolChange, onAddCustom, adding, onNext, canAdvance }) {
  const { catalog } = useToolCatalog();
  const selectedKeys = new Set(selected.map((s) => toolKey(normalizeTool(s))));
  const customSelected = selected.map(normalizeTool).filter((t) => t.id === 'other');
  // Grouped, because the categories are not interchangeable — see lib/ai-tools.
  // Most people tick one or two from the top group and skim the rest, and the
  // headings are what stop "Vapi" reading as an alternative to ChatGPT.
  // Anything the catalog doesn't categorise, plus the learner's own typed-in
  // tools, lands under Specialist rather than being dropped.
  const groups = TOOL_CATEGORIES.map((c) => ({
    ...c,
    items: catalog.filter((t) => (t.category || 'specialist') === c.id),
  })).filter((g) => g.items.length);
  const customGroup = customSelected.length
    ? [{ id: 'yours', label: 'Added by you', hint: '', items: customSelected }]
    : [];
  const rowGroups = [...groups, ...customGroup];

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <PanelsTopLeft className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          Which tools do you use to work with AI?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
          Pick anything you use to work with AI — we&apos;ll match each lesson to the right one of yours.
        </p>
      </div>
      <div className="space-y-5 max-w-3xl mx-auto mb-4">
        {rowGroups.map((group) => (
          <div key={group.id}>
            <div className="px-1 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{group.label}</p>
              {group.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{group.hint}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.items.map((t) => {
          const key = toolKey(t);
          const isSelected = selectedKeys.has(key);
          return (
            <div
              key={key}
              className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
              }`}
            >
              <button onClick={() => onToggle(t.id === 'other' ? t : t.id)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-white/20 border-white/50' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </span>
                <span className="text-xl shrink-0 leading-none mt-0.5">{t.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{t.label}</span>
                  {t.strengths && (
                    <span className={`block text-xs leading-snug mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>Best for {t.strengths}</span>
                  )}
                </span>
              </button>
            </div>
          );
            })}
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-3xl mx-auto mb-6 flex items-center gap-2">
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
        {/* Continue moved to the shared bottom nav (StepNav). */}
      </div>
    </div>
  );
}

// Step 6 — the real work in flight. Optional: plenty of people arrive without a
// named project, and a required step here would be a wall in front of the app.
// What they DO add carries the same weight as their tasks and goals in every
// generated lesson, which is why it's asked for here rather than left to a page
// most people never open.
function StepProjects({ projects, title, description, onTitleChange, onDescriptionChange, onAdd, onRemove }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-50 mb-4">
          <FolderKanban className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          What are you working on right now?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Add a project or two and your lessons will use them as the worked example
          instead of a made-up scenario. Nothing in flight right now? Say so below —
          you can always add one later from My Projects.
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-2 mb-6">
        {projects.map(project => (
          <div
            key={project.id}
            className="w-full flex items-start gap-3 px-5 py-3.5 rounded-xl border bg-brand text-white border-brand shadow-sm"
          >
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-sm">{project.title}</span>
              {project.description && (
                <span className="block text-xs text-white/80">{project.description}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onRemove(project.id)}
              aria-label={`Remove ${project.title}`}
              className="text-white/80 hover:text-white text-xs font-medium shrink-0"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-2">
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
            placeholder="Project name (e.g. Q3 onboarding revamp)"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
          />
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
            placeholder="What it involves (optional)"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!title.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
          >
            <Plus className="w-4 h-4" />
            Add project
          </button>
        </div>
      </div>
    </div>
  );
}

function StepAvatar({ avatar, onChange, onFinish }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cta-50 mb-4">
          <Smile className="w-7 h-7 text-cta-700" />
        </div>
        <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1 tracking-tight">
          Your profile picture
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
          By default we use your Slack photo. Prefer a custom character? Switch to <span className="font-semibold">Character</span> to build one — you&apos;ll unlock more looks (outfits, hats, sidekicks) as you level up. Change it anytime in your profile.
        </p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-6">
        <AvatarLocker value={avatar} onChange={onChange} ctx={ONBOARDING_AVATAR_CTX} />
      </div>
      {/* Start Learning moved to the shared bottom nav (StepNav, finish variant). */}
    </div>
  );
}
