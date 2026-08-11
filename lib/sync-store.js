const SYNC_DEBOUNCE_MS = 2000;
const pendingTimers = {};
// Holds the latest un-synced payload per dataType so we can flush it immediately
// if the page is navigating/hiding before the debounce fires. Without this, the
// 2s debounce gets cancelled on navigation and the blob backup chronically lags
// the real local total — which is why the leaderboard trailed the home XP card.
const pendingData = {};
let flushBound = false;

function postUserData(dataType, data, keepalive = false, mode = null) {
  return fetch('/api/user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mode ? { type: dataType, data, mode } : { type: dataType, data }),
    keepalive,
  });
}

function flushPending() {
  for (const dataType of Object.keys(pendingData)) {
    const { data, mode } = pendingData[dataType];
    delete pendingData[dataType];
    if (pendingTimers[dataType]) { clearTimeout(pendingTimers[dataType]); delete pendingTimers[dataType]; }
    // keepalive lets the request finish even as the page unloads.
    try { postUserData(dataType, data, true, mode); } catch { /* best-effort */ }
  }
}

function bindFlush() {
  if (flushBound || typeof window === 'undefined') return;
  flushBound = true;
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
}

export async function loadFromBlob(dataType) {
  try {
    const res = await fetch(`/api/user-data?type=${encodeURIComponent(dataType)}`);
    if (!res.ok) return null;
    const { data } = await res.json();
    if (data !== null && data !== undefined) {
      localStorage.setItem(dataType, JSON.stringify(data));
    }
    return data;
  } catch {
    return null;
  }
}

export function saveToBlob(dataType, data, mode = null) {
  bindFlush();
  pendingData[dataType] = { data, mode };
  if (pendingTimers[dataType]) {
    clearTimeout(pendingTimers[dataType]);
  }
  pendingTimers[dataType] = setTimeout(async () => {
    const payload = pendingData[dataType];
    delete pendingData[dataType];
    delete pendingTimers[dataType];
    try {
      await postUserData(dataType, payload.data, false, payload.mode);
    } catch (error) {
      console.error(`Blob sync failed for ${dataType}:`, error);
    }
  }, SYNC_DEBOUNCE_MS);
}

// Overwrite the server copy outright, discarding anything stored there that isn't
// in `data`. The server MERGES append-only ledgers by default (lib/ledger-merge.js)
// so one device's sync can't delete another writer's entries — which also means a
// deliberate shrink has to say so. Only two writes legitimately shrink a ledger:
// applying an admin XP reset, and reverting to a saved role snapshot. Everything
// else wants saveToBlob.
export function replaceInBlob(dataType, data) {
  return saveToBlob(dataType, data, 'replace');
}

export function getLocal(dataType) {
  try {
    const raw = localStorage.getItem(dataType);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocal(dataType, data) {
  localStorage.setItem(dataType, JSON.stringify(data));
  saveToBlob(dataType, data);
  return data;
}

export async function hydrate(dataType) {
  const local = getLocal(dataType);
  if (local) return local;
  return await loadFromBlob(dataType);
}

// Reconcile an append-only ledger (XP / badges / lessons) with the server and
// adopt the server's copy when it's AHEAD of local. `hydrate()` above is
// local-wins, so a device that already holds some local data never reconciles
// UP to a higher server total — that's why a learner could show 25 XP locally
// (just the welcome bonus, after a cache clear / new device) while the
// leaderboard, which totals the server's xp_events by email, showed 115. The
// server holds the union of every device's synced events, so when it's ahead we
// adopt it; when local is ahead (unsynced events not backed up yet) we keep
// local and let the debounced backup push it up. `weigh` maps the array to a
// comparable magnitude (XP by summed amount, badges/lessons by count).
export async function reconcileLedger(dataType, weigh = (arr) => arr.length) {
  try {
    const res = await fetch(`/api/user-data?type=${encodeURIComponent(dataType)}`);
    if (!res.ok) return;
    const { data: server } = await res.json();
    if (!Array.isArray(server) || server.length === 0) return;
    const localRaw = getLocal(dataType);
    const local = Array.isArray(localRaw) ? localRaw : [];
    if (weigh(server) > weigh(local)) setLocal(dataType, server);
  } catch {
    // best-effort — a failed reconcile just leaves local as-is
  }
}
