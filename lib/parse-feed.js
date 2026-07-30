// Feed parsing for the AI-news scan. Handles BOTH RSS 2.0 (<item>) and Atom
// (<entry>), and is the single copy — this logic used to be duplicated verbatim
// in api/curriculum/{daily,scan,scan-now}, which is how the Atom gap below
// survived in three places at once.
//
// The Atom half is not hypothetical: The Verge's AI feed returns HTTP 200 with
// 10 <entry> elements and zero <item>. The old RSS-only parser found nothing,
// returned an empty array, and reported no error — so that source silently
// contributed zero findings on every single run while looking perfectly healthy
// in the scan's error list.

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim();
}

// How much summary to keep. Long enough to judge "is this worth a lesson?",
// short enough for a card.
const SUMMARY_MAX = 200;

// Feeds put their blurb in wildly different shapes, and two of them are useless
// as-is. Measured across the live feeds on 2026-07-30:
//   OpenAI/DeepMind/Mistral/MIT TR/Verge  134–364 chars — clean, use directly
//   VentureBeat                           13,141 chars — the entire article
//   arXiv                                 1,492 — abstract behind a metadata prefix
//   Hacker News                           "Article URL: … Comments URL: …" — no prose
//   Hugging Face                          no description tag at all
function cleanSummary(raw) {
  let s = stripTags(raw)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  // Hacker News' description is only the two links — no summary to show.
  if (/^Article URL:/i.test(s)) return '';

  // arXiv prefixes the abstract with identifiers: "arXiv:2607.24758v2 Announce
  // Type: new Abstract: <the actual text>".
  s = s.replace(/^arXiv:\S+\s*/i, '').replace(/^Announce Type:\s*\w+\s*/i, '').replace(/^Abstract:\s*/i, '');

  if (s.length <= SUMMARY_MAX) return s;
  // Truncate on a word boundary so it doesn't end mid-word.
  const cut = s.slice(0, SUMMARY_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// First populated summary-ish tag on the block.
function extractSummary(block, tags) {
  for (const tag of tags) {
    const text = tagText(block, tag);
    const cleaned = cleanSummary(text);
    if (cleaned) return cleaned;
  }
  return '';
}

// Pull one tag's text, tolerating CDATA.
function tagText(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`);
  return (block.match(re) || [])[1]?.trim();
}

function parseRssItems(xml, sourceName) {
  const items = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = tagText(block, 'title');
    const link = tagText(block, 'link');
    const guid = tagText(block, 'guid') || link;
    const pub = tagText(block, 'pubDate');
    if (title && link) {
      items.push({
        sourceName,
        externalId: guid || link,
        title: stripTags(title),
        url: link,
        publishedAt: pub || null,
        summary: extractSummary(block, ['description', 'content:encoded', 'summary']),
      });
    }
  }
  return items;
}

function parseAtomEntries(xml, sourceName) {
  const items = [];
  const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const title = tagText(block, 'title');
    // Atom links are an attribute, not element text. Prefer rel="alternate"
    // (the human-readable page) and fall back to the first href present.
    const link =
      (block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/) || [])[1] ||
      (block.match(/<link[^>]*href=["']([^"']+)["']/) || [])[1];
    const id = tagText(block, 'id') || link;
    const pub = tagText(block, 'published') || tagText(block, 'updated');
    if (title && link) {
      items.push({
        sourceName,
        externalId: id || link,
        title: stripTags(title),
        url: link,
        publishedAt: pub || null,
        summary: extractSummary(block, ['summary', 'content']),
      });
    }
  }
  return items;
}

// Returns [{ sourceName, externalId, title, url, publishedAt }].
// Tries RSS first, then Atom, so a feed that switches format keeps working.
export function parseFeed(xml, sourceName) {
  const rss = parseRssItems(xml, sourceName);
  if (rss.length) return rss;
  return parseAtomEntries(xml, sourceName);
}

// Kept as an alias so the three curriculum routes read the same as before.
export { parseFeed as parseRss };
