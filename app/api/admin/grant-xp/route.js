import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getUserData, saveUserData } from '@/lib/blob-store';
import { getLevel } from '@/lib/level-curve';

// Admin-only, server-side XP grant. Because the write happens here (not in the
// browser), an admin grant is trustworthy — it can't be faked from dev tools.
// Amount may be negative to deduct. Recorded with the granting admin + reason.
export async function POST(request) {
  const admin = await getAuthenticatedUser();
  if (!admin?.email || !(await isAdmin(admin.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { learnerId, amount, reason } = await request.json();
    const amt = Math.round(Number(amount));
    if (!learnerId || !Number.isFinite(amt) || amt === 0) {
      return NextResponse.json({ error: 'learnerId and a non-zero amount are required' }, { status: 400 });
    }

    // XP is stored under the client's localStorage key so the user sees the
    // grant on their next sync.
    const xpKey = `lp_xp_${learnerId}`;
    const existing = await getUserData(learnerId, xpKey);
    const events = Array.isArray(existing) ? existing : [];
    const now = new Date().toISOString();

    const rawTotal = events.reduce((s, e) => s + (e.amount || 0), 0);

    // XP can never be negative. Heal any pre-existing negative balance back to 0
    // first, then apply the grant from that 0 floor.
    if (rawTotal < 0) {
      events.push({
        id: `xp_fix_${Date.now()}`,
        source: 'admin_correction',
        amount: -rawTotal,
        created_at: now,
        meta: { by: admin.email, reason: 'Reset negative balance to 0' },
      });
    }
    const base = Math.max(0, rawTotal);
    // A deduct can only go down to 0, never below.
    const applied = amt < 0 ? Math.max(amt, -base) : amt;

    if (applied !== 0) {
      events.push({
        id: `xp_admin_${Date.now() + 1}`,
        source: 'admin_grant',
        amount: applied,
        created_at: now,
        meta: { by: admin.email, reason: (reason || '').slice(0, 200) },
      });
    }
    await saveUserData(learnerId, xpKey, events);

    const totalXp = Math.max(0, base + applied);
    return NextResponse.json({ ok: true, totalXp, level: getLevel(totalXp), amount: applied });
  } catch (error) {
    console.error('POST /api/admin/grant-xp error:', error);
    return NextResponse.json({ error: 'Failed to grant XP' }, { status: 500 });
  }
}
