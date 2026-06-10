// Helpers for the "My Role" feature: snapshotting the current role + progress,
// applying a new role now, scheduling a future switch, and reverting to a saved
// snapshot. Progress lives client-side (learner-store), so these run in the
// browser. Each "build*" function returns the profile fields to persist via
// the profile provider's updateProfile().

import { getAllData, replaceAllData } from './learner-store';

const MAX_HISTORY = 20;

export function extractRole(profile) {
  return {
    department: profile?.department ?? null,
    sub_team: profile?.sub_team ?? null,
    top_tasks: Array.isArray(profile?.top_tasks) ? profile.top_tasks : [],
    tier: profile?.tier ?? null,
    goal: profile?.goal ?? null,
  };
}

export function roleLabel(role) {
  const parts = [role?.department, role?.tier].filter(Boolean);
  return parts.join(' · ') || 'Role';
}

function makeSnapshot(profile, learnerId) {
  return {
    id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: roleLabel(extractRole(profile)),
    savedAt: new Date().toISOString(),
    role: extractRole(profile),
    progress: learnerId ? getAllData(learnerId) : null,
  };
}

function pushHistory(profile, snapshot, extraFilterId) {
  const prior = (profile?.role_history || []).filter((h) => h.id !== extraFilterId);
  return [snapshot, ...prior].slice(0, MAX_HISTORY);
}

// Apply a new role immediately. Snapshots the current role + progress first so
// it can be reverted later. Progress carries forward (not reset).
export function buildApplyNow(profile, learnerId, newRole) {
  const snapshot = makeSnapshot(profile, learnerId);
  return {
    ...newRole,
    role_history: pushHistory(profile, snapshot),
    scheduled_role_change: null,
    role_changed_at: new Date().toISOString(),
  };
}

// Schedule a future switch — current role stays active until the date.
export function buildSchedule(newRole, effectiveDate) {
  return {
    scheduled_role_change: {
      role: newRole,
      effective_date: effectiveDate,
      created_at: new Date().toISOString(),
    },
  };
}

// Revert to a saved snapshot: restore its role AND its progress, while saving
// the current state as a new snapshot so the move is itself reversible.
export function buildRevert(profile, learnerId, snapshotId) {
  const target = (profile?.role_history || []).find((h) => h.id === snapshotId);
  if (!target) return null;

  if (target.progress && learnerId) {
    replaceAllData(learnerId, target.progress);
  }

  const currentSnapshot = makeSnapshot(profile, learnerId);
  return {
    ...target.role,
    role_history: pushHistory(profile, currentSnapshot, snapshotId),
    scheduled_role_change: null,
    role_changed_at: new Date().toISOString(),
  };
}

// A scheduled change is "due" once its effective date is today or earlier.
export function getDueScheduledChange(profile) {
  const sc = profile?.scheduled_role_change;
  if (!sc || !sc.effective_date) return null;
  const today = new Date().toISOString().slice(0, 10);
  return sc.effective_date <= today ? sc : null;
}

// Apply a due scheduled change (used by the lazy auto-apply on load).
export function buildApplyScheduled(profile, learnerId, scheduled) {
  const snapshot = makeSnapshot(profile, learnerId);
  return {
    ...scheduled.role,
    role_history: pushHistory(profile, snapshot),
    scheduled_role_change: null,
    role_changed_at: new Date().toISOString(),
  };
}
