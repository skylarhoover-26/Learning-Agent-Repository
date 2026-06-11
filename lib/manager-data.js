import { put, list } from '@vercel/blob';

export const BLOB_KEY = 'manager-data/org-structure.json';
const WEBHOOK_URL = process.env.N8N_MANAGER_DASHBOARD_WEBHOOK_URL;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // refresh from Snowflake at most every 6h

export async function readCachedData() {
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

export async function storeData(data) {
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

/**
 * Returns the org structure: fresh cache if young enough, otherwise refreshes
 * from the n8n webhook and caches the result. Falls back to stale cache, then
 * null. Shape: { data, cached, stale }.
 */
export async function getOrgData({ force = false } = {}) {
  const cached = await readCachedData();
  const ageMs = cached?.updatedAt ? Date.now() - Date.parse(cached.updatedAt) : Infinity;

  if (cached && !force && ageMs < CACHE_TTL_MS) {
    return { data: cached, cached: true, stale: false };
  }

  const fresh = await fetchFromWebhook();
  if (fresh) {
    try {
      const stored = await storeData(fresh);
      return { data: stored, cached: false, stale: false };
    } catch (error) {
      console.error('Failed to cache manager data:', error);
      return { data: { ...fresh, updatedAt: new Date().toISOString() }, cached: false, stale: false };
    }
  }

  if (cached) return { data: cached, cached: true, stale: true };
  return { data: null, cached: false, stale: false };
}
