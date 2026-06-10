// OpenAI TTS voices offered in the app. Nova is the default (warm, friendly,
// good for a coaching tone). The selection is stored per-browser.

export const TTS_VOICES = [
  { id: 'nova', name: 'Nova', description: 'Warm & friendly' },
  { id: 'alloy', name: 'Alloy', description: 'Neutral & balanced' },
  { id: 'onyx', name: 'Onyx', description: 'Deep & calm' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft & gentle' },
];

export const DEFAULT_TTS_VOICE = 'nova';

const STORAGE_KEY = 'tts_voice';

export function getSelectedVoice() {
  if (typeof window === 'undefined') return DEFAULT_TTS_VOICE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return TTS_VOICES.some((x) => x.id === v) ? v : DEFAULT_TTS_VOICE;
  } catch {
    return DEFAULT_TTS_VOICE;
  }
}

export function setSelectedVoice(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
