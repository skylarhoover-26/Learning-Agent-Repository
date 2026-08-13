import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { requireAdmin } from '@/lib/require-admin';
import { getAssessmentConfig, setAssessmentConfig } from '@/lib/assessment-config-store';
import { getProfileVisibility, setProfileVisibility } from '@/lib/profile-visibility';
import { logAuditEntry } from '@/lib/audit-log';

// This config lives in mutable blob storage, so the route must never be
// statically cached — a cached GET would keep serving the switch positions from
// build time and flipping a switch would appear to do nothing.
export const dynamic = 'force-dynamic';

const CALIBRATION_HREF = '/calibration';

// GET is open to any signed-in user: the calibration gate, the tour, and the
// impact prompt all have to know whether they should run.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json(await getAssessmentConfig());
}

// The "My Calibration" profile-menu item follows the quiz switch.
//
// Deliberately a REAL write to profile visibility rather than a computed
// override: it shows up in /admin/profile-visibility as a normal hidden item, so
// an admin can see why it disappeared and put it back. A hidden-by-magic item
// that ignores the admin page would be the kind of thing you lose an afternoon to.
async function syncCalibrationVisibility(quizEnabled) {
  try {
    const { items, hiddenItems } = await getProfileVisibility();
    const isHidden = hiddenItems.includes(CALIBRATION_HREF);
    if (!quizEnabled && !isHidden) {
      await setProfileVisibility({ items, hiddenItems: [...hiddenItems, CALIBRATION_HREF] });
      return 'hidden';
    }
    if (quizEnabled && isHidden) {
      await setProfileVisibility({ items, hiddenItems: hiddenItems.filter((h) => h !== CALIBRATION_HREF) });
      return 'restored';
    }
    return 'unchanged';
  } catch {
    // Visibility is a convenience. Never fail the switch over it.
    return 'failed';
  }
}

// POST is admin-only: flip either switch.
export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const user = await getAuthenticatedUser();
  try {
    const body = await request.json();
    const before = await getAssessmentConfig();
    const config = await setAssessmentConfig({
      quiz_enabled: typeof body?.quiz_enabled === 'boolean' ? body.quiz_enabled : undefined,
      impact_enabled: typeof body?.impact_enabled === 'boolean' ? body.impact_enabled : undefined,
    });

    const visibility = before.quiz_enabled !== config.quiz_enabled
      ? await syncCalibrationVisibility(config.quiz_enabled)
      : 'unchanged';

    // Worth an audit entry: this decides whether every new hire hits a required
    // gate, so "when did placement stop running, and who turned it off?" needs an
    // answer that isn't someone's memory.
    logAuditEntry({
      type: 'assessment_config_change',
      endpoint: '/api/assessment-config',
      user: { email: user?.email || 'unknown', name: user?.name || 'Unknown' },
      model: 'n/a',
      input: before,
      output: { ...config, calibration_menu: visibility },
      durationMs: 0,
    }).catch(() => {});

    return NextResponse.json({ ...config, calibration_menu: visibility });
  } catch (error) {
    console.error('POST /api/assessment-config error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
  }
}
