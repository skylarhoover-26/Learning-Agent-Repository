import { MODELS } from '@/lib/models';
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
    const { proposal } = await request.json();
    if (!proposal) {
      return NextResponse.json({ error: 'Missing proposal' }, { status: 400 });
    }

    const moduleSummary = MODULES.map(m => {
      const sectionTitles = (m.sections || []).map(s => s.title).join(', ');
      return `Module ${m.num}: ${m.title} — ${m.subtitle}\n  Sections: ${sectionTitles}`;
    }).join('\n');

    const sourceContext = (proposal.source_findings || [])
      .map(f => `- [${f.sourceName}] ${f.title}\n  ${f.url}`)
      .join('\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 1500,
      system: `You are the AI Academy curriculum editor at Housecall Pro.

You receive an approved curriculum update proposal and must generate the specific content changes.

For CONTENT UPDATE proposals: write the updated section content (1-2 paragraphs) and specify which module and section to update.
For NEW MODULE proposals: write a module outline (title, subtitle, 3-5 section titles with one-line descriptions).
For DEPRECATION proposals: explain what to remove and why, and suggest a replacement topic.

Return ONLY JSON:
{
  "changeType": "update" | "new_module" | "deprecation",
  "targetModule": "Module title (or null for new)",
  "targetSection": "Section title (or null)",
  "newContent": "The actual content to add or replace",
  "changeDescription": "One sentence summary of what changed and why",
  "sources": ["URL1", "URL2"]
}`,
      messages: [
        {
          role: 'user',
          content: `Existing modules:\n${moduleSummary}\n\nApproved proposal:\nTitle: ${proposal.title}\nType: ${proposal.type}\nRationale: ${proposal.summary}\nAffects: ${(proposal.affects || []).join(', ')}\n\nSource articles:\n${sourceContext}\n\nGenerate the content change.`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const patch = JSON.parse(match[0]);
      return NextResponse.json({
        patch: {
          ...patch,
          proposalId: proposal.id,
          appliedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      patch: {
        changeType: proposal.type.toLowerCase().replace(' ', '_'),
        targetModule: (proposal.affects || [])[0] || null,
        targetSection: null,
        newContent: proposal.summary,
        changeDescription: `Applied: ${proposal.title}`,
        sources: (proposal.source_findings || []).map(f => f.url),
        proposalId: proposal.id,
        appliedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/curriculum/apply error:', error);
    return NextResponse.json(
      { error: error.message || 'Apply failed' },
      { status: 500 }
    );
  }
}
