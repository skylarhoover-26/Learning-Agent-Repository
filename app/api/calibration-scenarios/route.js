import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateCalibrationScenarios } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Sonnet generation of 5 role-tailored scenarios can run long, like the other
// AI routes — give it the full window so it isn't killed by Vercel's short
// default timeout mid-generation.
export const maxDuration = 120;

// Returns role-aware scenarios keyed by skill: { scenarios: { prompting: {...}, ... } }.
// Only cleanly-generated skills are included; the client fills any gaps from the
// curated fallback set, so an empty/partial result never blocks calibration.
export async function POST() {
  try {
    const profile = await getAuthenticatedProfile();
    const start = Date.now();
    const scenarios = await generateCalibrationScenarios(profile);

    logAuditEntry({
      type: 'calibration_scenarios',
      endpoint: '/api/calibration-scenarios',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { department: profile?.department || null, tier: profile?.tier || null },
      output: { generatedSkills: Object.keys(scenarios) },
      durationMs: Date.now() - start,
      error: null,
    }).catch(() => {});

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('POST /api/calibration-scenarios error:', error);
    // Soft-fail: the client falls back to the curated scenarios.
    return NextResponse.json({ scenarios: {} });
  }
}
