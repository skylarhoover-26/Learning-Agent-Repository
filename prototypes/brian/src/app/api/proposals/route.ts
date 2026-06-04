import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const proposals = await prisma.proposal.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      findings: { include: { finding: { include: { source: true } } } },
    },
  });

  return NextResponse.json({ proposals });
}
