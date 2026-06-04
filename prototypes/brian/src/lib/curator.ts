// Curator: takes raw findings, asks Claude to identify which findings
// merit a curriculum update, drafts the proposed change, and persists
// it as a Proposal awaiting approver review.
//
// Phase 1 stub — wires the API call but skeleton-only logic. The real
// flow (compare against existing lessons, draft patches) lands in P2.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db";
import { ScanFinding } from "./scanner";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ProposedUpdate = {
  title: string;
  type: "NEW MODULE" | "CONTENT UPDATE" | "DEPRECATION";
  severity: "high" | "med" | "low";
  summary: string;
  affects: string[];
  diff: { added: number; edited: number; removed: number };
  confidence: number;
  findingIds: string[];
};

export async function proposeUpdatesFromFindings(findings: ScanFinding[]) {
  if (findings.length === 0) return [];

  const findingsList = findings
    .slice(0, 50)
    .map(
      (f, i) =>
        `${i + 1}. [${f.sourceName}] ${f.title}\n   ${f.url}`,
    )
    .join("\n");

  const tracks = await prisma.track.findMany({
    include: { modules: { include: { lessons: true } } },
  });
  const trackSummary = tracks
    .map((t) => `Track: ${t.title}\n` + t.modules.map((m) => `  - ${m.title} (Lv ${m.level})`).join("\n"))
    .join("\n");

  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    system: `You are the AI Academy curriculum curator at Housecall Pro.

You receive (1) recent findings from AI sources we monitor, and (2) a list
of our existing modules. Decide which findings warrant a curriculum update.

For each warranted update, output JSON matching:
{
  "title": "Short title shown to approvers",
  "type": "NEW MODULE" | "CONTENT UPDATE" | "DEPRECATION",
  "severity": "high" | "med" | "low",
  "summary": "2-sentence rationale",
  "affects": ["Module title (Lv N)", ...],
  "diff": { "added": int, "edited": int, "removed": int },
  "confidence": 0.0-1.0,
  "finding_indices": [1-based indices into the findings list]
}

Output ONLY a JSON array. No prose.`,
    messages: [
      {
        role: "user",
        content: `Existing modules:\n${trackSummary}\n\nRecent findings:\n${findingsList}\n\nPropose updates.`,
      },
    ],
  });

  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("");

  let proposed: Omit<ProposedUpdate, "findingIds"> &
    { finding_indices: number[] }[];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    proposed = match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }

  const created = [];
  for (const u of proposed as unknown as (Omit<ProposedUpdate, "findingIds"> & {
    finding_indices: number[];
  })[]) {
    const proposal = await prisma.proposal.create({
      data: {
        title: u.title,
        type: u.type,
        severity: u.severity,
        summary: u.summary,
        affects: u.affects,
        diffAdded: u.diff.added,
        diffEdited: u.diff.edited,
        diffRemoved: u.diff.removed,
        confidence: u.confidence,
      },
    });

    await prisma.approvalEvent.create({
      data: {
        proposalId: proposal.id,
        actor: "AI Curator",
        action: "discovered",
        note: `From ${u.finding_indices.length} source(s)`,
      },
    });

    created.push(proposal);
  }
  return created;
}
