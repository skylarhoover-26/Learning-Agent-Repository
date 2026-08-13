import { NextResponse } from 'next/server';
import { FEEDS } from '@/lib/feeds';
import { parseRss } from '@/lib/parse-feed';
import { requireAdmin } from '@/lib/require-admin';
import { filterUnsafeContent } from '@/lib/content-safety';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request) {
  // The route F-09 names first: 13 outbound feed fetches plus a model call per
  // invocation. Reached Anthropic indirectly via filterUnsafeContent, which is
  // why an "imports Anthropic" scan misses it.
  const limited = await enforceRateLimit('curriculum/scan', 'curriculum', request);
  if (limited) return limited;

  const denied = await requireAdmin();
  if (denied) return denied;

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
