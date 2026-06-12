import { put, list, del } from '@vercel/blob';

function userKey(learnerId, dataType) {
  return `users/${learnerId}/${dataType}.json`;
}

export async function getUserData(learnerId, dataType) {
  try {
    const key = userKey(learnerId, dataType);
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveUserData(learnerId, dataType, data) {
  try {
    const key = userKey(learnerId, dataType);
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    const blob = await put(key, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return blob;
  } catch (error) {
    console.error(`Blob save error (${dataType}):`, error);
    throw error;
  }
}

export async function deleteUserData(learnerId, dataType) {
  try {
    const key = userKey(learnerId, dataType);
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    return true;
  } catch (error) {
    console.error(`Blob delete error (${dataType}):`, error);
    throw error;
  }
}

export async function listUserDataTypes(learnerId) {
  try {
    const prefix = `users/${learnerId}/`;
    const { blobs } = await list({ prefix });
    return blobs.map(b => {
      const name = b.pathname.replace(prefix, '').replace('.json', '');
      return { name, url: b.url, size: b.size, uploadedAt: b.uploadedAt };
    });
  } catch {
    return [];
  }
}
