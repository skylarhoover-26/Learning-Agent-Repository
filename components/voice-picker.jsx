'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS_VOICES, getSelectedVoice, setSelectedVoice } from '@/lib/tts-voices';

export default function VoicePicker() {
  const [voice, setVoice] = useState('nova');

  useEffect(() => {
    setVoice(getSelectedVoice());
  }, []);

  function change(e) {
    const v = e.target.value;
    setVoice(v);
    setSelectedVoice(v);
  }

  return (
    <div className="px-4 py-2.5 flex items-center gap-3 text-sm text-ink dark:text-slate-200">
      <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
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
