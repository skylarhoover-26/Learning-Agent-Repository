import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// Serves the AI-news findings to any signed-in learner for the home page's
// "AI news" card.
//
// This route exists because the card was reading
// `/api/user-data?type=curriculum_findings`, which resolves to a PER-USER blob
// (`users/<email>/curriculum_findings.json`) — but the daily scan writes to a
// SHARED one (`shared/curriculum_findings.json`, see api/curriculum/daily).
// Nothing ever wrote the per-user path, so the card could only ever render its
// empty state. The one endpoint that did serve the shared findings
// (api/curriculum/proposals) is admin-only, so learners couldn't use it.
//
// Deliberately NOT placed under `api/curriculum/` — that prefix sits in the
// middleware's SSO exclusion list so the cron can reach it, which would have
// made this readable without signing in.
const BLOB_FINDINGS_KEY = 'shared/curriculum_findings.json';

// The findings blob is overwritten in place and a Vercel blob keeps the same URL
// across writes, so a plain fetch can serve the pre-overwrite copy from cache.
// Cache-bust + no-store, the same way lib/blob-store.js does (skipping it there
// is why admin XP grants once appeared to do nothing).
async function readFindings() {
  try {
    const { blobs } = await list({ prefix: BLOB_FINDINGS_KEY, limit: 1 });
    if (blobs.length === 0) return [];
    const base = blobs[0].downloadUrl;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Reads mutable blob data, so it must never be cached at build time.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Stored newest-first by the scan's merge, so no re-sort — the caller slices
    // to however many it wants to show.
    const items = await readFindings();
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('GET /api/ai-news error:', error);
    // An empty feed renders the card's normal "no fresh updates" state, which is
    // a better failure than breaking the home page.
    return NextResponse.json({ items: [], count: 0 });
  }
}
