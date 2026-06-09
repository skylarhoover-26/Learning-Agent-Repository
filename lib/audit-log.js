import { put, list } from '@vercel/blob';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function auditKey(date) {
  return `audit/${date}.json`;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getExistingEntries(date) {
  try {
    const key = auditKey(date);
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function logAuditEntry({
  type,
  endpoint,
  user,
  model,
  input,
  output,
  durationMs,
  error,
}) {
  try {
    const date = todayKey();
    const entries = await getExistingEntries(date);

    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type,
      endpoint,
      user: user || { email: 'unknown', name: 'Unknown' },
      model: model || 'unknown',
      input,
      output: error ? null : output,
      durationMs: Math.round(durationMs || 0),
      error: error || null,
    };

    entries.push(entry);

    await put(auditKey(date), JSON.stringify(entries), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return entry;
  } catch (err) {
    console.error('Audit log write failed:', err);
    return null;
  }
}

export async function getAuditEntries({ date, type, userEmail, limit } = {}) {
  try {
    const targetDate = date || todayKey();
    const entries = await getExistingEntries(targetDate);

    let filtered = entries;

    if (type && type !== 'all') {
      filtered = filtered.filter((e) => e.type === type);
    }

    if (userEmail) {
      const lower = userEmail.toLowerCase();
      filtered = filtered.filter(
        (e) => e.user?.email?.toLowerCase().includes(lower)
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  } catch {
    return [];
  }
}

export async function getAuditDates() {
  try {
    const { blobs } = await list({ prefix: 'audit/', limit: 100 });
    return blobs
      .map((b) => {
        const match = b.pathname.match(/audit\/(\d{4}-\d{2}-\d{2})\.json/);
        return match ? { date: match[1], size: b.size } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function getAuditStats(date) {
  try {
    const entries = await getExistingEntries(date || todayKey());
    const byType = {};
    const byUser = {};
    let totalDuration = 0;
    let errorCount = 0;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      const email = entry.user?.email || 'unknown';
      byUser[email] = (byUser[email] || 0) + 1;
      totalDuration += entry.durationMs || 0;
      if (entry.error) errorCount++;
    }

    return {
      total: entries.length,
      byType,
      byUser,
      avgDurationMs: entries.length > 0 ? Math.round(totalDuration / entries.length) : 0,
      errorCount,
    };
  } catch {
    return { total: 0, byType: {}, byUser: {}, avgDurationMs: 0, errorCount: 0 };
  }
}
