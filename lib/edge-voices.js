export const EDGE_VOICES = [
  { id: 'en-US-AriaNeural', name: 'Aria', gender: 'Female', description: 'Warm and professional' },
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', description: 'Friendly and conversational' },
  { id: 'en-US-AvaNeural', name: 'Ava', gender: 'Female', description: 'Calm and clear' },
  { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'Female', description: 'Bright and engaging' },
  { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', description: 'Standard and approachable' },
  { id: 'en-US-DavisNeural', name: 'Davis', gender: 'Male', description: 'Steady and professional' },
  { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'Male', description: 'Clear and modern' },
  { id: 'en-US-BrianNeural', name: 'Brian', gender: 'Male', description: 'Confident and authoritative' },
];

export const DEFAULT_VOICE_ID = 'en-US-AriaNeural';

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
