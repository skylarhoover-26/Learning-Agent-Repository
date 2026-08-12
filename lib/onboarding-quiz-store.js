import { getUserData, saveUserData } from './blob-store';
import { QUIZ_DEFAULTS, normalizeQuiz } from './onboarding-quiz';

// Persistence for the admin-authored onboarding quiz, stored as a single system
// blob. Mirrors the skill-levels / notify-allowlist pattern.
//
// Unlike skill-levels we store the WHOLE question set rather than a diff: these
// are authored questions, not overrides of a code default, so once an admin has
// edited them the code defaults stop being the baseline. Nothing is saved until
// someone saves in /admin/onboarding-quiz, and until then QUIZ_DEFAULTS is what
// learners get.
//
// SERVER ONLY — imports blob-store. Client code reads /api/onboarding-quiz.
const SYSTEM_ID = '__system__';
const TYPE = 'onboarding_quiz';

export async function getStoredQuiz() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  if (!data || !Array.isArray(data.questions)) return null;
  const clean = normalizeQuiz(data.questions);
  // An empty result means every stored question was malformed. Treat that as
  // "nothing usable stored" so learners fall back to the defaults instead of
  // getting a quiz with no questions in it.
  return clean.length ? clean : null;
}

// The authoritative question set: what an admin saved, or the code defaults.
export async function getQuiz() {
  const stored = await getStoredQuiz();
  return stored || normalizeQuiz(QUIZ_DEFAULTS);
}

// Persist an authored set. Returns the normalized questions actually saved so
// the admin UI can show exactly what took effect.
export async function setQuiz(questions) {
  const clean = normalizeQuiz(questions);
  if (!clean.length) throw new Error('No valid questions to save');
  await saveUserData(SYSTEM_ID, TYPE, {
    questions: clean,
    updated_at: new Date().toISOString(),
  });
  return clean;
}

// Drop the stored set so the code defaults take over again.
export async function resetQuiz() {
  await saveUserData(SYSTEM_ID, TYPE, {
    questions: [],
    updated_at: new Date().toISOString(),
  });
  return normalizeQuiz(QUIZ_DEFAULTS);
}
