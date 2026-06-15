import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';

const BLOB_PROPOSALS_KEY = 'shared/curriculum_proposals.json';
const BLOB_FINDINGS_KEY = 'shared/curriculum_findings.json';

async function readBlob(key) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeBlob(key, data) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    await put(key, JSON.stringify(data), {
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error(`Blob write error (${key}):`, error);
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const proposals = (await readBlob(BLOB_PROPOSALS_KEY)) || [];
    const findings = (await readBlob(BLOB_FINDINGS_KEY)) || [];

    const lastScanTime = findings.length > 0
      ? findings.reduce((latest, f) => {
          const t = f.publishedAt ? new Date(f.publishedAt).getTime() : 0;
          return t > latest ? t : latest;
        }, 0)
      : null;

    return NextResponse.json({
      proposals,
      findingsCount: findings.length,
      lastScanTime: lastScanTime ? new Date(lastScanTime).toISOString() : null,
    });
  } catch (error) {
    console.error('GET /api/curriculum/proposals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, action, reason } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const proposals = (await readBlob(BLOB_PROPOSALS_KEY)) || [];
    const updated = proposals.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        status: action === 'approve' ? 'approved' : 'rejected',
        decidedBy: user.name || user.email,
        decidedAt: new Date().toISOString(),
        rejectReason: action === 'reject' ? (reason || 'Rejected by admin') : undefined,
      };
    });

    await writeBlob(BLOB_PROPOSALS_KEY, updated);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/curriculum/proposals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
