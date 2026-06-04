"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  Check,
  Code,
  Headphones,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Profile,
  Role,
  ROLE_LABEL,
  SKILL_LABEL,
  SkillKey,
  saveProfile,
} from "@/lib/profile";
import { HcpAppBar } from "./Shared";
import { CalibrationChart } from "./CalibrationChart";

const ACCENT = "#0E6FBE";

type Answer = {
  text: string;
  // partial credit per dimension
  scores: Partial<Record<SkillKey, number>>;
};

type Question = {
  id: string;
  primary: SkillKey;
  prompt: string;
  setup?: string;
  answers: Answer[];
};

// Three scenario questions calibrated for the demo. Each contributes
// to one primary dimension (full weight) and bleeds into related ones.
// Scenarios are written so the right answer requires real judgment, not
// "pick the longest, most-thoughtful-sounding option." Each has at least
// one plausible-but-flawed option that tests for a common misconception.
const QUESTIONS: Question[] = [
  {
    id: "privacy",
    primary: "privacy",
    setup:
      "Your team uses an HCP-approved AI chat tool. The vendor's docs explicitly say 'we don't train on your inputs.' A teammate is using it to draft a renewal pitch and pastes in the customer's org ID, renewal date, last 5 invoice amounts, and account exec name.",
    prompt: "What's the issue here, if any?",
    answers: [
      {
        // Sounds reasonable but conflates "doesn't train" with "isn't logged"
        text: "Nothing — the tool is approved and explicitly says it doesn't train on inputs.",
        scores: { privacy: 0.2 },
      },
      {
        // Misses that minimization > field-level triage
        text: "The renewal date is fine, but the invoice amounts may count as financial data — strip those.",
        scores: { privacy: 0.5, prompting: 0.2 },
      },
      {
        // Best — minimization principle, regardless of tool approval
        text: "Even on an approved tool, paste only what's needed for the task. None of that data shapes the pitch tone you're drafting.",
        scores: { privacy: 1.0, prompting: 0.5, comms: 0.3 },
      },
      {
        // Common misconception — contractual data sharing rarely covers AI inputs
        text: "Generally fine — the customer agreed to data sharing in the contract.",
        scores: { privacy: 0.1 },
      },
    ],
  },
  {
    id: "prompting",
    primary: "prompting",
    setup:
      "You have 200 customer interview transcripts. Your VP wants 'the top issues' for a leadership presentation tomorrow. You have ~4 hours.",
    prompt: "Which approach holds up?",
    answers: [
      {
        // Common 'good prompt' answer — but single-shot at this scale is fragile
        text: "One prompt: 'Find the top 3 themes from these transcripts. Quote one example per theme.'",
        scores: { prompting: 0.5, comms: 0.2 },
      },
      {
        // Best — staged with verification
        text: "Three stages: (1) extract issues from each transcript, (2) cluster them, (3) re-read 5 source transcripts to verify the clusters reflect reality.",
        scores: { prompting: 1.0, eval: 0.6, data: 0.5 },
      },
      {
        // Persona prompts work for tone, fragile for analysis
        text: "Tell Claude to act like a senior PM and give you what they'd present to leadership.",
        scores: { prompting: 0.35 },
      },
      {
        // Common misconception: same prompt + consistency = correctness
        text: "Run the same prompt 3 times. If themes converge, that's signal. Use the consistent set.",
        scores: { prompting: 0.2 },
      },
    ],
  },
  {
    id: "comms",
    primary: "comms",
    setup:
      "A 5-year customer (no prior complaints) sends a curt email at 8am: 'Cancel my account, this isn't working.' That's the entire message. You're at your desk with AI ready.",
    prompt: "What's the best move?",
    answers: [
      {
        // Sounds like the 'prompting best practice' answer but treats this like a templating problem
        text: "Ask Claude to draft 3 versions: empathetic / problem-solving / retention-focused. Pick the most fitting.",
        scores: { comms: 0.5, prompting: 0.4 },
      },
      {
        // Counter-intuitive correct answer — the right move is sometimes no AI
        text: "Pick up the phone. AI can't read 5 years of context. Use AI afterward to log the call and draft the follow-up.",
        scores: { comms: 1.0, eval: 0.4 },
      },
      {
        // Decent — diagnose-first reply, but still an email when a call would land better
        text: "Ask Claude to draft a curiosity-first one-liner: 'What changed?' — keep the door open.",
        scores: { comms: 0.65, prompting: 0.4 },
      },
      {
        // Easy-wrong — diagnoses without understanding, signals desperation
        text: "Ask Claude to write an apology and a 20% retention offer.",
        scores: { comms: 0.15 },
      },
    ],
  },
  {
    id: "eval",
    primary: "eval",
    setup:
      "A customer says 'I called last month and was told the refund window is 60 days, not 30.' You ask Claude to verify. Claude returns a confident yes — 60 days — citing what looks like an official source link.",
    prompt: "What do you do first?",
    answers: [
      {
        // Easy-wrong — trusting AI's source citation without clicking it
        text: "Reply confirming 60 days. Claude found the source.",
        scores: { eval: 0.05 },
      },
      {
        // Right idea, wrong scope — clicking the source still misses the temporal issue
        text: "Click the source link, verify the document. Then reply.",
        scores: { eval: 0.5, privacy: 0.2 },
      },
      {
        // Best — temporal reasoning. Today's policy ≠ the policy at the time they called.
        text: "Check what the policy said *last month* when they actually called. AI sources reflect today's docs, not the version that was active then.",
        scores: { eval: 1.0, comms: 0.5, data: 0.3 },
      },
      {
        // Common error: 'more sources' isn't truth, especially with AI search
        text: "Ask Claude to find evidence for both 30 and 60. Reply with whichever has more sources backing it.",
        scores: { eval: 0.2 },
      },
    ],
  },
  {
    id: "agents",
    primary: "agents",
    setup:
      "Your AI ticket-categorization agent has been live 2 weeks. Your team says 'it's great — better than us.' Your manager asks if you can expand it to also set ticket priority.",
    prompt: "What do you do first?",
    answers: [
      {
        // Easy-wrong — anecdote ≠ measurement, momentum is a trap
        text: "Expand it — the team's positive and momentum matters. Ship priority next sprint.",
        scores: { agents: 0.1 },
      },
      {
        // Best — proactive measurement before scoping up
        text: "Set up accuracy tracking: have humans re-categorize 5% of its decisions weekly. Measure for 4 weeks before scoping up.",
        scores: { agents: 1.0, eval: 0.6, data: 0.4 },
      },
      {
        // Decent — lagging audit, defensible second-best
        text: "Audit the past 2 weeks: pull 50 random tickets, ask the team if categorization was right, then decide.",
        scores: { agents: 0.65, eval: 0.4 },
      },
      {
        // Common misconception — sentiment ≠ accuracy, formality doesn't fix that
        text: "Survey the team formally. Strong positive sentiment + manager ask = green light to expand.",
        scores: { agents: 0.15 },
      },
    ],
  },
  {
    id: "data",
    primary: "data",
    setup:
      "You're prepping a churn analysis for tomorrow's QBR. You ask Claude: 'In this 5,000-row CSV, what's the average tenure of churned vs. retained customers?' Claude returns: '14.2 months churned vs. 31.6 months retained' — directionally what you'd expect.",
    prompt: "What do you do with that?",
    answers: [
      {
        // Easy-wrong — believable answer ≠ correct answer, especially for QBR
        text: "Use the numbers in the deck. The directional difference is what matters; the exact number is fine for a QBR.",
        scores: { data: 0.05 },
      },
      {
        // Best — reproducibility, not faith
        text: "Ask Claude to write the SQL or Python that produces those numbers. Run it. Now you can defend the deck.",
        scores: { data: 1.0, eval: 0.6, prompting: 0.4 },
      },
      {
        // Common error — same query 3 times tests consistency, not correctness
        text: "Ask Claude the same question 3 times. If the numbers match, use them.",
        scores: { data: 0.15, eval: 0.1 },
      },
      {
        // OK sanity check — but doesn't catch a join or filter bug
        text: "Spot-check by averaging tenure on 10 random churned + 10 retained rows manually. If close, ship it.",
        scores: { data: 0.55, eval: 0.4 },
      },
    ],
  },
];

// Tasks the learner regularly does with AI. Multi-select on Step 4.
// Used both as a usage signal and as a prior bump for related skills.
const AI_TASKS: { id: string; label: string; bumps: SkillKey[] }[] = [
  { id: "drafting", label: "Drafting emails / replies", bumps: ["comms", "prompting"] },
  { id: "summarize", label: "Summarizing meetings or docs", bumps: ["prompting", "eval"] },
  { id: "research", label: "Researching / answering questions", bumps: ["eval", "prompting"] },
  { id: "brainstorm", label: "Brainstorming / ideation", bumps: ["prompting"] },
  { id: "edit", label: "Editing & rewriting", bumps: ["comms", "prompting"] },
  { id: "code", label: "Writing / fixing code", bumps: ["prompting", "agents"] },
  { id: "data", label: "Analyzing data or making charts", bumps: ["data", "prompting"] },
  { id: "automate", label: "Building automations / agents", bumps: ["agents", "data"] },
];

const TOOLS = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "copilot", label: "Copilot" },
  { id: "gemini", label: "Gemini" },
  { id: "none", label: "None of these" },
];

const ROLE_OPTIONS: { id: Role; Icon: typeof Briefcase }[] = [
  { id: "sales", Icon: TrendingUp },
  { id: "cs", Icon: Headphones },
  { id: "engineering", Icon: Code },
  { id: "analytics", Icon: BarChart3 },
  { id: "people", Icon: Users },
  { id: "other", Icon: Briefcase },
];

const STEPS = [
  "Welcome",
  "Role",
  "Usage",
  "Tasks",
  "Privacy",
  "Prompting",
  "Comms",
  "Eval",
  "Agents",
  "Data",
  "SelfRate",
  "Result",
] as const;
type StepName = (typeof STEPS)[number];

// Index of the first scenario step in STEPS — used to map step idx → question.
const FIRST_SCENARIO_IDX = 4;

export function Onboarding() {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const [role, setRole] = useState<Role | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [frequency, setFrequency] = useState<Profile["frequency"] | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [tasks, setTasks] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selfRating, setSelfRating] = useState<Record<SkillKey, number>>({
    prompting: 0.5,
    comms: 0.5,
    privacy: 0.5,
    agents: 0.5,
    eval: 0.5,
    data: 0.5,
  });

  // Confidence (0..1) per dimension — sharpens as we collect signals.
  // Stages: priors from usage → bumps from selected tasks → scenario answers.
  const skills = useMemo<Record<SkillKey, number>>(() => {
    const prior = priorFromUsage(frequency, tools);
    const result = { ...prior };
    // Bump dimensions for each task the learner regularly performs.
    for (const task of tasks) {
      const def = AI_TASKS.find((t) => t.id === task);
      if (!def) continue;
      for (const k of def.bumps) {
        result[k] = clamp01(result[k] + 0.05);
      }
    }
    for (const q of QUESTIONS) {
      const ai = answers[q.id];
      if (ai === undefined) continue;
      const a = q.answers[ai];
      for (const [k, v] of Object.entries(a.scores) as [SkillKey, number][]) {
        result[k] = clamp01(result[k] * 0.5 + v * 0.5);
      }
    }
    return result;
  }, [frequency, tools, tasks, answers]);

  const router = useRouter();

  const finish = () => {
    if (!role || !frequency) return;
    const profile: Profile = {
      role,
      isManager,
      frequency,
      tools,
      tasks,
      skills,
      selfRating,
      completedAt: new Date().toISOString(),
    };
    saveProfile(profile);
    router.push("/");
  };

  const isScenarioStep = (s: StepName) =>
    s === "Privacy" ||
    s === "Prompting" ||
    s === "Comms" ||
    s === "Eval" ||
    s === "Agents" ||
    s === "Data";

  const scenarioForIdx = (idx: number) =>
    QUESTIONS[idx - FIRST_SCENARIO_IDX];

  const canAdvance = () => {
    if (step === "Welcome") return true;
    if (step === "Role") return !!role;
    if (step === "Usage") return !!frequency;
    if (step === "Tasks") return true; // tasks are optional
    if (isScenarioStep(step)) {
      return answers[scenarioForIdx(stepIdx).id] !== undefined;
    }
    if (step === "SelfRate") return true;
    return true;
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HcpAppBar activeTab="learn" accent={ACCENT} density="cozy" />

      <ProgressStrip stepIdx={stepIdx} total={STEPS.length} />

      <div
        style={{
          flex: 1,
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
          padding: "24px 24px 64px",
        }}
      >
        <div
          key={stepIdx}
          style={{
            animation: "stepFade .4s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <style>{`
            @keyframes stepFade {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {step === "Welcome" && <WelcomeStep />}
          {step === "Role" && (
            <RoleStep
              role={role}
              setRole={setRole}
              isManager={isManager}
              setIsManager={setIsManager}
            />
          )}
          {step === "Usage" && (
            <UsageStep
              frequency={frequency}
              setFrequency={setFrequency}
              tools={tools}
              setTools={setTools}
            />
          )}
          {step === "Tasks" && (
            <TasksStep tasks={tasks} setTasks={setTasks} />
          )}
          {isScenarioStep(step) && (
            <ScenarioStep
              question={scenarioForIdx(stepIdx)}
              questionNumber={stepIdx - FIRST_SCENARIO_IDX + 1}
              totalQuestions={QUESTIONS.length}
              answerIdx={answers[scenarioForIdx(stepIdx).id]}
              setAnswerIdx={(i) =>
                setAnswers({
                  ...answers,
                  [scenarioForIdx(stepIdx).id]: i,
                })
              }
            />
          )}
          {step === "SelfRate" && (
            <SelfRateStep
              selfRating={selfRating}
              setSelfRating={setSelfRating}
            />
          )}
          {step === "Result" && (
            <ResultStep
              role={role!}
              isManager={isManager}
              skills={skills}
              selfRating={selfRating}
              onFinish={finish}
            />
          )}
        </div>

        {step !== "Result" && (
          <div
            style={{
              maxWidth: 760,
              margin: "24px auto 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {stepIdx > 0 ? (
              <button
                onClick={() => setStepIdx(stepIdx - 1)}
                className="hcp-btn hcp-btn--text"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            ) : (
              <span />
            )}
            <button
              disabled={!canAdvance()}
              onClick={() => setStepIdx(stepIdx + 1)}
              className="hcp-btn hcp-btn--contained hcp-btn--lg"
              style={{
                opacity: canAdvance() ? 1 : 0.4,
                cursor: canAdvance() ? "pointer" : "not-allowed",
              }}
            >
              <span>
                {step === "Welcome"
                  ? "Let's go"
                  : step === "Eval"
                    ? "See your profile"
                    : "Next"}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function priorFromUsage(
  freq: Profile["frequency"] | null,
  tools: string[],
): Record<SkillKey, number> {
  const f =
    freq === "daily"
      ? 0.55
      : freq === "weekly"
        ? 0.4
        : freq === "monthly"
          ? 0.25
          : 0.1;
  const usingMultiple =
    tools.filter((t) => t !== "none").length >= 2 ? 0.05 : 0;
  return {
    prompting: clamp01(f + usingMultiple),
    comms: clamp01(f * 0.8),
    privacy: clamp01(f * 0.5 + 0.1),
    agents: clamp01(f * 0.3),
    eval: clamp01(f * 0.4 + 0.05),
    data: clamp01(f * 0.5),
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

// --- UI subcomponents ----------------------------------------------------

function ProgressStrip({
  stepIdx,
  total,
}: {
  stepIdx: number;
  total: number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #E0E0E0",
        padding: "14px 24px",
        position: "sticky",
        top: 56,
        zIndex: 9,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#616161",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> Skip for now
        </Link>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background:
                  i < stepIdx
                    ? "#00A344"
                    : i === stepIdx
                      ? ACCENT
                      : "#E0E0E0",
                transition: "background-color .35s ease",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#616161", fontWeight: 600 }}>
          {Math.min(stepIdx + 1, total)} / {total}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <Card>
      <div
        style={{
          padding: "48px 40px",
          background:
            "linear-gradient(135deg, #0E6FBE 0%, #0D47A1 60%, #5655CE 100%)",
          color: "#fff",
          borderRadius: 12,
          margin: "-24px -24px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,.10)",
            filter: "blur(20px)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            opacity: 0.95,
            marginBottom: 12,
          }}
        >
          <Sparkles size={14} /> Placement · ~5 minutes
        </div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
            maxWidth: 580,
          }}
        >
          Let&apos;s figure out where you are with AI — and where to take you
          next.
        </h1>
      </div>

      <p
        style={{
          fontSize: 16,
          color: "#424242",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        We use this once, then your home screen, lessons, and updates all
        adapt to <strong>your role</strong> and <strong>your gaps</strong>. No
        right answers — just honest signal.
      </p>
      <ul
        style={{
          fontSize: 14,
          color: "#616161",
          lineHeight: 1.8,
          paddingLeft: 18,
          margin: 0,
        }}
      >
        <li>6 scenarios from real Housecall Pro situations</li>
        <li>A few quick context questions: role, tools, tasks you do with AI</li>
        <li>A self-rating step we compare to your measured score</li>
        <li>You&apos;ll see your profile, percentile, and recommended first lesson</li>
      </ul>
    </Card>
  );
}

function RoleStep({
  role,
  setRole,
  isManager,
  setIsManager,
}: {
  role: Role | null;
  setRole: (r: Role) => void;
  isManager: boolean;
  setIsManager: (b: boolean) => void;
}) {
  return (
    <Card>
      <Eyebrow>Your role</Eyebrow>
      <H2>What team are you on?</H2>
      <P>We tailor lessons + percentile rankings to your team.</P>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {ROLE_OPTIONS.map((r) => {
          const I = r.Icon;
          const picked = role === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                background: picked ? "#E3F2FD" : "#fff",
                border: `2px solid ${picked ? ACCENT : "#E0E0E0"}`,
                borderRadius: 10,
                padding: "14px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all .15s ease",
              }}
            >
              <I size={22} color={picked ? ACCENT : "#616161"} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: picked ? ACCENT : "#212121",
                }}
              >
                {ROLE_LABEL[r.id]}
              </span>
            </button>
          );
        })}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "#FAFAFA",
          borderRadius: 8,
          border: "1px solid #E0E0E0",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isManager}
          onChange={(e) => setIsManager(e.target.checked)}
          style={{ accentColor: ACCENT, width: 16, height: 16 }}
        />
        <span style={{ fontSize: 14 }}>
          I manage other people. (Adds the &quot;Leader&quot; track.)
        </span>
      </label>
    </Card>
  );
}

function UsageStep({
  frequency,
  setFrequency,
  tools,
  setTools,
}: {
  frequency: Profile["frequency"] | null;
  setFrequency: (f: Profile["frequency"]) => void;
  tools: string[];
  setTools: (t: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (id === "none") {
      setTools(tools.includes("none") ? [] : ["none"]);
      return;
    }
    setTools(
      tools.includes(id)
        ? tools.filter((t) => t !== id)
        : [...tools.filter((t) => t !== "none"), id],
    );
  };

  const FREQ: { id: Profile["frequency"]; label: string; sub: string }[] = [
    { id: "daily", label: "Daily", sub: "It's part of how I work now" },
    { id: "weekly", label: "Weekly", sub: "A few times a week" },
    { id: "monthly", label: "Monthly", sub: "Occasional, not routine" },
    { id: "never", label: "Almost never", sub: "Curious but new" },
  ];

  return (
    <Card>
      <Eyebrow>Your AI usage today</Eyebrow>
      <H2>How often are you using AI tools at work?</H2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {FREQ.map((f) => {
          const picked = frequency === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFrequency(f.id)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                background: picked ? "#E3F2FD" : "#fff",
                border: `2px solid ${picked ? ACCENT : "#E0E0E0"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all .15s ease",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${picked ? ACCENT : "#BDBDBD"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {picked && (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: ACCENT,
                    }}
                  />
                )}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</span>
                <span style={{ display: "block", fontSize: 12, color: "#616161" }}>
                  {f.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <H4>Which tools have you actually tried?</H4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TOOLS.map((t) => {
          const picked = tools.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              style={{
                padding: "8px 14px",
                background: picked ? ACCENT : "#fff",
                color: picked ? "#fff" : "#212121",
                border: `1px solid ${picked ? ACCENT : "#E0E0E0"}`,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                transition: "all .15s ease",
              }}
            >
              {picked && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
              {t.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TasksStep({
  tasks,
  setTasks,
}: {
  tasks: string[];
  setTasks: (t: string[]) => void;
}) {
  const toggle = (id: string) => {
    setTasks(
      tasks.includes(id) ? tasks.filter((t) => t !== id) : [...tasks, id],
    );
  };
  return (
    <Card>
      <Eyebrow>Your AI tasks</Eyebrow>
      <H2>Which of these do you regularly use AI for?</H2>
      <P>Pick as many as apply — each one tells us which skills matter to you.</P>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {AI_TASKS.map((t) => {
          const picked = tasks.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                background: picked ? "#E3F2FD" : "#fff",
                border: `2px solid ${picked ? ACCENT : "#E0E0E0"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all .15s ease",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: picked ? ACCENT : "#fff",
                  border: `2px solid ${picked ? ACCENT : "#BDBDBD"}`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {picked && <Check size={12} color="#fff" />}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#EFECFA",
          borderRadius: 8,
          fontSize: 12,
          color: "#4E30A1",
          lineHeight: 1.5,
        }}
      >
        Pick none if you&apos;re just getting started — that&apos;s a valid
        starting point too.
      </div>
    </Card>
  );
}

function SelfRateStep({
  selfRating,
  setSelfRating,
}: {
  selfRating: Record<SkillKey, number>;
  setSelfRating: (r: Record<SkillKey, number>) => void;
}) {
  const labels = ["Beginner", "Comfortable", "Confident", "Strong", "Expert"];
  const skills = Object.keys(SKILL_LABEL) as SkillKey[];

  return (
    <Card>
      <Eyebrow>Self-check · gut-rate yourself</Eyebrow>
      <H2>How would you rate yourself across these dimensions?</H2>
      <P>
        Be honest — we won&apos;t show your scenario score yet. The gap between
        what you think and what we measured is the most important number on the
        result page.
      </P>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {skills.map((k) => {
          const value = selfRating[k];
          const labelIdx = Math.min(4, Math.floor(value * 5));
          return (
            <div key={k}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {SKILL_LABEL[k]}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: ACCENT,
                    fontWeight: 700,
                  }}
                >
                  {labels[labelIdx]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={value}
                onChange={(e) =>
                  setSelfRating({
                    ...selfRating,
                    [k]: parseFloat(e.target.value),
                  })
                }
                style={{
                  width: "100%",
                  accentColor: ACCENT,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#9E9E9E",
                  marginTop: 2,
                }}
              >
                <span>Beginner</span>
                <span>Expert</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ScenarioStep({
  question,
  questionNumber,
  totalQuestions,
  answerIdx,
  setAnswerIdx,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  answerIdx: number | undefined;
  setAnswerIdx: (i: number) => void;
}) {
  return (
    <Card>
      <Eyebrow>
        Scenario {questionNumber} of {totalQuestions} · {SKILL_LABEL[question.primary]}
      </Eyebrow>
      <H2>{question.prompt}</H2>
      {question.setup && (
        <div
          style={{
            background: "#FAFAFA",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.55,
            color: "#424242",
            marginBottom: 16,
          }}
        >
          {question.setup}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.answers.map((a, i) => {
          const picked = answerIdx === i;
          return (
            <button
              key={i}
              onClick={() => setAnswerIdx(i)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                background: picked ? "#E3F2FD" : "#fff",
                border: `2px solid ${picked ? ACCENT : "#E0E0E0"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.5,
                transition: "all .15s ease",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${picked ? ACCENT : "#BDBDBD"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {picked && <Check size={12} color={ACCENT} />}
              </span>
              <span>{a.text}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ResultStep({
  role,
  isManager,
  skills,
  selfRating,
  onFinish,
}: {
  role: Role;
  isManager: boolean;
  skills: Record<SkillKey, number>;
  selfRating: Record<SkillKey, number>;
  onFinish: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const dims = (Object.keys(SKILL_LABEL) as SkillKey[]).map((k) => ({
    k,
    v: skills[k],
  }));
  const top = [...dims].sort((a, b) => b.v - a.v)[0];
  const bottom = [...dims].sort((a, b) => a.v - b.v)[0];

  // Calibration analysis — find biggest gap to lead with
  const calibration = (Object.keys(SKILL_LABEL) as SkillKey[])
    .map((k) => ({ k, delta: selfRating[k] - skills[k] }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const overrated = calibration.delta > 0;
  const calMag = Math.abs(calibration.delta);

  // Demo percentile — anchored on top mastery + role
  const pct = Math.min(96, 30 + Math.round(top.v * 60) + 6);

  return (
    <Card>
      <Eyebrow>Your AI profile</Eyebrow>
      <H2>
        {calMag >= 0.2
          ? overrated
            ? "Most learners hit a blind spot. Yours is here."
            : "You're stronger than you thought."
          : "Here's where you are."}
      </H2>
      <P>
        We&apos;ll personalize your home, lessons, and updates from here. Start
        below — the calibration block is where the real signal lives.
      </P>

      {/* CALIBRATION — leads the page. Self vs measured for every dim. */}
      <div style={{ marginBottom: 20 }}>
        <CalibrationChart selfRating={selfRating} measured={skills} />
      </div>

      {/* Profile snapshot — radar + role/percentile/strongest stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Radar skills={skills} shown={shown} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Stat
            color="#00A344"
            bg="#DCF9D7"
            icon={<Award size={16} />}
            label="Strongest"
            value={SKILL_LABEL[top.k]}
            sub={`${Math.round(top.v * 100)}/100 mastery`}
          />
          <Stat
            color="#8C5400"
            bg="#FFF1C6"
            icon={<TrendingUp size={16} />}
            label="Biggest gap"
            value={SKILL_LABEL[bottom.k]}
            sub={`${Math.round(bottom.v * 100)}/100 mastery`}
          />
          <Stat
            color="#623CC9"
            bg="#EFECFA"
            icon={<Sparkles size={16} />}
            label="Org percentile"
            value={`Top ${100 - pct + 4}% in ${ROLE_LABEL[role]}`}
            sub={`for ${SKILL_LABEL[top.k]}`}
          />
        </div>
      </div>

      <div
        style={{
          padding: 16,
          background: "linear-gradient(135deg, #fff, #EFECFA)",
          border: "1px solid #D5C9F0",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "#623CC9",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Recommended first lesson
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          Writing better customer follow-ups with AI
        </div>
        <div style={{ fontSize: 13, color: "#616161", lineHeight: 1.5 }}>
          {ROLE_LABEL[role]}
          {isManager ? " (manager)" : ""} learners get the most lift from this
          when their <strong>{SKILL_LABEL[bottom.k]}</strong> is below 60. You
          can take it now — it&apos;s 5 minutes.
        </div>
      </div>

      <button
        onClick={onFinish}
        className="hcp-btn hcp-btn--contained hcp-btn--lg"
        style={{ width: "100%", justifyContent: "center" }}
      >
        <span>See my personalized home</span>
        <ArrowRight size={16} />
      </button>
    </Card>
  );
}

function Radar({
  skills,
  shown,
}: {
  skills: Record<SkillKey, number>;
  shown: boolean;
}) {
  const keys = Object.keys(SKILL_LABEL) as SkillKey[];
  const cx = 130;
  const cy = 130;
  const r = 92;
  const points = keys.map((k, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    const v = shown ? skills[k] : 0;
    return {
      key: k,
      x: cx + Math.cos(angle) * r * v,
      y: cy + Math.sin(angle) * r * v,
      lx: cx + Math.cos(angle) * (r + 12),
      ly: cy + Math.sin(angle) * (r + 12),
      angle,
    };
  });
  const ringPts = (frac: number) =>
    keys
      .map((_, i) => {
        const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
        return `${cx + Math.cos(angle) * r * frac},${cy + Math.sin(angle) * r * frac}`;
      })
      .join(" ");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E0E0E0",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg width={300} height={260} style={{ overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <polygon
            key={frac}
            points={ringPts(frac)}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={1}
          />
        ))}
        {keys.map((_, i) => {
          const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * r}
              y2={cy + Math.sin(angle) * r}
              stroke="#F0F0F0"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(14,111,190,.15)"
          stroke={ACCENT}
          strokeWidth={2}
          style={{ transition: "all 1s cubic-bezier(.2,.8,.2,1)" }}
        />
        {points.map((p) => (
          <circle
            key={p.key}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={ACCENT}
            style={{ transition: "all 1s cubic-bezier(.2,.8,.2,1)" }}
          />
        ))}
        {points.map((p) => {
          const dimLabel = SKILL_LABEL[p.key];
          return (
            <text
              key={p.key + "-l"}
              x={p.lx}
              y={p.ly}
              textAnchor={
                p.lx > cx + 10 ? "start" : p.lx < cx - 10 ? "end" : "middle"
              }
              fontSize={10}
              fontWeight={600}
              fill="#424242"
              style={{ pointerEvents: "none" }}
            >
              {dimLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function Stat({
  color,
  bg,
  icon,
  label,
  value,
  sub,
}: {
  color: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {icon} {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#212121" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#616161" }}>{sub}</div>
    </div>
  );
}

// --- tiny formatters -----------------------------------------------------

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
  padding: 24,
};

function Card({ children }: { children: React.ReactNode }) {
  return <div style={cardStyle}>{children}</div>;
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".08em",
        color: ACCENT,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.3 }}>
      {children}
    </h2>
  );
}
function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 10px", color: "#424242" }}>
      {children}
    </h4>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: "#616161", margin: "0 0 16px", lineHeight: 1.5 }}>
      {children}
    </p>
  );
}
