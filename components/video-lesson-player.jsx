'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Play, Pause, SkipBack, SkipForward, RotateCcw,
  Loader2, Volume2, CheckCircle,
} from 'lucide-react';
import { useTts } from '@/lib/use-tts';
import BookLoader from '@/components/book-loader';

/**
 * VideoLessonPlayer — the "prefer to watch" alternative to a chat-driven lesson.
 * Fetches a linear narrated script for a topic, then plays it as an auto-advancing
 * narrated slideshow: each scene is read aloud (OpenAI TTS) and advances when the
 * narration finishes. Play/pause, previous/next, and replay controls are provided.
 */
export default function VideoLessonPlayer({ topic, format = 'standard', onClose }) {
  const [script, setScript] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [finished, setFinished] = useState(false);

  const { isSpeaking, isLoading: ttsLoading, speak, stop } = useTts();

  // Tracks whether the CURRENT scene has actually started speaking, so we only
  // auto-advance on a real narration-end (not before audio has begun).
  const startedSpeakingRef = useRef(false);
  const playingRef = useRef(isPlaying);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);

  const scenes = script?.scenes || [];
  const scene = scenes[sceneIdx];
  const total = scenes.length;

  // --- Load the script once ---
  useEffect(() => {
    let cancelled = false;
    setScript(null);
    setLoadError(null);
    fetch('/api/lesson/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, format }),
    })
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(new Error(d.error || 'Failed')))))
      .then((data) => {
        if (cancelled) return;
        if (!data.scenes || !data.scenes.length) throw new Error('No scenes returned');
        setScript(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Failed to generate the video.');
      });
    return () => { cancelled = true; };
  }, [topic, format]);

  // --- Narrate the current scene whenever it changes (while playing) ---
  useEffect(() => {
    if (!scene || finished) return;
    startedSpeakingRef.current = false;
    if (playingRef.current) {
      speak(scene.narration);
    }
    // Stop any audio when leaving this scene.
    return () => stop();
  }, [sceneIdx, script, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Track that narration has begun for this scene ---
  useEffect(() => {
    if (isSpeaking) startedSpeakingRef.current = true;
  }, [isSpeaking]);

  // --- Auto-advance when narration finishes ---
  useEffect(() => {
    if (!isPlaying || ttsLoading || isSpeaking) return;
    if (!startedSpeakingRef.current) return; // hasn't spoken yet this scene
    // Narration just ended. Advance after a brief beat.
    const timer = setTimeout(() => {
      if (!playingRef.current) return;
      if (sceneIdx < total - 1) {
        setSceneIdx((i) => i + 1);
      } else {
        setFinished(true);
        setIsPlaying(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isSpeaking, ttsLoading, isPlaying, sceneIdx, total]);

  // --- Controls ---
  const togglePlay = useCallback(() => {
    if (finished) return;
    setIsPlaying((p) => {
      const next = !p;
      if (!next) {
        stop();
      } else {
        startedSpeakingRef.current = false;
        if (scene) speak(scene.narration);
      }
      return next;
    });
  }, [finished, scene, speak, stop]);

  const goPrev = useCallback(() => {
    stop();
    setFinished(false);
    setSceneIdx((i) => Math.max(0, i - 1));
    setIsPlaying(true);
  }, [stop]);

  const goNext = useCallback(() => {
    stop();
    if (sceneIdx < total - 1) {
      setSceneIdx((i) => i + 1);
      setIsPlaying(true);
    } else {
      setFinished(true);
      setIsPlaying(false);
    }
  }, [stop, sceneIdx, total]);

  const replay = useCallback(() => {
    stop();
    setFinished(false);
    setSceneIdx(0);
    setIsPlaying(true);
  }, [stop]);

  const handleClose = useCallback(() => {
    stop();
    onClose?.();
  }, [stop, onClose]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute -top-2 right-0 -translate-y-full sm:translate-y-0 sm:-top-12 text-slate-300 hover:text-white flex items-center gap-1.5 text-sm font-medium"
          aria-label="Close video"
        >
          <X className="w-5 h-5" /> Close
        </button>

        {/* Loading */}
        {!script && !loadError && (
          <div className="bg-slate-900 rounded-2xl p-12 border border-slate-800">
            <BookLoader message={`Creating your video on ${topic}...`} size="lg" />
            <p className="text-center text-slate-500 text-xs mt-4">Writing the script and preparing narration.</p>
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div className="bg-slate-900 rounded-2xl p-10 border border-slate-800 text-center">
            <p className="text-red-400 font-medium mb-4">{loadError}</p>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* Player */}
        {script && scene && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            {/* Scene "stage" */}
            <div className="relative aspect-video flex flex-col justify-center px-8 sm:px-14 py-8">
              {/* Title chip */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-300 bg-brand-900/40 px-2.5 py-1 rounded-full">
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  Scene {sceneIdx + 1} of {total}
                </span>
              </div>

              {finished ? (
                <div className="text-center">
                  <div className="text-5xl mb-4">🎬</div>
                  <h2 className="text-2xl font-bold text-white mb-2">That&apos;s a wrap!</h2>
                  <p className="text-slate-400 mb-6">{script.title}</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={replay}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Replay
                    </button>
                    <button
                      onClick={handleClose}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand-600 transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {scene.title && (
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5 leading-tight">{scene.title}</h2>
                  )}
                  {scene.keyPoints && scene.keyPoints.length > 0 && (
                    <ul className="space-y-2.5">
                      {scene.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-slate-200 text-lg">
                          <CheckCircle className="w-5 h-5 text-brand-400 mt-1 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Caption (the spoken narration) */}
            {!finished && (
              <div className="px-8 sm:px-14 pb-2">
                <p className="text-slate-300 text-sm leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 min-h-[3.5rem]">
                  {scene.narration}
                </p>
              </div>
            )}

            {/* Progress dots */}
            <div className="px-8 sm:px-14 pt-3 flex gap-1.5">
              {scenes.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i < sceneIdx || finished ? 'bg-brand' : i === sceneIdx ? 'bg-brand-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="px-8 sm:px-14 py-4 flex items-center justify-center gap-4">
              <button
                onClick={goPrev}
                disabled={sceneIdx === 0 && !finished}
                className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Previous scene"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={finished ? replay : togglePlay}
                className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-600 transition-all shadow-lg"
                aria-label={finished ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
              >
                {ttsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : finished ? (
                  <RotateCcw className="w-6 h-6" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </button>
              <button
                onClick={goNext}
                disabled={finished}
                className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                aria-label="Next scene"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
