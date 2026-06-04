"use client";

import { ChevronDown, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { Role } from "@/lib/profile";

const ACCENT_PURPLE = "#623CC9";

type RoleCopy = {
  impact: string;
  tryThisWeek: string;
};

type WhatsNewItem = {
  id: string;
  title: string;
  source: string;
  publishedAgo: string;
  why: string;
  whyMatters: string;
  impacts: Record<Role, RoleCopy>;
};

// Curated demo content. In production this is generated weekly by the
// curator pipeline (see src/lib/curator.ts) and approved via Slack.
const ITEMS: WhatsNewItem[] = [
  {
    id: "gpt5-reasoning",
    title: "GPT-5 reasoning controls — pay only when you need them",
    source: "OpenAI blog",
    publishedAgo: "2 days ago",
    why: "OpenAI shipped a new `reasoning_effort` parameter (low / medium / high) plus a `verbosity` knob. Same model, but you tell it whether to think hard or move fast.",
    whyMatters:
      "Roughly: 'low' is ~3× cheaper and faster than 'high' on the same query. Most everyday work doesn't need deep reasoning — but the work that does, really does.",
    impacts: {
      sales: {
        impact:
          "For Sales, this is mostly a cost and speed win. First-draft replies, lead-qualification summaries, and meeting prep notes don't need deep reasoning — use 'low' and you'll get answers in <2 seconds. Save 'high' for renewal-pricing calls, contract redlines, and any time you're about to commit a number to a customer in writing — those are the places a wrong answer costs real money.",
        tryThisWeek:
          "Pick one weekly drafting task (e.g., your Friday pipeline summary). Run it on 'low' for a week. If the quality drops, you'll feel it; if it doesn't, you've cut your AI cost on that task.",
      },
      cs: {
        impact:
          "For CS, the trade-off is latency vs. accuracy. FAQ-style replies, ticket categorization, and routing decisions are fine on 'low' — customers won't notice the speed-up, but your queue depth will. The moment a ticket touches refunds, escalation, or a churn-risk customer, switch to 'high' even if the response takes 10 seconds — the small wait is invisible compared to the cost of a confidently-wrong answer to a frustrated customer.",
        tryThisWeek:
          "Find one ticket category you handle 20+ times a week (password resets, status checks). Test 'low' on those. Keep 'high' for any ticket flagged as a complaint.",
      },
      engineering: {
        impact:
          "Wire `reasoning_effort` into your service layer as a parameter, not a constant. Default to 'low' for most calls — including code completion, doc summarization, and most agent loops. Bump to 'high' for code review, debugging non-trivial issues, and security analysis. The cost difference at HCP scale is the difference between a $2k and $8k monthly bill on the same usage.",
        tryThisWeek:
          "In one of your team's existing Claude/GPT integrations, add `reasoning_effort` as a function argument. Set sensible defaults per call site. Track cost over a week.",
      },
      analytics: {
        impact:
          "Use 'low' for the first-pass exploration: 'what does this column mean,' 'sketch a SQL,' 'is this metric trending.' Use 'high' for the moment that matters: explaining anomalies in a deck to leadership, validating a model's predictions, or any analysis where the conclusion drives a business decision. Bonus — 'high' tends to flag its own uncertainty better.",
        tryThisWeek:
          "Take your last QBR-prep workflow and rerun it twice — once on 'low,' once on 'high.' Note where the answers diverge. That delta is your model uncertainty.",
      },
      people: {
        impact:
          "For People, the calibration is sensitivity. Day-to-day comms, calendar drafts, and policy lookups are fine on 'low.' Anything touching performance feedback, employee relations, comp conversations, or DEI-sensitive content — use 'high' and re-read the output yourself. The cost of a tone-deaf AI-generated People comm is far higher than 30 seconds of latency.",
        tryThisWeek:
          "Audit one comm you sent this week. Ask both 'low' and 'high' to critique it for tone, inclusivity, and clarity. Compare which feedback was more useful.",
      },
      other: {
        impact:
          "Default to 'low' for almost everything you do. Switch to 'high' when (a) the cost of a wrong answer is greater than 30 seconds of waiting, (b) you'd hesitate to forward the answer without checking it, or (c) it's something you'd ask a senior colleague before deciding.",
        tryThisWeek:
          "Pick one repetitive task. Use 'low' for it this week and see if quality holds. If it does, that's a permanent shift.",
      },
    },
  },
  {
    id: "anthropic-computer-use",
    title: "Anthropic Computer Use — agents can now drive your screen",
    source: "Anthropic news",
    publishedAgo: "5 days ago",
    why: "Claude can now click, type, and navigate desktop apps and web pages on your behalf. Released in beta. The early demos have it doing real multi-step workflows: opening Slack, finding a thread, summarizing it, posting a reply.",
    whyMatters:
      "Most useful for the boring repetitive stuff that lives in apps without APIs. Risk: it can make mistakes you wouldn't catch in time, so always test in a sandbox with reversible operations first.",
    impacts: {
      sales: {
        impact:
          "Where this hits Sales: lead-list cleanup, dedupe, logging notes across CRM and outreach tools, formatting weekly reports. The Friday-afternoon admin tax. If you can describe the steps you take, Claude can probably do steps 2-4 of them — you stay in the loop for steps 1 and 5 (decision and review). Don't let it touch anything that sends external comms unsupervised.",
        tryThisWeek:
          "Pick one repetitive Salesforce/HubSpot/CRM workflow you do every week (e.g., 'update opportunity stages and log notes for everyone I met with'). Try Claude on a 5-row dry run first. Verify each step.",
      },
      cs: {
        impact:
          "For CS, the candidate workflow is the multi-system shuffle: copying ticket details into the help system, then the billing system, then the CRM. Claude can chain those steps. Caveat: the agent will get something wrong eventually — what you need is a process where the wrong-thing is recoverable. Don't have it issue refunds; do have it draft refund tickets for human approval.",
        tryThisWeek:
          "Identify your team's most-hated copy-paste task across systems. Sketch the steps. Try Claude on it with a known test ticket where you can verify every output.",
      },
      engineering: {
        impact:
          "This is your territory. Practical use cases at HCP: legacy admin UIs that don't have APIs, vendor SaaS tools where scraping is the only integration option, multi-step QA flows. Architectural advice: treat the agent like a flaky human — design with idempotency, audit logs, and reversible primitives. The Anthropic team's prompt-engineering guide for computer-use is worth a read before you build anything serious.",
        tryThisWeek:
          "Pick one internal tool where the team complains about manual repetitive work. Build a 30-line proof-of-concept agent. Don't ship it — see how it fails first.",
      },
      analytics: {
        impact:
          "Where this hits Analytics: vendor SaaS dashboards that won't expose data via API, repetitive screenshot-and-paste work for stakeholder reports, multi-step data entry into reporting systems. Risk: the agent might confidently misread a chart. Always have it dump its observations to text first so you can verify before it acts.",
        tryThisWeek:
          "Take one weekly report you build manually because the data lives in a dashboard. See if Claude can read the dashboard and produce the summary you'd produce.",
      },
      people: {
        impact:
          "For People, this lights up multi-system HRIS tasks (onboarding paperwork that touches Workday + benefits + IT provisioning). Strong recommendation: don't let it touch anything employee-facing or anything in production HRIS until you've stress-tested it. The blast radius of an HRIS mistake (wrong title, wrong manager, wrong start date) is bigger than most teams.",
        tryThisWeek:
          "Pick a low-stakes repetitive admin task (e.g., compiling a list of who's reached an anniversary this month). Test Claude on it. Don't connect it to anything employee-facing yet.",
      },
      other: {
        impact:
          "Pick one repetitive 5-step computer task you do every week. See if Claude can do steps 2-4 of it while you stay in the loop for step 1 (start) and step 5 (verify and ship).",
        tryThisWeek:
          "Use the Anthropic API quickstart for computer-use. Try it on a sandbox task. Don't connect it to anything irreversible.",
      },
    },
  },
  {
    id: "hallucination-eval",
    title: "New research: agents hallucinate more when they use tools",
    source: "arXiv · 2604.20911",
    publishedAgo: "1 week ago",
    why: "A team at Berkeley evaluated tool-using agents (read API, query DB, fetch webpage, etc.) vs. chat-only models. Tool-using agents got the right *output format* but the wrong *facts* significantly more often, especially when chained tool calls were involved.",
    whyMatters:
      "This is counterintuitive — you'd think 'an agent that looks things up' would hallucinate less than 'a model relying on memory.' The opposite. The agent confidently mis-uses tool outputs. Verification matters more, not less, as agents get more capable.",
    impacts: {
      sales: {
        impact:
          "If you're using AI to look up account details, pricing, or contract terms before a customer call, double-check the numbers against the source system before you quote them out loud or in writing. The agent is more likely to misread a Salesforce field than to make up a number from scratch — and that's harder to catch because the answer feels grounded.",
        tryThisWeek:
          "Next time you ask AI to summarize a customer's account history, sample-check 3 specific facts (last contract value, last interaction date, owner) against the actual record. Notice how often it's off.",
      },
      cs: {
        impact:
          "Treat any AI-generated price, refund amount, policy claim, or eligibility statement as a draft. Don't paste it into a customer reply unchecked — the most damaging failure mode at HCP is 'AI told the customer the wrong thing about their plan.' One way to handle it: have the AI cite the source field/doc it pulled from, then verify the source.",
        tryThisWeek:
          "On 5 tickets this week, ask the AI to include 'source: <field name or doc>' for every factual claim. Verify those sources match.",
      },
      engineering: {
        impact:
          "When wiring tool-using agents, bake in a verification layer: re-read the tool output, check it against the agent's claim. The eval techniques in this paper are worth implementing — particularly the 'consistency check' where you ask the agent to defend its conclusion citing the tool output. If it can't, the conclusion is suspect.",
        tryThisWeek:
          "Pick one tool-using agent your team has shipped. Add a post-hoc check that compares the agent's stated conclusion to what the raw tool output actually says.",
      },
      analytics: {
        impact:
          "If you're using AI to query a database or analyze a CSV, sample-check 10% of results against the raw SQL or a spreadsheet formula. Plausible-but-wrong is the new failure mode — the answer will look reasonable, the rows will look real, but the count will be off. Especially watch out for joins and date filters.",
        tryThisWeek:
          "Take an AI-generated count from this week's work. Run the SQL yourself. Note any delta — and where it came from (filter? join? off-by-one?).",
      },
      people: {
        impact:
          "If AI summarizes someone's file or compiles their history (performance reviews, role moves, comp changes), treat the output as a draft only. Always check against the original record before acting on it or sharing it with another stakeholder. The risk in People work isn't speed — it's getting a fact wrong about a real person.",
        tryThisWeek:
          "On the next AI-generated summary of an employee's history, verify 3 specific facts (start date, last promotion, current title) against the source HRIS.",
      },
      other: {
        impact:
          "Treat tool-using AI like a smart-but-sloppy intern. The output format will look perfect; the specifics may not be. Always verify the facts that matter before forwarding or acting.",
        tryThisWeek:
          "On any AI output you forward this week, pick the 2 most-decision-critical facts and verify them against source. Make this a habit.",
      },
    },
  },
];

export function WhatsNewWidget({ role }: { role: Role }) {
  const [openId, setOpenId] = useState<string | null>(ITEMS[0].id);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="eyebrow"
            style={{
              color: ACCENT_PURPLE,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={12} /> What&apos;s new in AI · this week
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
            How it changes your job, specifically
          </div>
        </div>
        <span
          style={{
            background: "#EFECFA",
            color: ACCENT_PURPLE,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: ACCENT_PURPLE,
              animation: "pulse2 1.6s infinite",
              flexShrink: 0,
            }}
          />
          {ITEMS.length} updates
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ITEMS.map((item) => (
          <NewsItem
            key={item.id}
            item={item}
            role={role}
            open={openId === item.id}
            onToggle={() => setOpenId(openId === item.id ? null : item.id)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 10,
          background: "#FAFAFA",
          borderRadius: 8,
          fontSize: 11,
          color: "#616161",
          textAlign: "center",
        }}
      >
        Curated by AI · approved by HCP&apos;s AI Council · refreshes Mon · Wed · Fri
      </div>
    </div>
  );
}

function NewsItem({
  item,
  role,
  open,
  onToggle,
}: {
  item: WhatsNewItem;
  role: Role;
  open: boolean;
  onToggle: () => void;
}) {
  const copy = item.impacts[role];
  return (
    <div
      style={{
        border: `1px solid ${open ? "#D5C9F0" : "#E0E0E0"}`,
        borderRadius: 10,
        background: open ? "linear-gradient(135deg, #fff, #FAFAFA)" : "#fff",
        overflow: "hidden",
        transition: "border-color .2s ease",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: "12px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            color: open ? ACCENT_PURPLE : "#9E9E9E",
            display: "inline-flex",
            transition: "transform .2s ease",
            flexShrink: 0,
          }}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#212121", lineHeight: 1.4 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>
            {item.source} · {item.publishedAgo}
          </div>
        </div>
      </button>

      {open && (
        <div
          style={{
            padding: "0 14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            animation: "expandIn .25s ease",
          }}
        >
          <style>{`
            @keyframes expandIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <Section label="What changed" color="#9E9E9E">
            <div style={{ marginBottom: 6 }}>{item.why}</div>
            <div style={{ color: "#616161", fontSize: 12, fontStyle: "italic" }}>
              {item.whyMatters}
            </div>
          </Section>

          <div
            style={{
              padding: 14,
              background: "#EFECFA",
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.6,
              color: "#212121",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: ACCENT_PURPLE,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              For your role
            </div>
            {copy.impact}
          </div>

          <div
            style={{
              padding: 14,
              background: "#DCF9D7",
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.55,
              color: "#212121",
              borderLeft: "4px solid #00A344",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: "#00662B",
                textTransform: "uppercase",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={11} /> Try this week
            </div>
            {copy.tryThisWeek}
          </div>

          <a
            href="#"
            style={{
              fontSize: 12,
              color: ACCENT_PURPLE,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Read the source <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.55, color: "#424242" }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".08em",
          color,
          textTransform: "uppercase",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
