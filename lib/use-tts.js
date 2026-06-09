'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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

const DEFAULT_VOICE = 'en-US-AriaNeural';
const TTS_TIMEOUT_MS = 15000;

function speakWithBrowserTts(text) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Browser TTS not supported'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onend = resolve;
    utterance.onerror = (e) => {
      if (e.error === 'canceled') resolve();
      else reject(e);
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function useTts({ voice = DEFAULT_VOICE } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const usingBrowserTtsRef = useRef(false);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
        body: JSON.stringify({ text: cleaned, voice }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      if (blob.size < 100) throw new Error('Empty audio response');

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setIsLoading(false);
      };
      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setIsLoading(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError' || err.message === 'TTS failed' || err.message === 'Empty audio response') {
        try {
          usingBrowserTtsRef.current = true;
          setIsLoading(false);
          setIsSpeaking(true);
          await speakWithBrowserTts(cleaned);
          usingBrowserTtsRef.current = false;
          setIsSpeaking(false);
          return;
        } catch {
          usingBrowserTtsRef.current = false;
        }
      }

      if (err.name !== 'AbortError') {
        console.error('TTS error:', err);
      }
      setError('Audio unavailable. Try again later.');
      setIsSpeaking(false);
      setIsLoading(false);
    }
  }, [voice, stop]);

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

  return { isSpeaking, isPaused, isLoading, error, speak, pause, resume, stop, toggle };
}
