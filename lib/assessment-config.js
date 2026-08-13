// Master on/off switches for the two assessments.
//
// The placement quiz is a REQUIRED, full-screen gate (components/calibration-gate)
// and the AI Impact assessment is an interrupting prompt a few days later. Both
// are things you want to be able to stop running during a test round without
// deleting the questions that took real work to author.
//
// Turning the quiz off used to mean switching every question off one at a time,
// which the admin page refuses to save (an empty quiz would strand new users on a
// blank screen) — so in practice there was no way to turn it off at all.
//
// PURE MODULE — no storage imports, so client components and the API can both
// read it. Persistence lives in lib/assessment-config-store.js (server only).

export const ASSESSMENT_DEFAULTS = {
  // The required placement quiz shown before anyone can enter the platform.
  quiz_enabled: true,
  // The AI Impact assessment: the deferred first run AND the monthly re-grade.
  // One flag covers both — a monthly re-grade of an assessment nobody ever took
  // is not a thing anyone wants.
  impact_enabled: true,
};

export function normalizeAssessmentConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    // Explicit false is the only thing that turns a switch off. Anything else —
    // missing, malformed, a half-written blob — leaves the assessment running,
    // because silently skipping placement for everyone is the worse failure.
    quiz_enabled: src.quiz_enabled !== false,
    impact_enabled: src.impact_enabled !== false,
  };
}

// The two switches are INDEPENDENT. Either can run without the other — you might
// want the impact assessment without the placement quiz, or the reverse.
//
// They were briefly coupled because the impact timers counted from
// `calibrated_at`, which only the quiz writes, so with the quiz off there was no
// clock to count from. The fix was to give impact its own anchor
// (lib/impact-schedule.js falls back to `onboarded_at`) rather than to chain one
// switch to the other.
export function impactActive(config) {
  return normalizeAssessmentConfig(config).impact_enabled;
}
