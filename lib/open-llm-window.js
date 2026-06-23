'use client';

// Open an AI tool in a NEW WINDOW (a popup), not a browser tab, so the learner
// can keep it side-by-side with the coach. Passing width/height makes browsers
// open a separate window instead of a tab.
//
// We REUSE one window per tool: clicking "Open Claude" twice should bring the
// existing Claude window forward (keeping that session), not spawn a brand-new
// one each time. To do that we keep a live handle per tool and just focus it
// when it's still open. Reuse only works if we DON'T pass `noopener` (which
// forces a detached, un-targetable window and returns null), so we drop it —
// these are trusted, learner-chosen tool URLs.
const openWindows = new Map();

// A stable window name per tool so the browser itself also tends to reuse the
// same window (e.g. after our in-memory handle is lost on a full page load).
function windowNameFor(key) {
  return 'llm_' + String(key).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}

// Default the reuse key to the URL's HOSTNAME so every link to the same tool
// shares one window — e.g. a "gemini.google.com" link in the lesson prose and
// the "Open Gemini" button (gemini.google.com/app) refocus the SAME window
// instead of spawning two.
function hostKey(url) {
  try {
    return new URL(url, window.location.href).hostname;
  } catch {
    return url;
  }
}

export function openLlmWindow(url, key) {
  if (!url || typeof window === 'undefined') return;
  key = key || hostKey(url);

  // Already have this tool's window open? Just bring it forward — don't start a
  // new session by reloading it.
  const existing = openWindows.get(key);
  if (existing && !existing.closed) {
    try {
      existing.focus();
      return;
    } catch {
      // handle went stale (e.g. closed) — fall through and open fresh
    }
  }

  const w = 1100;
  const h = 860;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  const win = window.open(
    url,
    windowNameFor(key),
    `popup=yes,width=${w},height=${h},left=${left},top=${top}`
  );
  if (win) openWindows.set(key, win);
}
