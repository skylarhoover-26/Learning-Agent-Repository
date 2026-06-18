'use client';

// Open an AI tool in a NEW WINDOW (a popup), not a browser tab, so the learner
// can keep it side-by-side with the coach. Passing width/height makes browsers
// open a separate window instead of a tab. Works the same for every tool.
export function openLlmWindow(url) {
  if (!url || typeof window === 'undefined') return;
  const w = 1100;
  const h = 860;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  window.open(
    url,
    '_blank',
    `popup=yes,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`
  );
}
