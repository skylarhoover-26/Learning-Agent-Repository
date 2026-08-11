import { upload } from '@vercel/blob/client';

// Upload a video file DIRECTLY from the browser to Vercel Blob (via the
// /api/feedback/upload token route), bypassing the ~4.5MB serverless
// request-body limit — a base64 video in a JSON body would never fit. Returns
// the hosted Blob URL. Client-only (imports @vercel/blob/client).
export async function uploadFeedbackVideo(file) {
  const nameExt = (file.name?.split('.').pop() || '').toLowerCase();
  const ext = nameExt && nameExt.length <= 4 ? nameExt : file.type.includes('mp4') ? 'mp4' : 'webm';
  const result = await upload(`feedback-recordings/recording-${Date.now()}.${ext}`, file, {
    access: 'public',
    handleUploadUrl: '/api/feedback/upload',
    contentType: file.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm'),
    multipart: true, // resilient for large videos
  });
  return result.url;
}
