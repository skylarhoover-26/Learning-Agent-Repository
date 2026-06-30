import { timingSafeEqual } from 'crypto';
import { getOrgData, storeData } from '@/lib/manager-data';

// This route round-trips to the n8n webhook (which queries Snowflake for ~1.7k
// employees and returns ~350KB). That can take well past Vercel's default ~10s
// function limit on a cold start, which would kill the request and surface as
// "Team data is not available." Give it room, and never statically cache it.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.MANAGER_DATA_SECRET;

export async function GET(request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1';
  const { data, cached, stale } = await getOrgData({ force });
  if (!data) {
    return Response.json({ source: 'mock', data: null });
  }
  return Response.json({ source: 'snowflake', cached, stale: stale || undefined, data });
}

// Retained for backward compatibility: lets an authenticated push store data
// directly. The webhook-backed GET path above is the primary mechanism now.
export async function POST(request) {
  if (!API_SECRET) {
    return Response.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const authHeader = request.headers.get('x-api-secret');
  if (!authHeader || authHeader.length !== API_SECRET.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(API_SECRET))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const payload = await storeData(data);
    return Response.json({ ok: true, updatedAt: payload.updatedAt });
  } catch (error) {
    console.error('Failed to store manager data:', error);
    return Response.json({ error: 'Failed to store data' }, { status: 500 });
  }
}
