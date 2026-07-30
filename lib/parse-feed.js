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
