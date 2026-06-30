const SYNC_DEBOUNCE_MS = 2000;
const pendingTimers = {};
// Holds the latest un-synced payload per dataType so we can flush it immediately
// if the page is navigating/hiding before the debounce fires. Without this, the
// 2s debounce gets cancelled on navigation and the blob backup chronically lags
// the real local total — which is why the leaderboard trailed the home XP card.
const pendingData = {};
let flushBound = false;

function postUserData(dataType, data, keepalive = false) {
  return fetch('/api/user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: dataType, data }),
    keepalive,
  });
}

function flushPending() {
  for (const dataType of Object.keys(pendingData)) {
    const data = pendingData[dataType];
    delete pendingData[dataType];
    if (pendingTimers[dataType]) { clearTimeout(pendingTimers[dataType]); delete pendingTimers[dataType]; }
    // keepalive lets the request finish even as the page unloads.
    try { postUserData(dataType, data, true); } catch { /* best-effort */ }
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

export function saveToBlob(dataType, data) {
  bindFlush();
  pendingData[dataType] = data;
  if (pendingTimers[dataType]) {
    clearTimeout(pendingTimers[dataType]);
  }
  pendingTimers[dataType] = setTimeout(async () => {
    const payload = pendingData[dataType];
    delete pendingData[dataType];
    delete pendingTimers[dataType];
    try {
      await postUserData(dataType, payload);
    } catch (error) {
      console.error(`Blob sync failed for ${dataType}:`, error);
    }
  }, SYNC_DEBOUNCE_MS);
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
