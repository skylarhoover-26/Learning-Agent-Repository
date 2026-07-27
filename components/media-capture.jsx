'use client';

// Screen-recording + video-attach control for feedback. Both paths upload the
// file DIRECTLY from the browser to Vercel Blob (via /api/feedback/upload),
// which sidesteps the ~4.5MB serverless request-body limit — screen recordings
// with audio are far too big to send as a base64 data URL through a JSON body.
// On success it calls onUploaded(url) with the hosted Blob URL; the caller is
// responsible for attaching that URL to the feedback record.

import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { Video, Square, Paperclip, Loader2 } from 'lucide-react';

// Cap recordings so a forgotten session can't produce a monster file.
const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes

// Pick the best container/codec the browser can actually record.
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const canRecord =
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

export default function MediaCapture({ onUploaded, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState(null);

  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const cleanupRef = useRef(null); // stops tracks / closes AudioContext
  const timerRef = useRef(null);
  const autoStopRef = useRef(null);

  // Belt-and-suspenders: tear down any live capture if the component unmounts
  // mid-recording (e.g. the modal closes).
  useEffect(() => () => cleanupRef.current?.(), []);

  const uploadFile = useCallback(
    async (file, ext) => {
      setUploading(true);
      setErr(null);
      try {
        const name = `feedback-recordings/recording-${Date.now()}.${ext}`;
        const result = await upload(name, file, {
          access: 'public',
          handleUploadUrl: '/api/feedback/upload',
          contentType: file.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm'),
          multipart: true, // resilient for large recordings
        });
        onUploaded?.(result.url);
      } catch (e) {
        setErr(e?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  async function startRecording() {
    if (disabled || recording || uploading) return;
    setErr(null);
    let display;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // tab / system audio where the browser supports it
      });
    } catch (e) {
      // User cancelled the picker, or permission denied — nothing to report.
      if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') {
        setErr(e?.message || 'Could not start screen recording');
      }
      return;
    }

    // Best-effort mic capture, then mix every audio source into ONE track —
    // MediaRecorder only records a single audio track, so system + mic must be
    // merged via WebAudio. If mic is blocked we just record whatever audio the
    // display gave us (possibly none), and the video still records fine.
    let mic = null;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      /* no mic / denied — continue */
    }

    let audioCtx = null;
    const displayAudio = display.getAudioTracks();
    const micAudio = mic ? mic.getAudioTracks() : [];
    const audioStreams = [];
    if (displayAudio.length) audioStreams.push(new MediaStream(displayAudio));
    if (micAudio.length) audioStreams.push(new MediaStream(micAudio));

    let audioTrack = null;
    if (audioStreams.length === 1) {
      audioTrack = audioStreams[0].getAudioTracks()[0];
    } else if (audioStreams.length > 1) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      for (const s of audioStreams) audioCtx.createMediaStreamSource(s).connect(dest);
      audioTrack = dest.stream.getAudioTracks()[0];
    }

    const videoTrack = display.getVideoTracks()[0];
    const combined = new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack]);

    const mime = pickMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(combined, mime ? { mimeType: mime } : undefined);
    } catch (e) {
      display.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      setErr(e?.message || 'Recording is not supported in this browser');
      return;
    }

    chunksRef.current = [];
    recorderRef.current = recorder;

    const cleanup = () => {
      display.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
    cleanupRef.current = cleanup;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      cleanup();
      setRecording(false);
      setElapsed(0);
      const type = mime || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (blob.size > 0) await uploadFile(blob, type.includes('mp4') ? 'mp4' : 'webm');
    };

    // If the user ends sharing from the browser's own control bar, stop too.
    videoTrack.addEventListener('ended', () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    });

    recorder.start();
    setRecording(true);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    autoStopRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    }, MAX_RECORDING_MS);
  }

  function stopRecording() {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
  }

  async function onFilePicked(fileList) {
    const file = Array.from(fileList || []).find((f) => f.type.startsWith('video/'));
    if (!file) return;
    const ext = (file.name?.split('.').pop() || '').toLowerCase();
    await uploadFile(file, ext && ext.length <= 4 ? ext : file.type.includes('mp4') ? 'mp4' : 'webm');
  }

  const btn =
    'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      {recording ? (
        <button type="button" onClick={stopRecording} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-pulse">
          <Square className="w-3.5 h-3.5 fill-current" /> Stop recording · {fmtTime(elapsed)}
        </button>
      ) : uploading ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading recording…
        </span>
      ) : (
        <>
          {canRecord && (
            <button type="button" onClick={startRecording} disabled={disabled} className={btn} title="Record your screen (with audio) and attach it">
              <Video className="w-3.5 h-3.5" /> Record screen
            </button>
          )}
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
