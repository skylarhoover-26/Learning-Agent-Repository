import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import { MODULES } from '@/lib/modules-data';
import { FEEDS } from '@/lib/feeds';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { writeDailyLessons, todayDateString } from '@/lib/daily-lessons';

const BLOB_FINDINGS_KEY = 'shared/curriculum_findings.json';
const BLOB_PROPOSALS_KEY = 'shared/curriculum_proposals.json';

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

async function readBlob(key) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeBlob(key, data) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    await put(key, JSON.stringify(data), {
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error(`Blob write error (${key}):`, error);
  }
}

async function filterUnsafeContent(findings) {
  if (findings.length === 0) return findings;
  try {
    const client = new Anthropic();
    const titles = findings.map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}`).join('\n');
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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

async function generateDailyLessonsFromFindings(client, findings) {
  if (findings.length === 0) return 0;

  const findingsList = findings
    .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: `You are a learning experience designer for Housecall Pro's AI Academy.

Given recent AI news and research, generate 4-5 daily micro-lessons that would be
valuable for home service professionals learning about AI. Each lesson should connect
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

    const merged = [...safeFindings, ...existing].slice(0, 200);
    await writeBlob(BLOB_FINDINGS_KEY, merged);

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
    const findingsList = merged
      .slice(0, 30)
      .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
      .join('\n');

    const moduleSummary = MODULES
      .map((m) => `Module ${m.num}: ${m.title} — ${m.subtitle}`)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
