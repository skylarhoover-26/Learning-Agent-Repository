export const EDGE_VOICES = [
  // Natural "multilingual" neural voices — the most human-sounding, conversational options.
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava', gender: 'Female', description: 'Warm, natural, conversational' },
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew', gender: 'Male', description: 'Relaxed, natural, conversational' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma', gender: 'Female', description: 'Friendly and expressive' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian', gender: 'Male', description: 'Casual and easygoing' },
  // Classic neural voices (more "assistant"-like).
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', description: 'Friendly assistant' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', description: 'Standard and approachable' },
];

export const DEFAULT_VOICE_ID = 'en-US-AvaMultilingualNeural';

export function speedToSsmlRate(speed) {
  const pct = Math.round((speed - 1) * 100);
  if (pct === 0) return '+0%';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
