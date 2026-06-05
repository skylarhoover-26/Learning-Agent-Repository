import { NextResponse } from 'next/server';
import { FEEDS } from '@/lib/feeds';

function parseRss(xml, sourceName) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]?.trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]?.trim();
    const guid = (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1]?.trim() || link;
    const pub = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim();
    if (title && link) {
      items.push({
        sourceName,
        externalId: guid || link,
        title: title.replace(/<[^>]+>/g, '').trim(),
        url: link,
        publishedAt: pub || null,
      });
    }
  }
  return items;
}

export async function POST() {
  const allFindings = [];
  const errors = [];

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'HCP-AI-Learning-Platform/1.0' },
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const items = parseRss(xml, feed.name);
        return items.slice(0, 10);
      } catch (err) {
        clearTimeout(timeout);
        errors.push({ source: feed.name, error: err.message });
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allFindings.push(...result.value);
    }
  }

  return NextResponse.json({
    findings: allFindings,
    scannedAt: new Date().toISOString(),
    sources: FEEDS.length,
    errors,
  });
}
