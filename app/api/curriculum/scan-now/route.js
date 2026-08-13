import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { readJsonBlob, writeJsonBlob } from '@/lib/blob-json';
import Anthropic from '@anthropic-ai/sdk';
import { MODULES } from '@/lib/modules-data';
import { FEEDS } from '@/lib/feeds';
import { parseRss } from '@/lib/parse-feed';
import { classifyFindings } from '@/lib/news-relevance';
import { dropExcluded } from '@/lib/ai-news';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { writeDailyLessons, todayDateString } from '@/lib/daily-lessons';
import { filterUnsafeContent } from '@/lib/content-safety';
import { formatFindings, QUARANTINE_NOTE } from '@/lib/untrusted';

const BLOB_FINDINGS_KEY = 'shared/curriculum_findings.json';
const BLOB_PROPOSALS_KEY = 'shared/curriculum_proposals.json';
// See the note in api/curriculum/daily — an admin-run scan stamps the same
// timestamp the home page reads, so "Updated just now" is true after a manual run.
const BLOB_SCAN_META_KEY = 'shared/curriculum_scan_meta.json';

async function readBlob(key) {
  return readJsonBlob(key, { fresh: false });
}

async function writeBlob(key, data) {
  try {
    // Overwrite in place. Do NOT delete first: a del+put leaves the pathname
    // returning 404 for a short window afterwards, so a read straight after a
    // write misses. writeJsonBlob already passes allowOverwrite, and
    // lib/blob-store.js moved off del+put for this exact reason. Stale public
    // copies from before the private-store cutover are handled once by
    // scripts/migrate-blobs-private.mjs --cleanup, not on every write.
    await writeJsonBlob(key, data);
  } catch (error) {
    console.error(`Blob write error (${key}):`, error);
  }
}

async function generateDailyLessonsFromFindings(client, findings) {
  if (findings.length === 0) return 0;

  const findingsList = formatFindings(findings);

  const response = await client.messages.create({
    model: MODELS.haiku,
    max_tokens: 2000,
    system: `You are a learning experience designer for Housecall Pro's AI Academy.

Given recent AI news and research, generate 4-5 daily micro-lessons that would be
valuable for Housecall Pro EMPLOYEES learning to apply AI to their own jobs — product,
marketing, engineering, support, sales, ops, and enablement people at a software company.
Home-service businesses are their CUSTOMERS, not their own line of work, so never frame a
lesson as what a contractor or technician would do. Each lesson should connect
real-world AI developments to practical workplace applications.

Mix difficulty levels and categories. Make topics specific and actionable, not generic.

${QUARANTINE_NOTE}

Output ONLY a JSON array where each item has:
{
  "title": "Catchy lesson title (max 60 chars)",
  "description": "One sentence explaining what the learner will gain",
  "category": "Applied AI" | "Prompting" | "Technical" | "Strategy" | "Writing",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "duration": "5 min" | "10 min" | "15 min",
  "topic": "Detailed topic string for the AI lesson generator (be specific)",
  "format": "interactive",
  "finding_index": 1-based index of the finding that inspired this lesson
}

No prose, only the JSON array.`,
    messages: [
      {
        role: 'user',
        content: `Today's AI findings:\n${findingsList}\n\nGenerate daily lessons.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return 0;

  const rawLessons = JSON.parse(match[0]);
  const today = todayDateString();

  const lessons = rawLessons.map((l, i) => ({
    id: `dl_${today.replace(/-/g, '')}_${i}`,
    title: l.title,
    description: l.description,
    category: l.category || 'Applied AI',
    difficulty: l.difficulty || 'Intermediate',
    duration: l.duration || '10 min',
    topic: l.topic,
    format: l.format || 'interactive',
    source: l.finding_index ? {
      title: findings[l.finding_index - 1]?.title || '',
      url: findings[l.finding_index - 1]?.url || '',
      sourceName: findings[l.finding_index - 1]?.sourceName || '',
    } : null,
    pinned: false,
    pinnedBy: null,
  }));

  await writeDailyLessons(today, {
    date: today,
    generatedAt: new Date().toISOString(),
    lessons,
  });

  return lessons.length;
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
          return parseRss(xml, feed.name).slice(0, 10);
        } catch (err) {
          clearTimeout(timeout);
          errors.push({ source: feed.name, error: err.message });
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') allFindings.push(...result.value);
    }

    const existing = (await readBlob(BLOB_FINDINGS_KEY)) || [];
    const existingIds = new Set(existing.map((f) => f.externalId));
    const newFindings = allFindings.filter((f) => !existingIds.has(f.externalId));

    const safeFindings = await filterUnsafeContent(newFindings);

    // Same relevance guardrail as the cron (see api/curriculum/daily). The
    // back-fill of older untagged findings lives only in the cron, so an admin
    // re-scan stays fast.
    const classified = await classifyFindings(safeFindings);

    // Security incidents are discarded, not hidden — see lib/ai-news.js.
    const merged = dropExcluded([...classified, ...existing]).slice(0, 200);
    await writeBlob(BLOB_FINDINGS_KEY, merged);
    await writeBlob(BLOB_SCAN_META_KEY, {
      scannedAt: new Date().toISOString(),
      findingCount: merged.length,
      feedErrors: errors.length,
    });

    const client = new Anthropic();

    if (safeFindings.length === 0) {
      let dailyLessonCount = 0;
      try {
        dailyLessonCount = await generateDailyLessonsFromFindings(client, merged.slice(0, 20));
      } catch (err) {
        errors.push({ source: 'daily-lessons', error: err.message });
      }
      return NextResponse.json({
        ok: true,
        message: 'No new findings since last scan',
        scannedAt: new Date().toISOString(),
        newFindings: 0,
        totalFindings: merged.length,
        newProposals: 0,
        dailyLessons: dailyLessonCount,
        errors,
      });
    }
    const findingsList = formatFindings(merged, { limit: 30 });

    const moduleSummary = MODULES
      .map((m) => `Module ${m.num}: ${m.title} — ${m.subtitle}`)
      .join('\n');

    const response = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 2000,
      system: `You are the AI Academy curriculum curator at Housecall Pro.

You receive (1) recent findings from AI sources we monitor, and (2) a list
of our existing modules. Decide which findings warrant a curriculum update.

${QUARANTINE_NOTE}

For each warranted update (max 5), output JSON matching:
{
  "id": "prop_<random 8 char string>",
  "title": "Short title shown to approvers",
  "type": "NEW MODULE" | "CONTENT UPDATE" | "DEPRECATION",
  "severity": "high" | "med" | "low",
  "summary": "2-sentence rationale",
  "affects": ["Module title"],
  "confidence": 0.0-1.0,
  "finding_indices": [1-based indices into the findings list],
  "status": "pending"
}

Output ONLY a JSON array. No prose. If no updates are warranted, return [].`,
      messages: [
        {
          role: 'user',
          content: `Existing modules:\n${moduleSummary}\n\nRecent findings:\n${findingsList}\n\nPropose updates.`,
        },
      ],
    });

    let newProposals = [];
    const text = response.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      newProposals = JSON.parse(match[0]).map((p) => ({
        ...p,
        id: p.id || `prop_${Math.random().toString(36).slice(2, 10)}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        source_findings: (p.finding_indices || []).map((i) => merged[i - 1]).filter(Boolean),
      }));
    }

    if (newProposals.length > 0) {
      const existingProposals = (await readBlob(BLOB_PROPOSALS_KEY)) || [];
      const allProposals = [...newProposals, ...existingProposals];
      await writeBlob(BLOB_PROPOSALS_KEY, allProposals);
    }

    let dailyLessonCount = 0;
    try {
      dailyLessonCount = await generateDailyLessonsFromFindings(client, merged.slice(0, 20));
    } catch (err) {
      console.error('Daily lesson generation error:', err);
      errors.push({ source: 'daily-lessons', error: err.message });
    }

    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      newFindings: safeFindings.length,
      totalFindings: merged.length,
      newProposals: newProposals.length,
      dailyLessons: dailyLessonCount,
      errors,
    });
  } catch (error) {
    console.error('POST /api/curriculum/scan-now error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
