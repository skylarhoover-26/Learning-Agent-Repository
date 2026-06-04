// Cron endpoint hit by Vercel Cron 3x weekly (Mon/Wed/Fri).
// Scans configured sources, dedupes findings, asks Claude to propose
// curriculum updates, then notifies approvers in Slack.
//
// Wired to vercel.json. Auth via CRON_SECRET so only Vercel can invoke.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanAllSources } from "@/lib/scanner";
import { proposeUpdatesFromFindings } from "@/lib/curator";
import { notifySlackOnNewProposal } from "@/lib/slack";

export const maxDuration = 300; // 5 min

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const findings = await scanAllSources();
  const proposals = await proposeUpdatesFromFindings(findings);

  for (const p of proposals) {
    await notifySlackOnNewProposal(p);
  }

  return NextResponse.json({
    scanned: findings.length,
    proposed: proposals.length,
  });
}

// Helper: also expose a manual-trigger that requires an admin email cookie.
// (Stub — wire to your auth provider in Phase 2.)
export async function POST() {
  const findings = await scanAllSources();
  const proposals = await proposeUpdatesFromFindings(findings);
  return NextResponse.json({
    scanned: findings.length,
    proposed: proposals.length,
  });
}

// Silence unused-import warning when DB hasn't been migrated yet.
void prisma;
