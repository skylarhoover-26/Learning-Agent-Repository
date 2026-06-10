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

// getVoices() is often empty until the engine finishes loading. Resolve once it
// has voices (via the voiceschanged event), with a short timeout fallback.
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

// Browsers ship a mix of voices; the OS defaults (e.g. macOS "Samantha") sound
// robotic. Score the available English voices and pick the most natural one —
// "Natural"/"Neural"/"Premium"/"Enhanced" voices and Google's network voice are
// noticeably more human than the basic local ones.
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
    if (v.localService === false) s += 20; // network voices tend to be higher quality
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
  const utteranceRef = useRef(null);
  const bestVoiceRef = useRef(null);

  const supported = typeof window !== 'undefined' && !!window.speechSynthesis;

  // Warm up the voice list so the first "Listen" click already has the best voice.
  useEffect(() => {
    if (!supported) return;
    loadVoices().then((voices) => {
      bestVoiceRef.current = pickBestVoice(voices);
    });
  }, [supported]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(async (text) => {
    if (!supported) {
      setError('Audio is not supported in this browser.');
      return;
    }

    stop();
    setError(null);

    const cleaned = stripMarkdown(text);
    if (!cleaned) return;

    try {
      setIsLoading(true);
      const voice = bestVoiceRef.current || pickBestVoice(await loadVoices());
      bestVoiceRef.current = voice;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setIsLoading(false);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
      };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.error('TTS error:', e.error);
          setError('Audio unavailable. Try again.');
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setIsLoading(false);
        utteranceRef.current = null;
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('TTS error:', err);
      setError('Audio unavailable. Try again.');
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [supported, stop]);

  const pause = useCallback(() => {
    if (supported && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [supported]);

  const resume = useCallback(() => {
    if (supported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [supported]);

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
