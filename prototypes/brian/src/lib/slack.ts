// Slack notification helpers. Posts to incoming webhook(s) configured
// via SLACK_APPROVERS_WEBHOOK_URL. Approver handles are placeholders.
//
// Approvers (placeholders — replace with real Slack user IDs):
//   @brian.wells (Brian)
//   @skylar       (Skylar)
//   @bridget      (Bridget)

type Proposal = {
  id: string;
  title: string;
  type: string;
  severity: string;
  summary: string;
  confidence: number;
};

const APPROVER_HANDLES = ["@brian.wells", "@skylar", "@bridget"];

async function postToSlack(text: string, blocks?: unknown) {
  const url = process.env.SLACK_APPROVERS_WEBHOOK_URL;
  if (!url) {
    console.warn("[slack] SLACK_APPROVERS_WEBHOOK_URL not set, skipping notify");
    return;
  }
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, blocks }),
  });
}

export async function notifySlackOnNewProposal(p: Proposal) {
  const cc = APPROVER_HANDLES.join(" ");
  const text = `New AI Academy update needs review: *${p.title}*`;
  await postToSlack(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${cc}\n*New ${p.type.toLowerCase()} ready for review*\n*${p.title}*\n${p.summary}\n_confidence ${Math.round(p.confidence * 100)}% · severity ${p.severity}_`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Review in dashboard" },
          url: `${process.env.APP_URL ?? ""}/admin/curriculum`,
        },
      ],
    },
  ]);
}

export async function notifySlackOnDecision(
  p: Proposal,
  decision: "approved" | "rejected",
  actor: string,
) {
  const text = `${actor} ${decision} *${p.title}*`;
  await postToSlack(text);
}
