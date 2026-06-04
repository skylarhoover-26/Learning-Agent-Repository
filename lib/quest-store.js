'use client';

const QUEST_STATE_KEY = 'learner_quest_state';

function getAllState() {
  try {
    const raw = localStorage.getItem(QUEST_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllState(state) {
  try {
    localStorage.setItem(QUEST_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

export function getQuestState(questId) {
  const all = getAllState();
  return all[questId] || null;
}

export function startQuest(questId) {
  const all = getAllState();
  if (!all[questId]) {
    all[questId] = {
      status: 'in_progress',
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    saveAllState(all);
  }
  return all[questId];
}

export function completeStep(questId, stepIndex) {
  const all = getAllState();
  const quest = all[questId];
  if (!quest) return null;

  if (!quest.completedSteps.includes(stepIndex)) {
    quest.completedSteps = [...quest.completedSteps, stepIndex];
  }
  quest.currentStep = stepIndex + 1;
  saveAllState(all);
  return quest;
}

export function completeQuest(questId) {
  const all = getAllState();
  const quest = all[questId];
  if (!quest) return null;

  quest.status = 'completed';
  quest.completedAt = new Date().toISOString();
  saveAllState(all);
  return quest;
}

export function getQuestProgress(questId, totalSteps) {
  const state = getQuestState(questId);
  if (!state) return { status: 'not_started', percent: 0, completedSteps: 0, totalSteps };

  const completedCount = state.completedSteps.length;
  return {
    status: state.status,
    percent: totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0,
    completedSteps: completedCount,
    totalSteps,
    currentStep: state.currentStep,
  };
}

export function getAllQuestProgress() {
  return getAllState();
}

export function getCompletedQuestCount() {
  const all = getAllState();
  return Object.values(all).filter(q => q.status === 'completed').length;
}
