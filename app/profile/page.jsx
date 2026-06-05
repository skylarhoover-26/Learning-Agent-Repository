'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Zap, Trophy, Star, RotateCcw, Save, Check,
  Building2, Briefcase, Plus, Pencil, X, Loader2,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import { getProfileClient, saveProfile } from '@/lib/profile-client';
import { DEPARTMENTS, SUBTEAMS, getTaskList } from '@/lib/curriculum-data';

const TIER_LABELS = {
  beginner: { label: 'Beginner', emoji: '🌱', color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  practitioner: { label: 'Practitioner', emoji: '🚀', color: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  power_user: { label: 'Power User', emoji: '⚡', color: 'bg-cta-50 text-cta-700 ring-1 ring-cta-200' },
  builder: { label: 'Builder', emoji: '🏗️', color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  developer: { label: 'Developer', emoji: '🛠️', color: 'bg-slate-100 dark:bg-slate-700 text-ink dark:text-slate-200 ring-1 ring-slate-300' },
};

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [editingRole, setEditingRole] = useState(false);
  const [editDept, setEditDept] = useState('');
  const [editSubTeam, setEditSubTeam] = useState(null);
  const [editTopTasks, setEditTopTasks] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [roleSaveStatus, setRoleSaveStatus] = useState('idle');

  useEffect(() => {
    const p = getProfileClient();
    if (!p) {
      router.push('/onboarding');
      return;
    }
    setProfile(p);
    setEditName(p.display_name || '');
  }, [router]);

  function handleSaveName() {
    const trimmed = editName.trim();
    if (!trimmed || !profile) return;
    const updated = { ...profile, display_name: trimmed };
    saveProfile(updated);
    setProfile(updated);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  function handleReset() {
    document.cookie = 'learner_profile=; path=/; max-age=0';
    router.push('/onboarding');
  }

  function handleStartRoleEdit() {
    setEditDept(profile.department || '');
    setEditSubTeam(profile.sub_team || null);
    setEditTopTasks(profile.top_tasks || []);
    setEditingRole(true);
    setRoleSaveStatus('idle');
    setShowCustomInput(false);
    setCustomTask('');
  }

  function handleCancelRoleEdit() {
    setEditingRole(false);
    setShowCustomInput(false);
    setCustomTask('');
  }

  function handleEditDeptChange(dept) {
    setEditDept(dept);
    setEditSubTeam(null);
    setEditTopTasks([]);
    setShowCustomInput(false);
    setCustomTask('');
  }

  function handleEditTaskToggle(task) {
    setEditTopTasks(prev => {
      if (prev.includes(task)) return prev.filter(t => t !== task);
      if (prev.length >= 3) return prev;
      return [...prev, task];
    });
  }

  function handleAddCustomTask() {
    const trimmed = customTask.trim();
    if (trimmed && !editTopTasks.includes(trimmed) && editTopTasks.length < 3) {
      setEditTopTasks(prev => [...prev, trimmed]);
      setCustomTask('');
      setShowCustomInput(false);
    }
  }

  async function handleSaveRole() {
    if (!editDept || editTopTasks.length === 0) return;
    setRoleSaveStatus('saving');
    const needsSubTeam = !!SUBTEAMS[editDept];
    if (needsSubTeam && !editSubTeam) return;
    const updated = {
      ...profile,
      department: editDept,
      sub_team: needsSubTeam ? editSubTeam : null,
      top_tasks: editTopTasks,
    };
    saveProfile(updated);
    setProfile(updated);
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', data: updated }),
      });
    } catch (e) {
      console.error('Failed to persist profile to blob:', e);
    }
    setRoleSaveStatus('saved');
    setEditingRole(false);
    setTimeout(() => setRoleSaveStatus('idle'), 2000);
  }

  const editAvailableTasks = editDept ? getTaskList(editDept, editSubTeam) : [];
  const editAtLimit = editTopTasks.length >= 3;
  const editShowSubTeamPicker = editingRole && editDept && !!SUBTEAMS[editDept];
  const editShowTaskPicker = editingRole && editDept && (!SUBTEAMS[editDept] || editSubTeam);
  const canSaveRole = editDept && editTopTasks.length >= 1 && (!SUBTEAMS[editDept] || editSubTeam);

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
        <PageHeader icon={User} title="Profile" subtitle="Loading..." />
        <div className="max-w-3xl mx-auto px-6 py-12 text-center text-slate-500 dark:text-slate-400">
          Loading profile...
        </div>
      </div>
    );
  }

  const tier = TIER_LABELS[profile.tier] || TIER_LABELS.beginner;
  const initial = (profile.display_name || 'L').charAt(0).toUpperCase();
  const nameChanged = editName.trim() !== profile.display_name;

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader icon={User} title="Profile & Settings" subtitle="Manage your learning profile" />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* A. Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-brand to-brand-700 mb-4">
            <span className="text-4xl font-bold text-white">{initial}</span>
          </div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight mb-1">
            {profile.display_name}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {profile.department}
            {profile.sub_team ? ` — ${profile.sub_team}` : ''}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${tier.color}`}>
              <span>{tier.emoji}</span>
              {tier.label}
            </span>
          </div>
          {profile.goal && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Goal: {profile.goal}
            </p>
          )}
          {profile.onboarded_at && (
            <p className="text-xs text-slate-400">
              Member since {formatDate(profile.onboarded_at)}
            </p>
          )}
        </div>

        {/* B. Edit Name */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-4">Edit Name</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && nameChanged) handleSaveName();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
              placeholder="Your name"
            />
            <button
              onClick={handleSaveName}
              disabled={!nameChanged || !editName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
          {saveStatus === 'saved' && (
            <p className="text-sm text-green-600 mt-2">Name updated successfully.</p>
          )}
        </div>

        {/* B2. Role & Tasks */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink dark:text-slate-200">Role & Tasks</h3>
            {!editingRole && (
              <button
                onClick={handleStartRoleEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand hover:bg-brand-50 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>

          {!editingRole ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-ink dark:text-slate-200 font-medium">
                  {profile.department}
                  {profile.sub_team ? ` — ${profile.sub_team}` : ''}
                </span>
              </div>
              {profile.top_tasks && profile.top_tasks.length > 0 && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {profile.top_tasks.map(task => (
                      <span
                        key={task}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-medium ring-1 ring-brand-200"
                      >
                        {task}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {roleSaveStatus === 'saved' && (
                <p className="text-sm text-green-600 mt-3">Role and tasks updated successfully.</p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Department Picker */}
              <div>
                <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-2">Department</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {DEPARTMENTS.map(dept => (
                    <button
                      key={dept}
                      onClick={() => handleEditDeptChange(dept)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        editDept === dept
                          ? 'bg-brand text-white border-brand shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-ink dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Team Picker */}
              {editShowSubTeamPicker && (
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-2">Team in {editDept}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {SUBTEAMS[editDept].map(team => (
                      <button
                        key={team}
                        onClick={() => { setEditSubTeam(team); setEditTopTasks([]); }}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          editSubTeam === team
                            ? 'bg-brand text-white border-brand shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-ink dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Picker */}
              {editShowTaskPicker && (
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-slate-300 mb-2">
                    Top tasks ({editTopTasks.length}/3)
                  </label>
                  <div className="space-y-1.5">
                    {editAvailableTasks.map(task => {
                      const isSelected = editTopTasks.includes(task);
                      const isDisabled = !isSelected && editAtLimit;
                      return (
                        <button
                          key={task}
                          onClick={() => !isDisabled && handleEditTaskToggle(task)}
                          disabled={isDisabled}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all text-sm ${
                            isSelected
                              ? 'bg-brand text-white border-brand shadow-sm'
                              : isDisabled
                              ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 text-ink dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:bg-brand-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'bg-white dark:bg-slate-800 border-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-brand" />}
                          </div>
                          <span className="font-medium">{task}</span>
                        </button>
                      );
                    })}

                    {editTopTasks.filter(t => !editAvailableTasks.includes(t)).map(task => (
                      <button
                        key={task}
                        onClick={() => handleEditTaskToggle(task)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all text-sm bg-brand text-white border-brand shadow-sm"
                      >
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-white">
                          <Check className="w-3 h-3 text-brand" />
                        </div>
                        <span className="font-medium">{task}</span>
                      </button>
                    ))}

                    {showCustomInput ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customTask}
                          onChange={e => setCustomTask(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTask(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomTask(''); } }}
                          placeholder="Describe your task..."
                          autoFocus
                          className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-sm"
                        />
                        <button
                          onClick={handleAddCustomTask}
                          disabled={!customTask.trim() || editAtLimit}
                          className="px-3 py-2.5 rounded-lg bg-brand text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-brand/90"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setShowCustomInput(false); setCustomTask(''); }}
                          className="px-2.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCustomInput(true)}
                        disabled={editAtLimit}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-dashed text-left transition-all text-sm ${
                          editAtLimit
                            ? 'border-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-200 hover:text-brand hover:bg-brand-50'
                        }`}
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="font-medium">Something else not listed here</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Save / Cancel */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveRole}
                  disabled={!canSaveRole || roleSaveStatus === 'saving'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {roleSaveStatus === 'saving' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save changes</>
                  )}
                </button>
                <button
                  onClick={handleCancelRoleEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* C. Learning Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-4">Learning Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Zap} label="Sessions" value="0" />
            <StatCard icon={Star} label="XP" value="0" />
            <StatCard icon={Trophy} label="Level" value="1" />
            <StatCard icon={Trophy} label="Badges" value="0" />
          </div>
        </div>

        {/* D. Reset / Sign Out */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-ink dark:text-slate-200 mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Resetting your profile will clear all your settings and send you back to onboarding.
          </p>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Profile
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-3">
                Are you sure? This will reset your profile and you'll need to go through onboarding again.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-bg-warm dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 p-4 text-center">
      <Icon className="w-5 h-5 text-brand mx-auto mb-2" />
      <p className="text-2xl font-bold text-ink dark:text-slate-200">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
