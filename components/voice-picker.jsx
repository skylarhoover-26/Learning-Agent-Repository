'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { TTS_VOICES, getSelectedVoice, setSelectedVoice } from '@/lib/tts-voices';

export default function VoicePicker() {
  const [voice, setVoice] = useState('nova');
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    setVoice(getSelectedVoice());
    return () => stopAudio();
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
  }

  // Play a short sample in the chosen voice so you can hear it as you pick.
  async function playPreview(id) {
    stopAudio();
    const name = TTS_VOICES.find((v) => v.id === id)?.name || 'this';
    setPreviewing(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Hi, I'm ${name}. I'll help guide your lessons.`, voice: id }),
      });
      if (!res.ok) throw new Error('tts unavailable');
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      await audio.play();
    } catch {
      // TTS not configured or failed — silently skip the preview.
    } finally {
      setPreviewing(false);
    }
  }

  function change(e) {
    const v = e.target.value;
    setVoice(v);
    setSelectedVoice(v);
    playPreview(v);
  }

  return (
    <div className="px-4 py-2.5 flex items-center gap-3 text-sm text-ink dark:text-slate-200">
      <button
        type="button"
        onClick={() => playPreview(voice)}
        disabled={previewing}
        aria-label="Preview voice"
        title="Preview voice"
        className="shrink-0 text-slate-500 dark:text-slate-400 hover:text-brand transition-colors disabled:opacity-60"
      >
        {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <span className="flex-1">Voice</span>
      <select
        value={voice}
        onChange={change}
        onClick={(e) => e.stopPropagation()}
        className="text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        {TTS_VOICES.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </div>
  );
}
