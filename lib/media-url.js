// Pure URL helper — safe to import from client components (no SDK, no node:*).
//
// Feedback screenshots and recordings are stored in Blob. Once the media store is
// private, a blob URL can no longer be used as an <img>/<video> src: the browser
// can't send an auth header. Instead the admin UI points at our own proxy route,
// which is session-gated and streams the bytes server-side.
//
// The proxy resolves by PATHNAME, so stored records never need rewriting — the
// same helper works for URLs written before and after the private-store cutover.

const BLOB_HOST_SUFFIX = '.blob.vercel-storage.com';

// "https://<store>.public.blob.vercel-storage.com/feedback-recordings/x.mov"
//   -> "/api/feedback/media/feedback-recordings/x.mov"
// Anything that isn't one of our blob URLs is returned untouched.
export function mediaProxySrc(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return url;
    const pathname = parsed.pathname.replace(/^\/+/, '');
    if (!pathname) return url;
    return `/api/feedback/media/${pathname}`;
  } catch {
    return url;
  }
}
