'use client';

import { saveToBlob } from './sync-store';

const MODULE_KEY = 'learner_module_state';

function getAllState() {
  try {
    const raw = localStorage.getItem(MODULE_KEY);
    return raw ? JSON.parse(raw) : { modules: {} };
  } catch {
    return { modules: {} };
  }
}

function saveAllState(state) {
  try {
    localStorage.setItem(MODULE_KEY, JSON.stringify(state));
    saveToBlob(MODULE_KEY, state);
  } catch {
    // localStorage not available
  }
}

function ensureModule(state, num) {
  if (!state.modules[num]) {
    state.modules[num] = {
      completed: false,
      completedAt: null,
      sectionsRead: [],
      quizAnswer: null,
    };
  }
}

export function getModuleProgress(num) {
  const all = getAllState();
  return all.modules[num] || {
    completed: false,
    completedAt: null,
    sectionsRead: [],
    quizAnswer: null,
  };
}

export function isSectionRead(num, sectionIdx) {
  const mod = getModuleProgress(num);
  return mod.sectionsRead.includes(sectionIdx);
}

export function markSectionRead(num, sectionIdx) {
  const all = getAllState();
  ensureModule(all, num);
  if (!all.modules[num].sectionsRead.includes(sectionIdx)) {
    all.modules[num].sectionsRead = [...all.modules[num].sectionsRead, sectionIdx];
  }
  saveAllState(all);
}

export function saveQuizAnswer(num, answer) {
  const all = getAllState();
  ensureModule(all, num);
  all.modules[num].quizAnswer = answer;
  saveAllState(all);
}

export function markModuleComplete(num) {
  const all = getAllState();
  ensureModule(all, num);
  all.modules[num].completed = true;
  all.modules[num].completedAt = new Date().toISOString();
  saveAllState(all);
}

export function getAllModuleProgress() {
  const all = getAllState();
  return all.modules;
}
