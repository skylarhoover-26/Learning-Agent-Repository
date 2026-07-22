'use client';

import { useState } from 'react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { DEPARTMENTS, SUBTEAMS, getTaskList } from '@/lib/curriculum-data';
import { TIERS, GOALS } from '@/lib/onboarding-options';
import {
  extractRole, roleLabel, buildApplyNow, buildSchedule, buildRevert,
} from '@/lib/role-manager';
import {
  UserCog, Check, Calendar, History, Plus, RotateCcw, Loader2,
} from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MyRolePage() {
  return <CinematicFrame><MyRolePageInner /></CinematicFrame>;
}

function MyRolePageInner() {
  const { profile, updateProfile } = useProfile();
  const refreshProgression = useProgression()?.refresh;

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const [department, setDepartment] = useState('');
  const [subTeam, setSubTeam] = useState(null);
  const [topTasks, setTopTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [tier, setTier] = useState('');
  const [goals, setGoals] = useState([]);
  const [applyMode, setApplyMode] = useState('now');
  const [effectiveDate, setEffectiveDate] = useState('');

  if (!profile) {
    return (
      <div className="min-h-screen">
        <PageHeader icon={UserCog} title="My Role" subtitle="Update your role and tailor your experience" />
        <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">Loading…</main>
      </div>
    );
  }

  const role = extractRole(profile);
  const history = profile.role_history || [];
  const scheduled = profile.scheduled_role_change;
  const today = new Date().toISOString().slice(0, 10);
  const availableTasks = department ? getTaskList(department, subTeam) : [];
  const hasSubteams = !!SUBTEAMS[department];
  const canSave =
    department && (!hasSubteams || subTeam) && topTasks.length >= 1 && tier && goals.length >= 1 &&
    (applyMode === 'now' || !!effectiveDate);

  function startEdit() {
    setDepartment(role.department || '');
    setSubTeam(role.sub_team || null);
    setTopTasks(role.top_tasks || []);
    setTier(role.tier || '');
    setGoals(role.goals || []);
    setApplyMode('now');
    setEffectiveDate('');
    setStatus(null);
    setEditing(true);
  }

  function selectDepartment(dept) {
    setDepartment(dept);
    setSubTeam(null);
    setTopTasks([]);
  }

  function toggleTask(t) {
    setTopTasks((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleGoal(g) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function addCustomTask() {
    const v = customTask.trim();
    if (v && !topTasks.includes(v)) {
      setTopTasks((prev) => [...prev, v]);
      setCustomTask('');
    }
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
      // Keep the legacy single `goal` string in sync (joined) for lesson/AI
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

  return (
    <div className="min-h-screen">
      <PageHeader icon={UserCog} title="My Role" subtitle="Update your role and tailor your experience" />
      <main className="max-w-3xl mx-auto px-6 pt-6 pb-10 space-y-6">
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

        {/* Scheduled change banner */}
        {scheduled && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Scheduled switch to {roleLabel(scheduled.role)}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Takes effect {formatDate(scheduled.effective_date)}{scheduled.effective_date <= today ? ' (applying on next load)' : ''}.
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

        {/* Current role */}
        {!editing && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink dark:text-slate-200">Current role</h2>
              <button
                onClick={startEdit}
                className="px-4 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-600 transition-all"
              >
                Change role
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="Department" value={role.department || '—'} />
              {role.sub_team && <Row label="Team" value={role.sub_team} />}
              <Row label="Experience" value={TIERS.find((t) => t.id === role.tier)?.label || role.tier || '—'} />
              <div>
                <dt className="text-slate-500 dark:text-slate-400 mb-1.5">Goals</dt>
                <dd className="flex flex-wrap gap-2">
                  {role.goals?.length
                    ? role.goals.map((g) => (
                        <span key={g} className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-slate-200 text-xs">
                          {g}
                        </span>
                      ))
                    : <span className="text-slate-400">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400 mb-1.5">Top tasks</dt>
                <dd className="flex flex-wrap gap-2">
                  {(role.top_tasks || []).map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-brand-50 dark:bg-slate-700 text-brand-700 dark:text-slate-200 text-xs">
                      {t}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-400">
              Changing your role saves your current role and progress so you can switch back anytime.
            </p>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 space-y-6">
            <h2 className="text-lg font-bold text-ink dark:text-slate-200">Change your role</h2>

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
                    <TaskRow key={t} active={topTasks.includes(t)} onClick={() => toggleTask(t)}>{t}</TaskRow>
                  ))}
                  {topTasks.filter((t) => !availableTasks.includes(t)).map((t) => (
                    <TaskRow key={t} active onClick={() => toggleTask(t)}>{t}</TaskRow>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTask}
                      onChange={(e) => setCustomTask(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTask(); } }}
                      placeholder="Add your own task…"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand"
                    />
                    <button onClick={addCustomTask} disabled={!customTask.trim()} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Section>
            )}

            <Section title="Experience level">
              <div className="space-y-2">
                {TIERS.map((t) => (
                  <TaskRow key={t.id} active={tier === t.id} onClick={() => setTier(t.id)}>
                    <span className="mr-2">{t.emoji}</span>{t.label} <span className="text-slate-400">— {t.description}</span>
                  </TaskRow>
                ))}
              </div>
            </Section>

            <Section title="Goals">
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <TaskRow key={g} active={goals.includes(g)} onClick={() => toggleGoal(g)}>{g}</TaskRow>
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
              <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Role history */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h2 className="text-lg font-bold text-ink dark:text-slate-200">Previous roles</h2>
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
      </main>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-ink dark:text-slate-200 font-medium text-right">{value}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{title}</h3>
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

function TaskRow({ active, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left text-sm transition-all ${
        active
          ? 'bg-brand text-white border-brand'
          : disabled
            ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-100 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
      }`}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? 'bg-white border-white' : 'border-slate-300 dark:border-slate-600'}`}>
        {active && <Check className="w-3 h-3 text-brand" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}
