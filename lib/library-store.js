'use client';

const LIBRARY_USAGE_KEY = 'learner_library_usage';

function getAllUsage() {
  try {
    const raw = localStorage.getItem(LIBRARY_USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllUsage(usage) {
  try {
    localStorage.setItem(LIBRARY_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // localStorage not available
  }
}

export function trackUseCaseTry(useCaseId) {
  const all = getAllUsage();
  if (!all[useCaseId]) {
    all[useCaseId] = { tries: 0, copies: 0, lastUsedAt: null };
  }
  all[useCaseId] = {
    ...all[useCaseId],
    tries: all[useCaseId].tries + 1,
    lastUsedAt: new Date().toISOString(),
  };
  saveAllUsage(all);
}

export function trackUseCaseCopy(useCaseId) {
  const all = getAllUsage();
  if (!all[useCaseId]) {
    all[useCaseId] = { tries: 0, copies: 0, lastUsedAt: null };
  }
  all[useCaseId] = {
    ...all[useCaseId],
    copies: all[useCaseId].copies + 1,
    lastUsedAt: new Date().toISOString(),
  };
  saveAllUsage(all);
}

export function getUseCaseUsage(useCaseId) {
  const all = getAllUsage();
  return all[useCaseId] || { tries: 0, copies: 0, lastUsedAt: null };
}

export function getMostUsedIds(limit = 5) {
  const all = getAllUsage();
  return Object.entries(all)
    .map(([id, usage]) => ({ id: Number(id), total: usage.tries + usage.copies }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(entry => entry.id);
}

export function getRecentlyUsedIds(limit = 5) {
  const all = getAllUsage();
  return Object.entries(all)
    .filter(([, usage]) => usage.lastUsedAt)
    .map(([id, usage]) => ({ id: Number(id), lastUsedAt: usage.lastUsedAt }))
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, limit)
    .map(entry => entry.id);
}
