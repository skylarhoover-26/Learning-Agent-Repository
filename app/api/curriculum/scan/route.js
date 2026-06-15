import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

async function filterUnsafeContent(findings) {
  if (findings.length === 0) return findings;
  try {
    const client = new Anthropic();
    const titles = findings.map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}`).join('\n');
    const response = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 500,
      system: `You are a content safety filter for a corporate AI learning platform at Housecall Pro.

Review each article title and flag any that are:
- Political (partisan politics, elections, political opinion)
- Sexually explicit or violent
- Hate speech or discriminatory
- Conspiracy theories or misinformation
- Not related to AI, technology, or professional development

Return ONLY a JSON array of 1-based indices of articles to REMOVE.
If all articles are safe, return [].
Output ONLY the JSON array, no prose.`,
      messages: [{ role: 'user', content: `Review these articles:\n${titles}` }],
    });
    const text = response.content[0].text.trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return findings;
    const removeIndices = new Set(JSON.parse(match[0]));
    return findings.filter((_, i) => !removeIndices.has(i + 1));
  } catch {
    return findings;
  }
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

  const safeFindings = await filterUnsafeContent(allFindings);

  return NextResponse.json({
    findings: safeFindings,
    scannedAt: new Date().toISOString(),
    sources: FEEDS.length,
    filtered: allFindings.length - safeFindings.length,
    errors,
  });
}
