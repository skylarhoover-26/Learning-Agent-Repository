import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifySlackOnDecision } from "@/lib/slack";

const Body = z.object({
  decision: z.enum(["approved", "rejected"]),
  actor: z.string().email(),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json();
  const { decision, actor, note } = Body.parse(json);

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      status: decision,
      decidedAt: new Date(),
      decidedBy: actor,
      events: {
        create: { actor, action: decision, note },
      },
    },
  });

  // TODO: when decision === "approved", apply patch to lessons (Phase 2).

  await notifySlackOnDecision(proposal, decision, actor);

  return NextResponse.json({ proposal });
}
