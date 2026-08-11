import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { readJsonBlob, writeJsonBlob } from '@/lib/blob-json';
import Anthropic from '@anthropic-ai/sdk';
import { MODULES } from '@/lib/modules-data';
import { FEEDS } from '@/lib/feeds';
import { parseRss } from '@/lib/parse-feed';
import { classifyFindings, RUBRIC_VERSION } from '@/lib/news-relevance';
import { requireCronSecret } from '@/lib/cron-auth';
import { filterUnsafeContent } from '@/lib/content-safety';
import { refreshStaleSkillMarks } from '@/lib/skill-staleness';
import { APPROVED_CATEGORIES, dropExcluded } from '@/lib/ai-news';
import { writeDailyLessons, todayDateString } from '@/lib/daily-lessons';

// This route does the heaviest work in the app — 12 feed fetches + up to three
// sequential Claude calls — so it needs far more than the platform default or
// it times out before writing the daily lessons (which run last). 60s is ample.
export const maxDuration = 60;

const BLOB_FINDINGS_KEY = 'shared/curriculum_findings.json';
const BLOB_PROPOSALS_KEY = 'shared/curriculum_proposals.json';
// When the scan last ran. Kept in its OWN blob rather than added to the findings
// array, because the findings blob is read as a plain array by the proposals
// route and the curriculum-pipeline page — changing its shape would break both.
// Surfaced on the home page so a cron that stops running becomes visible
// ("Updated 6 days ago") instead of silently serving stale news forever.
const BLOB_SCAN_META_KEY = 'shared/curriculum_scan_meta.json';

async function readBlob(key) {
  return readJsonBlob(key, { fresh: false });
}

async function writeBlob(key, data) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    await writeJsonBlob(key, data);
  } catch (error) {
    console.error(`Blob write error (${key}):`, error);
  }
}

async function generateDailyLessons(client, findings) {
  if (findings.length === 0) return 0;

  const findingsList = findings
    .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
    .join('\n');

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

export async function GET(request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
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
    const existingIds = new Set(existing.map(f => f.externalId));
    const newFindings = allFindings.filter(f => !existingIds.has(f.externalId));

    const safeFindings = await filterUnsafeContent(newFindings);

    // Relevance guardrail: tag every new finding so the learner-facing surfaces
    // can show only model/tool/practice news. Nothing is dropped here — the
    // category is stored and the display layer filters (lib/ai-news.js), so the
    // rubric can be retuned later without re-scanning.
    const classified = await classifyFindings(safeFindings);

    // Back-fill anything stored before categorisation existed, so the guardrail
    // applies to the whole list rather than only to items added from now on.
    // Untagged findings are treated as NOT approved, so without this the card
    // would sit empty on top of a full backlog.
    // Stored items were parsed before the feed summary was extracted, so they have
    // no snippet. Anything still present in today's fetch can have one filled in
    // for free — no extra request, no model call. Do this BEFORE re-classifying, so
    // the classifier gets the blurb (which is what makes a vendor pitch obvious).
    // Titles are refreshed alongside summaries because the parser now decodes HTML
    // entities — stored titles still read literally as "OpenAI president says
    // it&#8217;s &#8216;building a family of devices&#8217;" until they're replaced.
    const freshById = new Map(allFindings.map((f) => [f.externalId, f]));
    const existingWithSummaries = existing.map((f) => {
      const fresh = freshById.get(f.externalId);
      if (!fresh) return f;
      return {
        ...f,
        title: fresh.title || f.title,
        summary: f.summary || fresh.summary || '',
      };
    });

    // Re-judge anything never classified OR classified under an older rubric.
    // Without the version check, tuning the rubric would only ever affect items
    // added afterwards — the mis-filed ones already stored would sit on the home
    // page forever.
    const stale = existingWithSummaries.filter((f) => !f.category || f.catV !== RUBRIC_VERSION);
    const rejudged = stale.length ? await classifyFindings(stale) : [];
    const rejudgedById = new Map(rejudged.map((f) => [f.externalId, f]));
    const existingTagged = existingWithSummaries.map((f) => rejudgedById.get(f.externalId) || f);

    // Security-incident items are discarded outright rather than stored hidden —
    // /ai-news is a normal learner page with a "show everything" toggle, so
    // hidden-but-present was still reachable. Applied to the back-filled existing
    // findings too, so previously-stored ones get cleaned out on this run.
    const merged = dropExcluded([...classified, ...existingTagged]).slice(0, 200);
    await writeBlob(BLOB_FINDINGS_KEY, merged);

    // Heatmap freshness (#54): if any of today's model/practice news actually
    // changes how people should prompt, mark the affected skills as worth a
    // refresh. Only today's newly-classified items are considered, so a re-judged
    // backlog can't re-flag skills. Best-effort — a failure here must not fail the
    // scan, since the news itself has already been written.
    try {
      const marks = await refreshStaleSkillMarks(classified);
      if (marks.length) {
        console.log(`skill staleness: flagged ${marks.map((m) => m.skill).join(', ')}`);
      }
    } catch (err) {
      console.error('skill staleness refresh failed:', err?.message || err);
    }
    // Stamp the scan AFTER the findings write, so a failed write can't leave a
    // fresh-looking timestamp over stale data.
    await writeBlob(BLOB_SCAN_META_KEY, {
      scannedAt: new Date().toISOString(),
      findingCount: merged.length,
      feedErrors: errors.length,
    });

    const client = new Anthropic();

    // Generate + write the daily lessons FIRST. They're the learner-facing output,
    // so they must not be starved by a later timeout or a proposals-call failure.
    let dailyLessonCount = 0;
    try {
      dailyLessonCount = await generateDailyLessons(client, merged.slice(0, 20));
    } catch (err) {
      console.error('Daily lesson generation error:', err);
      errors.push({ source: 'daily-lessons', error: err.message });
    }

    // Curriculum proposals are internal/admin-only — only run when new findings exist.
    let newProposals = [];
    if (safeFindings.length > 0) {
    const findingsList = merged
      .slice(0, 30)
      .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
      .join('\n');

    const moduleSummary = MODULES
      .map(m => `Module ${m.num}: ${m.title} — ${m.subtitle}`)
      .join('\n');

    const response = await client.messages.create({
      model: MODELS.haiku,
      max_tokens: 2000,
      system: `You are the AI Academy curriculum curator at Housecall Pro.

You receive (1) recent findings from AI sources we monitor, and (2) a list
of our existing modules. Decide which findings warrant a curriculum update.

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

    const text = response.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      newProposals = JSON.parse(match[0]).map(p => ({
        ...p,
        id: p.id || `prop_${Math.random().toString(36).slice(2, 10)}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        source_findings: (p.finding_indices || []).map(i => merged[i - 1]).filter(Boolean),
      }));
    }

    if (newProposals.length > 0) {
      const existingProposals = (await readBlob(BLOB_PROPOSALS_KEY)) || [];
      const allProposals = [...newProposals, ...existingProposals];
      await writeBlob(BLOB_PROPOSALS_KEY, allProposals);
    }
    }

    // Category breakdown is reported so the relevance rubric can be judged from
    // the response alone — without it, tuning the guardrail means guessing.
    const byCategory = {};
    for (const f of merged) {
      const c = f.category || 'unclassified';
      byCategory[c] = (byCategory[c] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      newFindings: safeFindings.length,
      totalFindings: merged.length,
      shownToLearners: merged.filter((f) => APPROVED_CATEGORIES.includes(f.category)).length,
      byCategory,
      newProposals: newProposals.length,
      dailyLessons: dailyLessonCount,
      errors,
    });
  } catch (error) {
    console.error('Daily curriculum scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
