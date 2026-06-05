import { put, list } from '@vercel/blob';
import { timingSafeEqual } from 'crypto';

const BLOB_KEY = 'manager-data/org-structure.json';
const API_SECRET = process.env.MANAGER_DATA_SECRET;

export async function POST(request) {
  if (!API_SECRET) {
    return Response.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const authHeader = request.headers.get('x-api-secret');
  if (!authHeader || !timingSafeEqual(Buffer.from(authHeader), Buffer.from(API_SECRET))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await put(BLOB_KEY, JSON.stringify(payload), {
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return Response.json({ ok: true, updatedAt: payload.updatedAt });
  } catch (error) {
    console.error('Failed to store manager data:', error);
    return Response.json({ error: 'Failed to store data' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'manager-data/' });
    const blob = blobs.find(b => b.pathname === BLOB_KEY);
    if (!blob) {
      return Response.json({ source: 'mock', data: null });
    }

    const response = await fetch(blob.downloadUrl);
    const data = await response.json();
    return Response.json({ source: 'snowflake', data });
  } catch {
    return Response.json({ source: 'mock', data: null });
  }
}
