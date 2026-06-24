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
  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const usingBrowserTtsRef = useRef(false);
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
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (abortRef.current) abortRef.current.abort();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
    setIsLoading(true);

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

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rateRef.current;
      audioRef.current = audio;
      audio.onplay = () => { setIsSpeaking(true); setIsPaused(false); setIsLoading(false); };
      audio.onended = () => { setIsSpeaking(false); setIsPaused(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); setIsPaused(false); setIsLoading(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch (err) {
      clearTimeout(timeoutId);
      // Fall back to the browser voice if the OpenAI route is unavailable.
      try {
        setIsLoading(false);
        await speakBrowser(cleaned);
      } catch {
        if (err.name !== 'AbortError') {
          console.error('TTS error:', err);
          setError('Audio unavailable. Try again.');
        }
        setIsSpeaking(false);
        setIsLoading(false);
      }
    }
  }, [stop, speakBrowser]);

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

  return { isSpeaking, isPaused, isLoading, error, speak, pause, resume, stop, toggle, setRate };
}
