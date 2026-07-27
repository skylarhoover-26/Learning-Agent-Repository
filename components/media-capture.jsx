'use client';

// Video-attach control for feedback. Uploads the chosen video DIRECTLY from the
// browser to Vercel Blob (via /api/feedback/upload), which sidesteps the ~4.5MB
// serverless request-body limit — screen recordings are far too big to send as a
// base64 data URL through a JSON body. On success it calls onUploaded(url) with
// the hosted Blob URL; the caller attaches that URL to the feedback record.

import { useRef, useState } from 'react';
import { uploadFeedbackVideo } from '@/lib/feedback-upload';
import { Paperclip, Loader2 } from 'lucide-react';

export default function MediaCapture({ onUploaded, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  async function onFilePicked(fileList) {
    const file = Array.from(fileList || []).find((f) => f.type.startsWith('video/'));
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadFeedbackVideo(file);
      onUploaded?.(url);
    } catch (e) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {uploading ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading video…
        </span>
      ) : (
        <>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled} className={btn} title="Attach a video file">
            <Paperclip className="w-3.5 h-3.5" /> Attach video
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              onFilePicked(e.target.files);
              e.target.value = ''; // allow re-picking the same file
            }}
          />
        </>
      )}
      {err && <span className="text-xs text-red-600 dark:text-red-400">{err}</span>}
    </div>
  );
}
