const SYNC_DEBOUNCE_MS = 2000;
const pendingTimers = {};

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
  if (pendingTimers[dataType]) {
    clearTimeout(pendingTimers[dataType]);
  }
  pendingTimers[dataType] = setTimeout(async () => {
    try {
      await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: dataType, data }),
      });
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
