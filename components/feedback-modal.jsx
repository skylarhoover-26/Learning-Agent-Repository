'use client';

// The "Share feedback" modal, opened from the menu's "Send feedback" item.
// Mirrors the People-team dashboard feedback form: category, free text, and
// optional screenshots (click / drag-drop / paste). Submissions POST to
// /api/feedback and are reviewed by admins in the Admin Dashboard.

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, Loader2, Check } from 'lucide-react';

const CATEGORIES = ['Idea', 'Bug', 'Confusing', 'Praise', 'Other'];
const MAX_SHOTS = 4;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FeedbackModal({ open, onClose }) {
  const pathname = usePathname();
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');
  const [shots, setShots] = useState([]); // [{ name, dataUrl }]
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // Fresh form each time it opens.
  useEffect(() => {
    if (open) {
      setCategory('');
      setText('');
      setShots([]);
      setStatus('idle');
      setError(null);
    }
  }, [open]);

  const addFiles = useCallback(async (fileList) => {
    const images = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    const next = [];
    for (const f of images) {
      try {
        next.push({ name: f.name || 'screenshot', dataUrl: await fileToDataUrl(f) });
      } catch {
        // skip unreadable file
      }
    }
    setShots((prev) => [...prev, ...next].slice(0, MAX_SHOTS));
  }, []);

  // Paste-to-attach while the modal is open (matches the reference form).
  useEffect(() => {
    if (!open) return undefined;
    function onPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, addFiles]);

  // Escape to close.
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!text.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || null,
          text: text.trim(),
          screenshots: shots.map((s) => s.dataUrl),
          page: pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send feedback');
      }
      setStatus('done');
      setTimeout(onClose, 1200);
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 focus:border-brand focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share feedback"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-ink dark:text-slate-100">Share feedback</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Bugs, ideas, or anything that would make this more useful. Goes to the People team.
        </p>

        {status === 'done' ? (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-ink dark:text-slate-200">Thanks — feedback sent!</p>
          </div>
        ) : (
          <>
            <label className="block text-sm font-semibold text-ink dark:text-slate-200 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} mb-4`}>
              <option value="">Category (optional)</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-ink dark:text-slate-200 mb-1">Your feedback</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="What's working, what's confusing, what you wish it did…"
              className={`${inputClass} mb-4 resize-y`}
            />

            <label className="block text-sm font-semibold text-ink dark:text-slate-200 mb-1">Screenshots (optional)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="w-full px-3 py-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-brand transition-colors"
            >
              Add screenshots — click to upload, drag &amp; drop, or paste
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {shots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {shots.map((s, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.dataUrl}
                      alt={s.name}
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center"
                      aria-label="Remove screenshot"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!text.trim() || status === 'sending'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'sending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  'Send feedback'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
