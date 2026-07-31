'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSelectedVoice } from '@/lib/tts-voices';

const TTS_TIMEOUT_MS = 20000;

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*] /gm, '')
    .replace(/^\s*\d+[.)] /gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

// --- Browser-TTS fallback (used only if the OpenAI route is unavailable) ---

function loadVoices() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length) {
      resolve(existing);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.onvoiceschanged = null;
      resolve(synth.getVoices() || []);
    };
    synth.onvoiceschanged = finish;
    setTimeout(finish, 1000);
  });
}

function pickBestVoice(voices) {
  if (!voices || !voices.length) return null;
  const english = voices.filter((v) => /^en[-_]?/i.test(v.lang));
  const pool = english.length ? english : voices;
  const score = (v) => {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (/natural|neural|premium|enhanced/.test(n)) s += 100;
    if (/google/.test(n)) s += 60;
    if (/samantha|ava|allison|serena|zoe|evan|nathan|jamie|aaron|joelle/.test(n)) s += 45;
    if (/microsoft .*online|aria|jenny|emma|brian|andrew|guy/.test(n)) s += 40;
    if (v.localService === false) s += 20;
    if (/en[-_]us/i.test(v.lang)) s += 10;
    if (v.default) s += 2;
    return s;
  };
  return pool.slice().sort((a, b) => score(b) - score(a))[0] || pool[0];
}

export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Playback position of the current audio, for a YouTube-style scrubber. Only
  // meaningful on the cached/fetched Audio path (not the browser-TTS fallback).
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const usingBrowserTtsRef = useRef(false);
  // Has the OpenAI route ever produced audio in this session? Decides whether a
  // later failure may fall back to the browser voice. See speak() (feedback #22).
  const openAiWorkedRef = useRef(false);
  // Playback speed multiplier. Applied live to the current audio element and to
  // any new utterance (browser fallback). Defaults to normal speed.
  const rateRef = useRef(1);

  // Set the playback speed. Takes effect immediately on audio that's already
  // playing, and is remembered for the next utterance.
  const setRate = useCallback((rate) => {
    const r = Math.max(0.5, Math.min(3, Number(rate) || 1));
    rateRef.current = r;
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  // Pre-generated audio cache: keyed by voice+text so a primed line plays
  // instantly with no per-scene fetch. Populated by prime(), read by speak().
  const audioCacheRef = useRef(new Map());
  const cacheKey = (cleaned) => `${getSelectedVoice()}::${cleaned}`;

  // Fetch and cache the audio for a list of texts up front (e.g. every scene of
  // a narrated lesson) so playback is instant and never pauses to load between
  // scenes. Best-effort: any line that fails to prime just falls back to a live
  // fetch when speak() reaches it. onProgress(done, total) drives a prep UI.
  const prime = useCallback(async (texts, onProgress) => {
    if (typeof window === 'undefined') return;
    const list = [...new Set((texts || []).map(stripMarkdown).filter(Boolean))];
    const total = list.length;
    let done = 0;
    onProgress?.(0, total);
    // Sequential keeps us well under the TTS route's rate limits; a handful of
    // short scenes primes in a few seconds.
    for (const cleaned of list) {
      const key = cacheKey(cleaned);
      if (!audioCacheRef.current.has(key)) {
        // One retry: a single transient failure here used to leave exactly one
        // line unprimed, which is how a lesson ended up with one scene in a
        // different voice (feedback #22).
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: cleaned, voice: getSelectedVoice() }),
            });
            if (res.ok) {
              const blob = await res.blob();
              if (blob.size >= 100) {
                audioCacheRef.current.set(key, URL.createObjectURL(blob));
                openAiWorkedRef.current = true;
                break;
              }
            }
          } catch {
            // fall through to the retry, then to a live fetch in speak()
          }
        }
      }
      done++;
      onProgress?.(done, total);
    }
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (usingBrowserTtsRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    usingBrowserTtsRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Attach playback-position tracking to an <audio> element (for the scrubber).
  const trackTime = useCallback((audio) => {
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
    const onDur = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onloadedmetadata = onDur;
    audio.ondurationchange = onDur;
  }, []);

  // Seek the current audio (YouTube-style scrubber / resume-to-time).
  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) {
      try {
        audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
        setCurrentTime(audio.currentTime);
      } catch { /* seeking before metadata is ready — ignore */ }
    }
  }, []);

  useEffect(() => {
    const cache = audioCacheRef.current;
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (abortRef.current) abortRef.current.abort();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // Free the pre-generated audio blobs.
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const speakBrowser = useCallback(async (cleaned) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('no browser tts');
    }
    const voices = await loadVoices();
    const best = pickBestVoice(voices);
    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(cleaned);
      if (best) {
        u.voice = best;
        u.lang = best.lang;
      }
      u.rate = rateRef.current;
      u.pitch = 1.0;
      usingBrowserTtsRef.current = true;
      u.onstart = () => { setIsSpeaking(true); setIsPaused(false); setIsLoading(false); };
      u.onend = () => { setIsSpeaking(false); setIsPaused(false); usingBrowserTtsRef.current = false; resolve(); };
      u.onerror = (e) => {
        usingBrowserTtsRef.current = false;
        setIsSpeaking(false);
        if (e.error === 'canceled' || e.error === 'interrupted') resolve();
        else reject(e);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }, []);

  const speak = useCallback(async (text) => {
    if (typeof window === 'undefined') return;

    stop();
    setError(null);
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;

    // Pre-generated line? Play it instantly, no fetch/loading. The cached URL is
    // kept (not revoked on end) so the scene can be replayed.
    const cachedUrl = audioCacheRef.current.get(cacheKey(cleaned));
    if (cachedUrl) {
      try {
        const audio = new Audio(cachedUrl);
        audio.playbackRate = rateRef.current;
        audioRef.current = audio;
        trackTime(audio);
        audio.onplay = () => { setIsSpeaking(true); setIsPaused(false); setIsLoading(false); };
        audio.onended = () => { setIsSpeaking(false); setIsPaused(false); audioRef.current = null; };
        audio.onerror = () => { setIsSpeaking(false); setIsPaused(false); setIsLoading(false); audioRef.current = null; };
        await audio.play();
        return;
      } catch {
        // fall through to a live fetch / browser fallback
      }
    }

    setIsLoading(true);

    // Fetch the line, retrying once on a transient failure. A single flaky
    // request is the common case, and before the retry it fell straight through
    // to the browser voice for that one line.
    async function fetchAudio() {
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        abortRef.current = controller;
        // Distinguish our own timeout from a stop()/next-scene abort: both surface
        // as AbortError, but a timeout is a real failure worth retrying and
        // reporting, while a deliberate stop must stay silent.
        let timedOut = false;
        const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, TTS_TIMEOUT_MS);
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleaned, voice: getSelectedVoice() }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error('TTS failed');
          const blob = await res.blob();
          if (blob.size < 100) throw new Error('Empty audio response');
          return blob;
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError' && !timedOut) throw err; // deliberate stop
          lastError = timedOut ? new Error('TTS timed out') : err;
        }
      }
      throw lastError || new Error('TTS failed');
    }

    try {
      const blob = await fetchAudio();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rateRef.current;
      audioRef.current = audio;
      trackTime(audio);
      audio.onplay = () => { setIsSpeaking(true); setIsPaused(false); setIsLoading(false); };
      audio.onended = () => { setIsSpeaking(false); setIsPaused(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); setIsPaused(false); setIsLoading(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
      openAiWorkedRef.current = true;
    } catch (err) {
      if (err.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      // Only fall back to the browser voice if the OpenAI route has never worked
      // in this session — i.e. it's unavailable, and a consistent browser voice
      // beats silence. Once it HAS worked, switching for a single failed line is
      // what made the narrator audibly change voice mid-lesson (feedback #22);
      // better to surface a retry and keep one voice throughout.
      if (openAiWorkedRef.current) {
        console.error('TTS error (keeping the narration voice, not falling back):', err);
        setError('That line did not load. Tap play to try again.');
        setIsSpeaking(false);
        return;
      }
      try {
        await speakBrowser(cleaned);
      } catch {
        console.error('TTS error:', err);
        setError('Audio unavailable. Try again.');
        setIsSpeaking(false);
        setIsLoading(false);
      }
    }
  }, [stop, speakBrowser, trackTime]);

  const pause = useCallback(() => {
    if (usingBrowserTtsRef.current && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (usingBrowserTtsRef.current && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, []);

  const toggle = useCallback((text) => {
    if (isSpeaking && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      speak(text);
    }
  }, [isSpeaking, isPaused, pause, resume, speak]);

  return { isSpeaking, isPaused, isLoading, error, currentTime, duration, speak, pause, resume, seek, stop, toggle, setRate, prime };
}
