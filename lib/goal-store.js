'use client';

import { saveToBlob } from './sync-store';

const STORAGE_KEY = 'learner_goals';

function getAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(goals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    saveToBlob(STORAGE_KEY, goals);
  } catch {
    // localStorage not available
  }
}

export function getGoals() {
  return getAll();
}

export function getActiveGoals() {
  return getAll().filter(g => g.status === 'active');
}

export function addGoal(title) {
  const goals = getAll();
  const goal = {
    id: `goal_${Date.now()}`,
    title,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  saveAll([...goals, goal]);
  return goal;
}

export function completeGoal(id) {
  const goals = getAll();
  const updated = goals.map(g =>
    g.id === id ? { ...g, status: 'completed', completed_at: new Date().toISOString() } : g
  );
  saveAll(updated);
}

export function deleteGoal(id) {
  const goals = getAll().filter(g => g.id !== id);
  saveAll(goals);
}
