import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { blobHealth } from '@/lib/blob-health';

// Admin-only: does blob storage actually accept and return a write, right now?
//
// Answers the question that went unanswered for a month after writes stopped
// reaching the store on 2026-07-15 — see lib/blob-health.js for why nothing
// surfaced it on its own.
//
// force-dynamic because the whole value is that it runs at request time. A
// cached health check reports the health of whenever it was cached.
export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const report = await blobHealth();
  // 200 even when a store is unwritable: the report IS the answer, and a non-200
  // would make the failure look like the diagnostic being broken.
  return NextResponse.json(report);
}
