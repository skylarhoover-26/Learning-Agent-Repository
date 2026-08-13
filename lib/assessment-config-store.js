import { getUserData, saveUserData } from './blob-store';
import { ASSESSMENT_DEFAULTS, normalizeAssessmentConfig } from './assessment-config';

// Persistence for the assessment on/off switches, stored as one system blob.
// Mirrors the onboarding-quiz / skill-levels / notify-allowlist pattern.
//
// SERVER ONLY — imports blob-store. Client code reads /api/assessment-config.
const SYSTEM_ID = '__system__';
const TYPE = 'assessment_config';

export async function getAssessmentConfig() {
  try {
    const data = await getUserData(SYSTEM_ID, TYPE);
    return normalizeAssessmentConfig(data);
  } catch {
    // A blob read failure must not silently switch off the required placement
    // quiz for everyone — fail toward "still running".
    return { ...ASSESSMENT_DEFAULTS };
  }
}

// Patch one or both switches. Anything not named is left as it was, so the two
// toggles in the admin UI can save independently.
export async function setAssessmentConfig(patch) {
  const current = await getAssessmentConfig();
  const next = normalizeAssessmentConfig({
    quiz_enabled: patch?.quiz_enabled ?? current.quiz_enabled,
    impact_enabled: patch?.impact_enabled ?? current.impact_enabled,
  });
  await saveUserData(SYSTEM_ID, TYPE, {
    ...next,
    updated_at: new Date().toISOString(),
  });
  return next;
}
