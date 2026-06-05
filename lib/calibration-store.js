const STORAGE_KEY = 'calibration_profile';

export const SKILL_LABELS = {
  privacy: 'Data Privacy',
  prompting: 'Prompting',
  comms: 'Communication',
  eval: 'AI Evaluation',
  agents: 'AI Agents',
  data: 'Data Literacy',
};

export const SKILL_KEYS = Object.keys(SKILL_LABELS);

export function getCalibrationData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCalibrationData(data) {
  const updated = {
    ...data,
    completed_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getCalibrationSkills() {
  const data = getCalibrationData();
  return data?.skills || null;
}

export function getSelfRating() {
  const data = getCalibrationData();
  return data?.selfRating || null;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

export function calculateSkills(answers, scenarios) {
  const skills = {
    privacy: 0.3,
    prompting: 0.3,
    comms: 0.3,
    eval: 0.3,
    agents: 0.3,
    data: 0.3,
  };

  for (const scenario of scenarios) {
    const answerIdx = answers[scenario.id];
    if (answerIdx === undefined) continue;
    const answer = scenario.answers[answerIdx];
    for (const [key, value] of Object.entries(answer.scores)) {
      skills[key] = clamp01(skills[key] * 0.5 + value * 0.5);
    }
  }

  return skills;
}
