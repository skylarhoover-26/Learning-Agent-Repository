import { put, list } from '@vercel/blob';
import { timingSafeEqual } from 'crypto';

const BLOB_KEY = 'manager-data/org-structure.json';
const API_SECRET = process.env.MANAGER_DATA_SECRET;
const WEBHOOK_URL = process.env.N8N_MANAGER_DASHBOARD_WEBHOOK_URL;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // refresh from Snowflake at most every 6h

async function readCachedData() {
  try {
    const { blobs } = await list({ prefix: 'manager-data/' });
    const blob = blobs.find(b => b.pathname === BLOB_KEY);
    if (!blob) return null;
    const response = await fetch(blob.downloadUrl);
    return await response.json();
  } catch {
    return null;
  }
}

async function storeData(data) {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await put(BLOB_KEY, JSON.stringify(payload), {
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return payload;
}

// Pull fresh org data from the n8n webhook (Vercel -> n8n; n8n queries Snowflake
// and responds with the aggregated JSON). Returns null on any failure/timeout.
async function fetchFromWebhook() {
  if (!WEBHOOK_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'manager-dashboard' }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error('Manager dashboard webhook returned', res.status);
      return null;
    }
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Manager dashboard webhook error:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1';
  const cached = await readCachedData();
  const ageMs = cached?.updatedAt ? Date.now() - Date.parse(cached.updatedAt) : Infinity;

  // Serve fresh cache without hitting Snowflake.
  if (cached && !force && ageMs < CACHE_TTL_MS) {
    return Response.json({ source: 'snowflake', cached: true, data: cached });
  }

  // Cache missing/stale (or forced): refresh from the n8n webhook.
  const fresh = await fetchFromWebhook();
  if (fresh) {
    try {
      const stored = await storeData(fresh);
      return Response.json({ source: 'snowflake', cached: false, data: stored });
    } catch (error) {
      console.error('Failed to cache manager data:', error);
      return Response.json({ source: 'snowflake', cached: false, data: { ...fresh, updatedAt: new Date().toISOString() } });
    }
  }

  // Webhook unavailable — fall back to stale cache if we have it, else mock.
  if (cached) {
    return Response.json({ source: 'snowflake', cached: true, stale: true, data: cached });
  }
  return Response.json({ source: 'mock', data: null });
}

// Retained for backward compatibility: lets an authenticated push (the old n8n
// HTTP-Request workflow) store data directly. The webhook GET path above is the
// primary mechanism now.
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
