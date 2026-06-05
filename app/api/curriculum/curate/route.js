import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODULES } from '@/lib/modules-data';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export async function POST(request) {
  try {
    const { findings } = await request.json();
    if (!findings || findings.length === 0) {
      return NextResponse.json({ proposals: [] });
    }

    const findingsList = findings
      .slice(0, 30)
      .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`)
      .join('\n');

    const moduleSummary = MODULES
      .map(m => `Module ${m.num}: ${m.title} — ${m.subtitle}`)
      .join('\n');

    const response = await getClient().messages.create({
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

    let text = response.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const proposals = JSON.parse(match[0]).map(p => ({
        ...p,
        id: p.id || `prop_${Math.random().toString(36).slice(2, 10)}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        source_findings: (p.finding_indices || []).map(i => findings[i - 1]).filter(Boolean),
      }));
      return NextResponse.json({ proposals });
    }

    return NextResponse.json({ proposals: [] });
  } catch (error) {
    console.error('POST /api/curriculum/curate error:', error);
    return NextResponse.json(
      { error: error.message || 'Curation failed' },
      { status: 500 }
    );
  }
}
