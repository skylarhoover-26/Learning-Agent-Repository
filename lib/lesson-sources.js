// Working out which pages a lesson was actually built from.
//
// Split out of lib/ai.js so it can be tested without pulling in the Anthropic SDK
// — this is the code that decides what we tell a learner informed their lesson, so
// it needs to be verifiable rather than merely plausible.

import { isApprovedSource } from './doc-sources';

// Search result titles are whatever the page gave the crawler, and docs sites serve
// markdown with YAML front matter — so one real citation came back as
// "--- title: Prompting best practices" and rendered that way under the lesson.
// Tidy the wrapper off rather than showing a learner our plumbing.
export function cleanSourceTitle(raw, host) {
  let t = String(raw || '').trim();
  t = t.replace(/^-{3,}\s*/, '');            // leading front-matter fence
  t = t.replace(/\s*-{3,}$/, '');            // trailing fence
  t = t.replace(/^title\s*:\s*/i, '');       // the front-matter key itself
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return host || '';
  // Long doc titles carry a site suffix ("… | n8n Docs") that the host line beside
  // them already says; truncate rather than wrap to three lines.
  return t.length > 95 ? `${t.slice(0, 92).trimEnd()}…` : t;
}

// Every page the search RETURNED. Not the citation list — a search that returns
// five results and informs two of them must not credit all five. Used only as the
// set of URLs a citation is allowed to be.
export function extractSearchResults(response) {
  const out = new Map();
  for (const block of response?.content || []) {
    if (block?.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      const url = typeof result?.url === 'string' ? result.url.trim() : '';
      if (!url || out.has(url)) continue;
      // Re-check against the same allowlist the search was configured with, so a
      // citation can never be a third-party page even if the search config drifts
      // or a redirect lands somewhere else.
      if (!isApprovedSource(url)) continue;
      let host = '';
      try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { host = ''; }
      out.set(url, {
        title: cleanSourceTitle(result?.title, host) || url,
        url,
        host,
      });
    }
  }
  return out;
}

// URLs the API itself marked as cited, from the citation metadata attached to text
// blocks. This is the strongest available "actually used" signal because the API
// adds it, not the model.
export function extractCitedUrls(response) {
  const urls = new Set();
  for (const block of response?.content || []) {
    if (!Array.isArray(block?.citations)) continue;
    for (const c of block.citations) {
      const url = typeof c?.url === 'string' ? c.url.trim() : '';
      if (url) urls.add(url);
    }
  }
  return urls;
}

/**
 * The sources a lesson should show: pages that actually informed it.
 *
 * Two signals, unioned:
 *  - citation metadata the API attached to the response, and
 *  - the URLs the model listed in `sourcesUsed`, INTERSECTED with what the search
 *    really returned.
 *
 * That intersection is the important part. Taking the model's list on its own would
 * let it write a plausible URL from memory, and a fabricated citation is worse than
 * none — it looks authoritative and sends someone to a 404. Taking every search
 * result instead would credit documents the lesson never used, which is its own kind
 * of dishonesty: a citation is a claim that this page shaped what you just read.
 *
 * Empty when nothing can be confirmed, and the UI drops the block entirely.
 */
export function resolveUsedSources(response, declared) {
  const results = extractSearchResults(response);
  if (results.size === 0) return [];

  const used = extractCitedUrls(response);
  for (const raw of Array.isArray(declared) ? declared : []) {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (url && results.has(url)) used.add(url);
  }

  // Nothing confirmed as used — cite nothing rather than falling back to "all the
  // results", which is exactly the over-citing this exists to prevent.
  const confirmed = [...used].filter((u) => results.has(u));
  // Five is plenty under a lesson; more reads as a bibliography.
  return confirmed.slice(0, 5).map((u) => results.get(u));
}

