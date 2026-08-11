import { requireAdmin } from '@/lib/require-admin';
import { readMedia, mimeForPathname } from '@/lib/blob-media';

// Authenticated proxy for feedback screenshots and screen recordings.
//
// Blob URLs can't be used as <img>/<video> src once the media store is private —
// the browser has no way to send an auth header. This route is same-origin, so
// the session cookie rides along automatically, and it streams the bytes after
// checking the caller is an admin (security review F-05).
//
// It resolves by pathname and reads private-then-public, so it serves media
// uploaded either side of the private-store cutover without any stored record
// needing to be rewritten.
export const dynamic = 'force-dynamic';

// Copied through so <video> can seek and the browser gets the right type.
const PASS_THROUGH = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag'];

export async function GET(request, { params }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { path } = await params;
  const pathname = (Array.isArray(path) ? path : [path]).join('/');
  if (!pathname) return new Response('Not found', { status: 404 });

  const rangeHeader = request.headers.get('range') || undefined;
  const media = await readMedia(pathname, { range: rangeHeader });
  if (!media?.stream) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  for (const key of PASS_THROUGH) {
    const value = media.headers?.get?.(key);
    if (value) headers.set(key, value);
  }
  // Storage reports copies as application/octet-stream, which <video> won't
  // play — prefer the type implied by the extension.
  const inferred = mimeForPathname(pathname);
  const reported = headers.get('content-type');
  if (inferred && (!reported || reported === 'application/octet-stream')) {
    headers.set('content-type', inferred);
  } else if (!reported) {
    headers.set('content-type', 'application/octet-stream');
  }
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');
  // Private data — let the browser hold it briefly, never a shared cache.
  headers.set('cache-control', 'private, max-age=60');

  // The SDK reports 200 even when storage satisfied a range request, and a 200
  // carrying a partial body breaks seeking (the browser thinks it has the whole
  // file). If we asked for a range and got one back, say 206.
  let status = media.status || 200;
  if (rangeHeader && headers.has('content-range') && status === 200) status = 206;

  return new Response(media.stream, { status, headers });
}
