// Source scanner. Fetches RSS / arXiv / blog feeds, dedupes by externalId,
// and persists new findings. Phase 1 implementation: pulls a handful of
// known feeds. Phase 2: pluggable adapters per source kind.

import { prisma } from "./db";

export type ScanFinding = {
  sourceName: string;
  externalId: string;
  title: string;
  url: string;
  publishedAt?: Date;
  raw: unknown;
};

const FEEDS: { name: string; url: string; kind: string }[] = [
  {
    name: "OpenAI blog",
    url: "https://openai.com/blog/rss.xml",
    kind: "rss",
  },
  {
    name: "Anthropic news",
    url: "https://www.anthropic.com/news/rss.xml",
    kind: "rss",
  },
  {
    name: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    kind: "rss",
  },
  {
    name: "arXiv (cs.CL)",
    url: "http://export.arxiv.org/rss/cs.CL",
    kind: "arxiv",
  },
  {
    name: "arXiv (cs.AI)",
    url: "http://export.arxiv.org/rss/cs.AI",
    kind: "arxiv",
  },
  {
    name: "Hacker News (AI)",
    url: "https://hnrss.org/newest?q=AI+OR+LLM&points=50",
    kind: "rss",
  },
];

// Minimal RSS parse — extracts <item><title><link><guid><pubDate>.
function parseRss(xml: string): ScanFinding[] {
  const items: ScanFinding[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) ?? [])[1]?.trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) ?? [])[1]?.trim();
    const guid =
      (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) ?? [])[1]?.trim() ?? link;
    const pub = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [])[1]?.trim();
    if (title && link) {
      items.push({
        sourceName: "",
        externalId: guid ?? link,
        title,
        url: link,
        publishedAt: pub ? new Date(pub) : undefined,
        raw: { title, link, pub },
      });
    }
  }
  return items;
}

export async function scanAllSources(): Promise<ScanFinding[]> {
  const all: ScanFinding[] = [];
  for (const f of FEEDS) {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(15_000) });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = parseRss(xml).map((i) => ({ ...i, sourceName: f.name }));
      all.push(...items);

      const source = await prisma.source.upsert({
        where: { name: f.name },
        create: { name: f.name, url: f.url, kind: f.kind, lastScan: new Date() },
        update: { lastScan: new Date() },
      });

      for (const i of items) {
        await prisma.finding.upsert({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: i.externalId,
            },
          },
          create: {
            sourceId: source.id,
            externalId: i.externalId,
            title: i.title,
            url: i.url,
            publishedAt: i.publishedAt,
            raw: i.raw as object,
          },
          update: {},
        });
      }
    } catch (e) {
      console.error(`[scanner] ${f.name} failed:`, e);
    }
  }
  return all;
}
