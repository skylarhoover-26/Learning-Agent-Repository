const STORAGE_KEY = 'ai_impact_scores';

const SCORE_LABELS = {
  1: 'Needs Improving',
  2: 'Still Developing',
  3: 'Fully Successful',
  4: 'Often Exceeds',
  5: 'Role Model',
};

const DIMENSION_LABELS = {
  personal: 'Personal Impact',
  team: 'Team Impact',
  org: 'Org Impact',
  development: 'AI Development',
};

function getOverallLevel(scores) {
  const values = [scores.personal, scores.team, scores.org, scores.development].filter(Boolean);
  if (values.length === 0) return { level: 'Not Assessed', color: 'bg-slate-100 text-slate-600' };
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg >= 4) return { level: 'High', color: 'bg-[#0055FF] text-white' };
  if (avg >= 2.5) return { level: 'Medium', color: 'bg-[#009FDA] text-white' };
  return { level: 'Low', color: 'bg-[#9BCBEB] text-slate-900' };
}

export function getScoringData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveScoringData(data) {
  const existing = getScoringData() || { history: [] };
  const updated = {
    ...existing,
    ...data,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function saveScores(scores) {
  const existing = getScoringData() || { history: [] };
  const history = existing.history || [];
  history.push({
    scores: { ...scores },
    scored_at: new Date().toISOString(),
  });
  return saveScoringData({ scores, history });
}

export function getScores() {
  const data = getScoringData();
  return data?.scores || null;
}

export function getScoreHistory() {
  const data = getScoringData();
  return data?.history || [];
}

export { SCORE_LABELS, DIMENSION_LABELS, getOverallLevel };
