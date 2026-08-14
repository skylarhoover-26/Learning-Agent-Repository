'use client';

import { useState } from 'react';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { DEPARTMENTS, SUBTEAMS, getTaskList } from '@/lib/curriculum-data';
import { TIERS, GOALS } from '@/lib/onboarding-options';
import { extractRole, roleLabel, buildApplyNow, buildSchedule, buildRevert } from '@/lib/role-manager';
import { resolveTaskAdd, normalizeTaskText, taskNoticeText } from '@/lib/task-input';
import {
  Building2, Briefcase, Target, Zap, Check, Calendar, History, Plus, Pencil, RotateCcw, Loader2,
} from 'lucide-react';

// Everything the standalone /my-role page did, as a card that lives on /profile.
//
// The two pages had drifted into an awkward split: /profile could edit department,
// sub-team and tasks, while /my-role could ALSO do experience level, goals,
// scheduling a change for a future date, and reverting to a previous role. Same
// subject, two places, different capabilities — so which page you happened to open
// decided what you were allowed to change. This is the union of both, and /my-role
// now redirects here.
//
// Rendered as sibling cards (status, scheduled banner, role card, history) so it
// drops into /profile's existing `space-y-6` stack and matches the other cards.

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function RoleManagerCard() {
  const { profile, updateProfile } = useProfile();
  const refreshProgression = useProgression()?.refresh;

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const [department, setDepartment] = useState('');
  const [subTeam, setSubTeam] = useState(null);
  const [topTasks, setTopTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [taskNotice, setTaskNotice] = useState(null);
  const [tier, setTier] = useState('');
  const [goals, setGoals] = useState([]);
  const [applyMode, setApplyMode] = useState('now');
  const [effectiveDate, setEffectiveDate] = useState('');

  if (!profile) return null;

  const role = extractRole(profile);
  const history = profile.role_history || [];
  const scheduled = profile.scheduled_role_change;
  const today = new Date().toISOString().slice(0, 10);
  const availableTasks = department ? getTaskList(department, subTeam) : [];
  const hasSubteams = !!SUBTEAMS[department];
  const canSave =
    department && (!hasSubteams || subTeam) && topTasks.length >= 1 && tier && goals.length >= 1 &&
    (applyMode === 'now' || !!effectiveDate);

  const highlightKey = taskNotice?.task ? normalizeTaskText(taskNotice.task) : null;
  const isTaskHighlighted = (task) => !!highlightKey && normalizeTaskText(task) === highlightKey;
  const taskNoticeLine = taskNoticeText(taskNotice);

  function startEdit() {
    setDepartment(role.department || '');
    setSubTeam(role.sub_team || null);
    setTopTasks(role.top_tasks || []);
    setTier(role.tier || '');
    setGoals(role.goals || []);
    setApplyMode('now');
    setEffectiveDate('');
    setStatus(null);
    setTaskNotice(null);
    setEditing(true);
  }

  function selectDepartment(dept) {
    setDepartment(dept);
    setSubTeam(null);
    setTopTasks([]);
    setTaskNotice(null);
  }

  function toggleTask(t) {
    setTopTasks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setTaskNotice(null);
  }

  function toggleGoal(g) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function addCustomTask() {
    const result = resolveTaskAdd({ typed: customTask, selected: topTasks, available: availableTasks });
    if (result.status === 'empty') return;
    if (result.status === 'duplicate') {
      setTaskNotice({ kind: 'duplicate', task: result.match });
      return;
    }
    setTopTasks(result.tasks);
    setCustomTask('');
    setTaskNotice(result.status === 'selected' ? { kind: 'selected', task: result.match } : null);
  }

  async function handleSave() {
    if (!canSave || busy) return;
    setBusy(true);
    setStatus(null);
    const newRole = {
      department,
      sub_team: hasSubteams ? subTeam : null,
      top_tasks: topTasks,
      tier,
      goals,
      // Keep the legacy single `goal` string in sync (joined) for the lesson/AI
      // prompt read sites that expect `profile.goal`.
      goal: goals.join('; '),
    };
    try {
      if (applyMode === 'schedule') {
        await updateProfile(buildSchedule(newRole, effectiveDate));
        setStatus('scheduled');
      } else {
        await updateProfile(buildApplyNow(profile, profile.id, newRole));
        setStatus('applied');
      }
      setEditing(false);
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  async function handleRevert(snapshotId) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const fields = buildRevert(profile, profile.id, snapshotId);
      if (fields) {
        await updateProfile(fields);
        refreshProgression?.();
        setStatus('reverted');
      }
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  async function cancelScheduled() {
    if (busy) return;
    setBusy(true);
    try {
      await updateProfile({ scheduled_role_change: null });
      setStatus(null);
    } catch {
      setStatus('error');
    }
    setBusy(false);
  }

  const tierLabel = TIERS.find((t) => t.id === role.tier)?.label || role.tier || '—';

  return (
    <>
      {status === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
          Something went wrong. Please try again.
        </div>
      )}
      {status === 'applied' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
          Role updated. Your lessons and suggestions are now tailored to it.
        </div>
      )}
      {status === 'scheduled' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
          Role change scheduled. It will switch automatically on the date you chose.
        </div>
      )}
      {status === 'reverted' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400">
          Switched back — your role and progress from that point are restored.
        </div>
      )}

      {scheduled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Scheduled switch to {roleLabel(scheduled.role)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Takes effect {formatDate(scheduled.effective_date)}
                {scheduled.effective_date <= today ? ' (applying on next load)' : ''}.
              </p>
            </div>
          </div>
          <button
            onClick={cancelScheduled}
            disabled={busy}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline shrink-0 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink dark:text-slate-200">Role &amp; Tasks</h3>
          {!editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand hover:bg-brand-50 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Change role
            </button>
          )}
        </div>

        {!editing ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-ink dark:text-slate-200 font-medium">
                {role.department || '—'}{role.sub_team ? ` — ${role.sub_team}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-ink dark:text-slate-200">{tierLabel}</span>
            </div>
            {role.goals?.length > 0 && (
              <div className="flex items-start gap-2 mb-3">
                <Target className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {role.goals.map((g) => (
                    <span key={g} className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium ring-1 ring-brand-200">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {role.top_tasks?.length > 0 && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {role.top_tasks.map((task) => (
                    <span key={task} className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium ring-1 ring-brand-200">
                      {task}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              Changing your role saves your current role and progress so you can switch back anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <Section title="Department">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEPARTMENTS.map((d) => (
                  <Chip key={d} active={department === d} onClick={() => selectDepartment(d)}>{d}</Chip>
                ))}
              </div>
            </Section>

            {hasSubteams && (
              <Section title="Team">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBTEAMS[department].map((t) => (
                    <Chip key={t} active={subTeam === t} onClick={() => { setSubTeam(t); setTopTasks([]); }}>{t}</Chip>
                  ))}
                </div>
              </Section>
            )}

            {department && (!hasSubteams || subTeam) && (
              <Section title={`Top tasks (${topTasks.length})`}>
                <div className="space-y-2">
                  {availableTasks.map((t) => (
                    <OptionRow key={t} active={topTasks.includes(t)} highlight={isTaskHighlighted(t)} onClick={() => toggleTask(t)}>{t}</OptionRow>
                  ))}
                  {topTasks.filter((t) => !availableTasks.includes(t)).map((t) => (
                    <OptionRow key={t} active highlight={isTaskHighlighted(t)} onClick={() => toggleTask(t)}>{t}</OptionRow>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTask}
                      onChange={(e) => { setCustomTask(e.target.value); setTaskNotice(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTask(); } }}
                      placeholder="Add your own task…"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
                    />
                    <button
                      onClick={addCustomTask}
                      disabled={!customTask.trim()}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {taskNoticeLine && (
                    <p role="status" className="text-xs font-medium text-amber-700 dark:text-amber-300 px-1">
                      {taskNoticeLine}
                    </p>
                  )}
                </div>
              </Section>
            )}

            <Section title="Experience level">
              <div className="space-y-2">
                {TIERS.map((t) => (
                  <OptionRow key={t.id} active={tier === t.id} onClick={() => setTier(t.id)}>
                    <span className="mr-2">{t.emoji}</span>{t.label} <span className="text-slate-400">— {t.description}</span>
                  </OptionRow>
                ))}
              </div>
            </Section>

            <Section title="Goals">
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <OptionRow key={g} active={goals.includes(g)} onClick={() => toggleGoal(g)}>{g}</OptionRow>
                ))}
                {goals.filter((g) => !GOALS.includes(g)).map((g) => (
                  <OptionRow key={g} active onClick={() => toggleGoal(g)}>{g}</OptionRow>
                ))}
              </div>
            </Section>

            <Section title="When should this take effect?">
              <div className="flex flex-col sm:flex-row gap-3">
                <Chip active={applyMode === 'now'} onClick={() => setApplyMode('now')}>Apply now</Chip>
                <Chip active={applyMode === 'schedule'} onClick={() => setApplyMode('schedule')}>Schedule for a date</Chip>
                {applyMode === 'schedule' && (
                  <input
                    type="date"
                    min={today}
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
                  />
                )}
              </div>
            </Section>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={!canSave || busy}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-pill bg-brand text-white font-medium hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {applyMode === 'schedule' ? 'Schedule change' : 'Apply now'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="font-semibold text-ink dark:text-slate-200">Previous roles</h3>
          </div>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-ink dark:text-slate-200">{h.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saved {formatDate(h.savedAt)}</p>
                </div>
                <button
                  onClick={() => handleRevert(h.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Switch back
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Switching back restores that role and your progress from when it was saved.
          </p>
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}

function OptionRow({ active, onClick, highlight = false, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left text-sm transition-all ${
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
      } ${highlight ? 'ring-2 ring-cta ring-offset-2 dark:ring-offset-slate-900' : ''}`}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? 'bg-white border-white' : 'border-slate-300 dark:border-slate-600'}`}>
        {active && <Check className="w-3 h-3 text-brand" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}
