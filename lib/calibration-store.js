import { setLocal, getLocal } from './sync-store';

const STORAGE_KEY = 'calibration_profile';

export const SKILL_LABELS = {
  privacy: 'Data Privacy',
  prompting: 'Prompting',
  comms: 'Communication',
  eval: 'AI Evaluation',
  agents: 'AI Agents',
  data: 'Data Literacy',
  models: 'Model Selection',
};

// Plain-language definitions shown in an (i) tooltip next to each competency so
// people know exactly what "AI Evaluation" or "Data Literacy" mean before rating
// themselves. Keep these short and jargon-free.
export const SKILL_DEFINITIONS = {
  privacy: 'Handling sensitive company and customer data responsibly with AI — sharing only what a task needs, and only on approved tools.',
  prompting: 'Getting reliable, useful results from AI by giving it clear instructions, context, and structure.',
  comms: 'Knowing when and how to use AI to draft, refine, and tailor messages — and when a human touch works better.',
  eval: 'Judging whether an AI answer is accurate and trustworthy before you act on it — spotting made-up facts and checking sources.',
  agents: 'Setting up or overseeing AI that runs tasks on its own, with the right guardrails and accuracy checks.',
  data: 'Using AI to work with data soundly — and being able to verify and defend the numbers it gives you.',
  models: 'Picking the right model for the job — a fast model for quick, simple work and a slower "deep-reasoning" one for complex, high-stakes tasks — in whatever AI tool you use.',
};

export const SKILL_KEYS = Object.keys(SKILL_LABELS);

export function getCalibrationData() {
  return getLocal(STORAGE_KEY);
}

export function saveCalibrationData(data) {
  const updated = {
    ...data,
    completed_at: new Date().toISOString(),
  };
  setLocal(STORAGE_KEY, updated);
  return updated;
}

export function getCalibrationSkills() {
  const data = getCalibrationData();
  return data?.skills || null;
}

// A dated log of every calibration run so My Calibration can show previous
// scores / a timeline and compare new vs old. Each run: { completed_at, skills,
// selfRating, impact }. Kept alongside the "latest only" calibration_profile.
const HISTORY_KEY = 'calibration_history';

export function appendCalibrationRun(run) {
  const existing = getLocal(HISTORY_KEY);
  const history = Array.isArray(existing) ? existing : [];
  history.push({ ...run, completed_at: run.completed_at || new Date().toISOString() });
  // Keep the log bounded — plenty for a timeline/trend.
  const trimmed = history.slice(-24);
  setLocal(HISTORY_KEY, trimmed);
  return trimmed;
}

export function getCalibrationHistory() {
  const data = getLocal(HISTORY_KEY);
  return Array.isArray(data) ? data : [];
}

export function getSelfRating() {
  const data = getCalibrationData();
  return data?.selfRating || null;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

export function calculateSkills(answers, scenarios) {
  // Baseline every measured competency at 0.3. Derived from SKILL_KEYS so adding a
  // new dimension to SKILL_LABELS can't leave its baseline undefined (which would
  // turn the moving-average math below into NaN).
  const skills = Object.fromEntries(SKILL_KEYS.map((key) => [key, 0.3]));

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
