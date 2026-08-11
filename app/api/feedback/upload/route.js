import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { mediaUploadToken } from '@/lib/blob-media';

// Direct browser→Blob uploads for feedback attachments (screen recordings and
// large images). These bypass the ~4.5MB serverless request-body limit: the file
// streams straight from the browser to Blob storage, and only the resulting URL
// comes back through the app. This route just mints a scoped, short-lived upload
// token — it never receives the file bytes itself.
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB — screen recordings get big.

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  try {
    const json = await handleUpload({
      request,
      body,
      // Mint the client token against the PRIVATE media store when it's
      // configured; undefined falls back to BLOB_READ_WRITE_TOKEN (public),
      // which is the pre-cutover behaviour.
      token: mediaUploadToken(),
      onBeforeGenerateToken: async () => {
        // Only signed-in users can upload; the token is minted per request and
        // restricted to image/video under the feedback prefix.
        const user = await getAuthenticatedUser();
        if (!user?.email) throw new Error('Not signed in');
        return {
          allowedContentTypes: ['image/*', 'video/*'],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ email: user.email }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to persist here — the client sends the returned URL along with
        // the feedback submission (POST) or the admin attach (PATCH), where it's
        // validated (must be a Blob URL) and stored. This callback only fires
        // when Blob can reach the app (i.e. not on plain localhost).
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error('POST /api/feedback/upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 400 });
  }
}
