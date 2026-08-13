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

// Impact can never run while the quiz is off. The day-3 prompt and the monthly
// re-grade both count from `calibrated_at`, which only the quiz sets — so with
// the quiz off there is no clock to count from, and the deferred assessment
// would either never fire or fire off a stale date from a previous round.
// Callers should use this rather than reading impact_enabled directly.
export function impactActive(config) {
  const c = normalizeAssessmentConfig(config);
  return c.quiz_enabled && c.impact_enabled;
}
