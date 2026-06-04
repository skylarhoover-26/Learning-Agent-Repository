"use client";

// Direction 13: "Briefing" — Studio's polished HCP shell + Heatmap's mastery×freshness insight panel.
// One page that answers: where am I, what changed, what should I do next?

import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Box,
  Briefcase,
  CheckCircle,
  Clock,
  Code,
  Flame,
  Grid,
  Headphones,
  Lightbulb,
  Megaphone,
  MinusCircle,
  PenTool,
  Play,
  Repeat,
  Server,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import {
  AnimatedNumber,
  HcpAppBar,
  Ring,
  type Animation,
  type Density,
  type Gamification,
  type Persona,
} from "./Shared";

type BriefingDirectionProps = {
  accent?: string;
  gamification?: Gamification;
  persona?: Persona;
  density?: Density;
  animation?: Animation;
};

type Skill = {
  id: string;
  name: string;
  mastery: number;
  freshness: number;
  days: number;
  ship: string | null;
  cat: string;
};

type FreshTier = "fresh" | "aging" | "stale" | "critical";

type Department = {
  name: string;
  xp: number;
  members: number;
  color: string;
  icon: LucideIcon;
  mover: string;
  you?: boolean;
};

type Update = {
  title: string;
  why: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  cell: string;
  src: string;
  mins: number;
  stat: { label: string; val: string; color: string };
};

export function BriefingDirection({
  accent = "#0E6FBE",
  gamification = "light",
  persona = "non-tech",
  density = "cozy",
  animation = "normal",
}: BriefingDirectionProps) {
  const pad = density === "compact" ? 16 : 22;
  const gap = density === "compact" ? 12 : 16;
  const accentColor = accent === "gradient" ? "#5655CE" : accent;
  const useAi = accent === "#623CC9" || accent === "gradient";
  const anim = animation !== "off";
  const roleLabel =
    persona === "tech" ? "Engineering" : persona === "leader" ? "People" : "Sales";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const [quizAns, setQuizAns] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  const [xp, setXp] = useState(3940);
  useEffect(() => {
    if (!anim) return;
    const t = setInterval(
      () => setXp((v) => v + Math.floor(Math.random() * 3)),
      4500,
    );
    return () => clearInterval(t);
  }, [anim]);

  const skills: Skill[] = [
    { id: "foundations", name: "AI foundations", mastery: 0.92, freshness: 0.95, days: 4, ship: null, cat: "Foundations" },
    { id: "prompting", name: "Prompting basics", mastery: 0.88, freshness: 0.42, days: 38, ship: "GPT-5 2d", cat: "Foundations" },
    { id: "sysprompts", name: "System prompts", mastery: 0.74, freshness: 0.55, days: 24, ship: null, cat: "Foundations" },
    { id: "context", name: "Context windows", mastery: 0.68, freshness: 0.80, days: 11, ship: null, cat: "Foundations" },
    { id: "comms", name: "Customer comms", mastery: 0.66, freshness: 0.78, days: 8, ship: "Tone v3 9d", cat: "Application" },
    { id: "rag", name: "RAG & grounding", mastery: 0.50, freshness: 0.62, days: 19, ship: null, cat: "Application" },
    { id: "workflows", name: "Workflow automation", mastery: 0.44, freshness: 0.50, days: 30, ship: null, cat: "Application" },
    { id: "datasets", name: "Internal datasets", mastery: 0.38, freshness: 0.70, days: 14, ship: null, cat: "Application" },
    { id: "privacy", name: "Data privacy / PII", mastery: 0.42, freshness: 0.88, days: 12, ship: null, cat: "Safety" },
    { id: "safety", name: "Safety / red-team", mastery: 0.28, freshness: 0.70, days: 16, ship: null, cat: "Safety" },
    { id: "evals", name: "Eval & rubrics", mastery: 0.34, freshness: 0.30, days: 51, ship: "Rubric 5d", cat: "Safety" },
    { id: "biases", name: "Bias & fairness", mastery: 0.30, freshness: 0.45, days: 33, ship: null, cat: "Safety" },
    { id: "agents", name: "Agents & tools", mastery: 0.24, freshness: 0.18, days: 67, ship: "SDK 4d", cat: "Frontier" },
    { id: "voice", name: "Image & voice", mastery: 0.10, freshness: 0.55, days: 22, ship: null, cat: "Frontier" },
    { id: "reasoning", name: "Reasoning models", mastery: 0.08, freshness: 0.30, days: 60, ship: "GPT-5 2d", cat: "Frontier" },
    { id: "multimodal", name: "Multimodal", mastery: 0.04, freshness: 0.20, days: 80, ship: null, cat: "Frontier" },
  ];
  const cats = ["Foundations", "Application", "Safety", "Frontier"];

  // CVD-safe blue → light → orange/red diverging ramp; mastery drives saturation/darkness.
  const cellColor = (m: number, f: number) => {
    let hue: number, sat: number, light: number;
    if (f >= 0.5) {
      hue = 210;
      sat = 35 + m * 40;
      light = 88 - (f - 0.5) * 30 - m * 8;
    } else {
      hue = 28 - (0.5 - f) * 16;
      sat = 55 + m * 25;
      light = 84 - (0.5 - f) * 40 - m * 6;
    }
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };
  const freshTier = (f: number): FreshTier =>
    f >= 0.75 ? "fresh" : f >= 0.5 ? "aging" : f >= 0.3 ? "stale" : "critical";
  const isStale = (s: Skill) => s.freshness < 0.5;
  const isCritical = (s: Skill) =>
    s.freshness < 0.35 || (s.freshness < 0.5 && s.mastery > 0.6);

  const highMasteryStale = skills.filter((s) => s.mastery > 0.6 && s.freshness < 0.5);
  const drifting = skills.filter(
    (s) =>
      s.mastery >= 0.3 && s.mastery <= 0.6 && s.freshness >= 0.3 && s.freshness < 0.6,
  );
  const shipHit = skills.filter((s) => !!s.ship);
  const focusCell = highMasteryStale[0] || drifting[0] || skills[0];

  const updates: Update[] = [
    {
      title: "GPT-5 reasoning controls reshape Prompting basics",
      why: `Sales reps using AI drafts saw 18% better reply rates after switching to reasoning_effort: low. Your last refresh was ${focusCell.days} days ago.`,
      tag: "Direct impact",
      tagColor: "#D81B60",
      tagBg: "#FFE5EE",
      cell: "Prompting basics",
      src: "OpenAI · 2d ago",
      mins: 4,
      stat: { label: "reply rate", val: "+18%", color: "#00A344" },
    },
    {
      title: "Anthropic's agent SDK rewrites your Agents & tools cell",
      why: "The lesson you started 2 weeks ago has been refreshed — your progress carried over.",
      tag: "Updated for you",
      tagColor: "#623CC9",
      tagBg: "#EFECFA",
      cell: "Agents & tools",
      src: "Anthropic · 4d ago",
      mins: 6,
      stat: { label: "progress kept", val: "62%", color: "#623CC9" },
    },
    {
      title: "New eval rubric flags tool-use failures",
      why: "Heads up — your last quiz used the old rubric. We added 1 question to your next drill.",
      tag: "Heads up",
      tagColor: "#8C5400",
      tagBg: "#FFF1C6",
      cell: "Eval & rubrics",
      src: "arXiv · 6d ago",
      mins: 3,
      stat: { label: "+1 question", val: "next drill", color: "#8C5400" },
    },
  ];

  const departments: Department[] = [
    { name: "Customer Success", xp: 14820, members: 412, color: "#00A344", icon: Headphones, mover: "+12%" },
    { name: "Sales", xp: 12840, members: 380, color: accentColor, icon: TrendingUp, you: true, mover: "+8%" },
    { name: "Engineering", xp: 11560, members: 280, color: "#0E6FBE", icon: Code, mover: "+9%" },
    { name: "Analytics", xp: 10240, members: 145, color: "#623CC9", icon: BarChart3, mover: "+11%" },
    { name: "People", xp: 8740, members: 120, color: "#BF8600", icon: Users, mover: "+6%" },
    { name: "Business Development", xp: 8120, members: 95, color: "#D81B60", icon: Briefcase, mover: "+10%" },
    { name: "Marketing", xp: 7640, members: 110, color: "#2FA7CD", icon: Megaphone, mover: "+7%" },
    { name: "Product", xp: 6980, members: 84, color: "#7A09BE", icon: Box, mover: "+5%" },
    { name: "Information Systems", xp: 6420, members: 62, color: "#5655CE", icon: Server, mover: "+4%" },
    { name: "Small Business", xp: 5840, members: 168, color: "#00A344", icon: Store, mover: "+9%" },
    { name: "Creative", xp: 5210, members: 48, color: "#BF8600", icon: PenTool, mover: "+8%" },
  ];
  const maxDeptXp = Math.max(...departments.map((d) => d.xp));

  const reveal = (i: number, dir: "up" | "down" | "left" | "right" = "up"): CSSProperties => {
    const off =
      dir === "down"
        ? "translateY(-18px)"
        : dir === "left"
          ? "translateX(-22px)"
          : dir === "right"
            ? "translateX(22px)"
            : "translateY(14px)";
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translate(0,0)" : off,
      transition: anim
        ? `opacity .6s ease ${i * 80}ms, transform .7s cubic-bezier(.2,.8,.2,1) ${i * 80}ms`
        : "none",
    };
  };

  return (
    <div style={{ width: "100%", background: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      <HcpAppBar activeTab="learn" accent={accentColor} density={density} />

      {/* GREETING ROW */}
      <div
        style={{
          padding: `${pad}px ${pad + 8}px ${gap}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          ...reveal(0, "down"),
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ color: "#616161" }}>
            AI Academy · {roleLabel} · Tuesday, May 5
          </div>
          <h5 style={{ fontSize: 26, fontWeight: 600, margin: 0, lineHeight: 1.25 }}>
            Good morning, Mara — here&apos;s where you stand.
          </h5>
        </div>
        {gamification !== "off" && (
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FFF1C6",
                color: "#8C5400",
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  animation: anim ? "flicker 1.6s ease-in-out infinite" : "none",
                }}
              >
                <Flame size={14} />
              </span>
              7-day streak
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: useAi ? "#EFECFA" : "#E3F2FD",
                color: accentColor,
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Zap size={14} />
              <span>
                <AnimatedNumber value={xp} />
              </span>{" "}
              XP
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap, padding: `0 ${pad + 8}px ${pad + 8}px` }}>
        {/* ═══ DO THIS NOW — adaptive hero, grounded in the heatmap ═══ */}
        <div
          style={{
            ...reveal(1),
            position: "relative",
            overflow: "hidden",
            background: useAi
              ? "linear-gradient(110deg, #2FA7CD 4%, #5655CE 35%, #7A09BE 100%)"
              : `linear-gradient(135deg, ${accentColor} 0%, #0D47A1 100%)`,
            color: "#fff",
            borderRadius: 12,
            padding: 22,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "rgba(255,255,255,.10)",
              filter: "blur(20px)",
              animation: anim ? "float 8s ease-in-out infinite" : "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 80,
              bottom: -60,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,.07)",
              filter: "blur(16px)",
              animation: anim ? "float 10s ease-in-out infinite reverse" : "none",
            }}
          />
          {anim && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(110deg, transparent 30%, rgba(255,255,255,.18) 45%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 6s ease-in-out infinite",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.95,
              marginBottom: 12,
              position: "relative",
            }}
          >
            <span style={{ display: "inline-flex", animation: anim ? "spin-slow 8s linear infinite" : "none" }}>
              <Sparkles size={14} />
            </span>
            Do this now · 6 min · adaptive
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              lineHeight: 1.2,
              maxWidth: 720,
              marginBottom: 8,
              position: "relative",
            }}
          >
            Refresh your <strong>{focusCell.name}</strong> cell — it&apos;s high-mastery but {focusCell.days} days
            stale.
          </div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.92,
              maxWidth: 720,
              marginBottom: 16,
              position: "relative",
            }}
          >
            Picked from your heatmap below: this is your highest-value gap.{" "}
            {focusCell.ship && (
              <span>
                <strong>{focusCell.ship.split(" ")[0]}</strong> just shipped, which is why it darkened.
              </span>
            )}{" "}
            Six minutes brings it back to fresh.
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            <button
              style={{
                background: "#fff",
                color: useAi ? "#5655CE" : accentColor,
                border: "none",
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Play size={14} /> Refresh {focusCell.name}
            </button>
            <button
              style={{
                background: "rgba(255,255,255,.16)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.4)",
                padding: "10px 16px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Clock size={14} /> Snooze 1 day
            </button>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: 0.95,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#7CFFB1",
                  boxShadow: "0 0 8px #7CFFB1",
                  animation: anim ? "pulse 2s infinite" : "none",
                }}
              />
              412 in your org started this today
            </div>
          </div>
        </div>

        {/* ═══ TODAY'S ACTIONS — daily drill + 30-second drill ═══ */}
        <div
          style={{
            ...reveal(2),
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap,
            alignItems: "stretch",
          }}
        >
          {/* Daily drill ring */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Ring value={mounted ? 0.6 : 0} size={108} stroke={11} color={accentColor} track="#F5F5F5">
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                    <AnimatedNumber value={mounted ? 3 : 0} duration={1100} />
                    <span style={{ color: "#9E9E9E", fontSize: 16 }}>/5</span>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#616161",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginTop: 3,
                    }}
                  >
                    this wk
                  </div>
                </div>
              </Ring>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="eyebrow" style={{ color: "#616161" }}>
                  Daily drill
                </span>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>5-min daily drill</div>
                <div style={{ fontSize: 11, color: "#616161", lineHeight: 1.4 }}>
                  2 more this week to keep your streak alive.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
                const done = i < 3;
                const today = i === 3;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: done ? accentColor : today ? "#fff" : "#F5F5F5",
                        border: today ? `1.5px dashed ${accentColor}` : "none",
                        color: done ? "#fff" : today ? accentColor : "#BDBDBD",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        transform: mounted ? "scale(1)" : "scale(.4)",
                        transition: anim
                          ? `transform .4s cubic-bezier(.34,1.56,.64,1) ${300 + i * 70}ms`
                          : "none",
                        animation: today && anim ? "pulse2 2s ease-in-out infinite" : "none",
                      }}
                    >
                      {done ? "✓" : today ? "·" : ""}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: today ? accentColor : "#9E9E9E",
                        fontWeight: today ? 700 : 500,
                      }}
                    >
                      {d}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              style={{
                background: accentColor,
                color: "#fff",
                border: "none",
                padding: "9px 14px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "transform .18s ease, box-shadow .18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = `0 6px 14px ${accentColor}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Play size={13} /> Start drill
            </button>
            <div
              style={{
                fontSize: 10,
                color: "#616161",
                borderTop: "1px solid #F5F5F5",
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                Last: 4d ago · <strong>88%</strong>
              </span>
              <span style={{ color: "#00A344", fontWeight: 700 }}>+12 XP today</span>
            </div>
          </div>

          {/* 30-second drill */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span className="eyebrow" style={{ color: accentColor }}>
                30-second drill
              </span>
              <span className="hcp-chip hcp-chip--warning">
                <Repeat size={12} />
                Spaced repetition
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35, marginBottom: 14 }}>
              A teammate asks ChatGPT to &quot;summarize this customer call recording.&quot; What&apos;s the first
              thing to check?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { k: "a", text: "Whether the AI tool is approved for PII at HCP", ok: true },
                { k: "b", text: "How long the recording is", ok: false },
                { k: "c", text: "Which model variant they're using", ok: false },
              ].map((o) => {
                const picked = quizAns === o.k;
                const showResult = quizDone && picked;
                return (
                  <button
                    key={o.k}
                    className="quiz-opt"
                    onClick={() => {
                      if (!quizDone) {
                        setQuizAns(o.k);
                        setTimeout(() => setQuizDone(true), 250);
                      }
                    }}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "1px solid",
                      borderColor: showResult
                        ? o.ok
                          ? "#00A344"
                          : "#D81B60"
                        : picked
                          ? accentColor
                          : "#E0E0E0",
                      background: showResult ? (o.ok ? "#DCF9D7" : "#FFDDE9") : "#fff",
                      borderRadius: 8,
                      fontFamily: "inherit",
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "all .25s cubic-bezier(.2,.8,.2,1)",
                      animation:
                        showResult && o.ok && anim
                          ? "pop .45s cubic-bezier(.34,1.56,.64,1)"
                          : showResult && !o.ok && anim
                            ? "shake .4s ease"
                            : "none",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: showResult ? (o.ok ? "#00A344" : "#D81B60") : "#F5F5F5",
                        color: showResult ? "#fff" : "#616161",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all .25s ease",
                      }}
                    >
                      {showResult ? (o.ok ? "✓" : "✕") : o.k.toUpperCase()}
                    </span>
                    {o.text}
                  </button>
                );
              })}
            </div>
            {quizDone && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "#E3F2FD",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#0D47A1",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  animation: anim ? "slideInUp .35s ease" : "none",
                }}
              >
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  Right — call recordings carry PII. Use the HCP-approved tool list before pasting any
                  customer data.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ KNOWLEDGE HEATMAP — the central truth ═══ */}
        <div
          style={{
            ...reveal(3),
            background: "#fff",
            borderRadius: 12,
            padding: "14px 18px",
            boxShadow: "0 0 12px 2px rgba(0,0,0,.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Your knowledge map</div>
              <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>
                16 skills · 4 categories · live · darker = more mastery · bluer = fresher
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 10,
                color: "#616161",
              }}
            >
              <ColorScale />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background:
                      "linear-gradient(135deg, #fff 0%, #fff 30%, rgba(216,27,96,0.4) 50%, #fff 70%)",
                    backgroundSize: "200% 200%",
                    animation: anim ? "shimmer-cell 2s linear infinite" : "none",
                  }}
                />
                shimmer = stale
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "76px repeat(4, 1fr)", gap: 3 }}>
            {cats.map((cat, rowI) => (
              <CatRow
                key={cat}
                cat={cat}
                skills={skills.filter((s) => s.cat === cat)}
                rowI={rowI}
                cellColor={cellColor}
                freshTier={freshTier}
                isStale={isStale}
                isCritical={isCritical}
                focusCellId={focusCell.id}
                mounted={mounted}
                anim={anim}
              />
            ))}
          </div>

          {/* Diagnostic strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
            <DiagCard
              color="#D81B60"
              icon={AlertTriangle}
              num={String(highMasteryStale.length)}
              sub={highMasteryStale.length === 1 ? "cell" : "cells"}
              heading="High-value gaps"
              body={
                highMasteryStale.length
                  ? `${highMasteryStale
                      .map((s) => s.name)
                      .slice(0, 2)
                      .join(" · ")}${
                      highMasteryStale.length > 2 ? ` +${highMasteryStale.length - 2}` : ""
                    }`
                  : "None — all mastered cells still fresh."
              }
            />
            <DiagCard
              color="#B85B6E"
              icon={TrendingDown}
              num={String(drifting.length)}
              sub={drifting.length === 1 ? "cell drifting" : "cells drifting"}
              heading="Mid-mastery, sliding"
              body={
                drifting.length
                  ? "5-min weekly drill keeps these from sliding into red."
                  : "No mid-band drift right now."
              }
            />
            <DiagCard
              color="#5655CE"
              icon={Zap}
              num={String(shipHit.length)}
              sub={shipHit.length === 1 ? "cell flashed" : "cells flashed"}
              heading="AI shipped this week"
              body={`${shipHit
                .map((s) => s.name.split(" ")[0])
                .slice(0, 3)
                .join(" · ")} — auto-queued for refresh.`}
            />
          </div>
        </div>

        {/* ═══ YOUR PROGRESS — where you place + squad challenge ═══ */}
        <div
          style={{
            ...reveal(4),
            display: "grid",
            gridTemplateColumns: "1.05fr .95fr",
            gap,
            alignItems: "stretch",
          }}
        >
          {/* WHERE YOU PLACE — bell curve + dot swarm */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#616161" }}>
                  Where you place
                </span>
                <div style={{ fontSize: 16, fontWeight: 600 }}>You vs. the org</div>
              </div>
              <Users size={16} style={{ color: "#9E9E9E" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#616161",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    fontWeight: 600,
                  }}
                >
                  Org-wide · 2,500 learners
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                  Top <AnimatedNumber value={mounted ? 28 : 50} duration={1400} />%
                </span>
              </div>
              <div style={{ position: "relative", height: 70 }}>
                <svg viewBox="0 0 300 70" style={{ width: "100%", height: "100%", display: "block" }}>
                  <defs>
                    <linearGradient id="bellFillBriefing" x1="0" x2="1">
                      <stop offset="0%" stopColor="#E0E0E0" />
                      <stop offset="50%" stopColor="#BDBDBD" />
                      <stop offset="100%" stopColor={accentColor} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 65 C 60 65, 90 60, 120 40 S 180 5, 210 5 S 270 35, 300 65 L 300 65 L 0 65 Z"
                    fill="url(#bellFillBriefing)"
                    opacity="0.5"
                  />
                  <path
                    d="M 0 65 C 60 65, 90 60, 120 40 S 180 5, 210 5 S 270 35, 300 65"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  <line x1="150" y1="25" x2="150" y2="65" stroke="#9E9E9E" strokeDasharray="2 2" strokeWidth="1" />
                  <text x="150" y="20" fontSize="8" fill="#9E9E9E" textAnchor="middle">
                    median
                  </text>
                  <circle
                    cx={mounted ? 216 : 150}
                    cy={mounted ? 12 : 60}
                    r="6"
                    fill={accentColor}
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ transition: anim ? "all 1.4s cubic-bezier(.2,.8,.2,1) .3s" : "none" }}
                  />
                  {anim && (
                    <circle cx="216" cy="12" r="6" fill="none" stroke={accentColor} strokeWidth="2" opacity="0.5">
                      <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <text
                    x="216"
                    y="3"
                    fontSize="9"
                    fill={accentColor}
                    textAnchor="middle"
                    fontWeight="700"
                    opacity={mounted ? 1 : 0}
                    style={{ transition: "opacity .6s ease 1.4s" }}
                  >
                    YOU
                  </text>
                </svg>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "#9E9E9E",
                  marginTop: 2,
                }}
              >
                <span>Beginner</span>
                <span>Median</span>
                <span>Expert</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #F5F5F5", paddingTop: 14, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#616161",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    fontWeight: 600,
                  }}
                >
                  {roleLabel} · 380 teammates
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                  #<AnimatedNumber value={mounted ? 47 : 380} duration={1400} /> of 380
                </span>
              </div>
              <div style={{ position: "relative", height: 110, marginBottom: 6, paddingLeft: 22, paddingBottom: 4 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 4,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontSize: 9,
                    color: "#9E9E9E",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: accentColor }}>Active ↑</span>
                  <span>Quiet</span>
                </div>
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  {[...Array(60)].map((_, i) => {
                    const baseX = (i * 47 + 13) % 100;
                    const baseY = (i * 73 + 23) % 100;
                    const x = baseX;
                    const y = Math.max(6, Math.min(94, baseY * 0.55 + (100 - baseX) * 0.45));
                    const rank = (x + (100 - y)) / 2;
                    const isYou = i === 7;
                    const youX = 68,
                      youY = 22;
                    const dotColor = isYou
                      ? accentColor
                      : rank > 78
                        ? `${accentColor}99`
                        : rank > 50
                          ? "#BDBDBD"
                          : "#E0E0E0";
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${isYou ? youX : x}%`,
                          top: `${isYou ? youY : y}%`,
                          width: isYou ? 12 : 6,
                          height: isYou ? 12 : 6,
                          borderRadius: "50%",
                          background: dotColor,
                          transform: "translate(-50%, -50%)",
                          border: isYou ? "2px solid #fff" : "none",
                          boxShadow: isYou ? `0 0 0 2px ${accentColor}, 0 0 12px ${accentColor}` : "none",
                          opacity: mounted ? 1 : 0,
                          transition: anim
                            ? `opacity .4s ease ${300 + i * 8}ms, transform .4s ease ${300 + i * 8}ms`
                            : "none",
                          animation: isYou && anim ? "pulse-you 2s ease-in-out infinite" : "none",
                          zIndex: isYou ? 2 : 1,
                        }}
                      />
                    );
                  })}
                  <div
                    style={{
                      position: "absolute",
                      left: "68%",
                      top: "22%",
                      transform: "translate(8px, -130%)",
                      fontSize: 10,
                      fontWeight: 700,
                      color: accentColor,
                      background: "#fff",
                      padding: "2px 6px",
                      borderRadius: 999,
                      border: `1px solid ${accentColor}`,
                      whiteSpace: "nowrap",
                      opacity: mounted ? 1 : 0,
                      transition: "opacity .6s ease 1.4s",
                    }}
                  >
                    that&apos;s you ↘
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "#9E9E9E",
                  paddingLeft: 22,
                }}
              >
                <span>Catching up</span>
                <span>Top performers ↗</span>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 10,
                background: "#DCF9D7",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#0B5E2A",
              }}
            >
              <span style={{ display: "inline-flex", animation: anim ? "arrowUp 1.6s ease-in-out infinite" : "none" }}>
                <TrendingUp size={14} />
              </span>
              <span>
                <strong>Up 18 ranks</strong> in {roleLabel} this month · keep it up
              </span>
            </div>
          </div>

          {/* SQUAD CHALLENGE — vertical leaderboard */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span className="eyebrow" style={{ color: "#616161" }}>
                  Squad challenge
                </span>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>Department leaderboard</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#616161",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <Clock size={11} /> 2d 14h left
                </div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  animation: anim ? "wobble 4s ease-in-out infinite" : "none",
                  flexShrink: 0,
                }}
              >
                <Trophy size={20} style={{ color: "#BF8600" }} />
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: "1 1 0",
                minHeight: 0,
                maxHeight: 420,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {departments.map((d, i) => {
                const pct = (d.xp / maxDeptXp) * 100;
                const DeptIcon = d.icon;
                return (
                  <div
                    key={d.name}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: d.you ? `${accentColor}0F` : "#FAFAFA",
                      border: d.you ? `1.5px solid ${accentColor}` : "1px solid #EEEEEE",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      columnGap: 8,
                      rowGap: 4,
                      transform: mounted ? "translateX(0)" : "translateX(8px)",
                      opacity: mounted ? 1 : 0,
                      transition: anim
                        ? `all .5s cubic-bezier(.2,.8,.2,1) ${300 + i * 90}ms`
                        : "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: i === 0 ? "#BF8600" : "#9E9E9E",
                        background: i === 0 ? "#FFF1C6" : "#fff",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: i === 0 ? "1px solid #BF8600" : "1px solid #E0E0E0",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          background: `${d.color}1F`,
                          color: d.color,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <DeptIcon size={10} />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: d.you ? 700 : 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {d.name}
                      </span>
                      {d.you && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: accentColor,
                            background: "#fff",
                            padding: "1px 4px",
                            borderRadius: 999,
                            border: `1px solid ${accentColor}`,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color, whiteSpace: "nowrap" }}>
                      <AnimatedNumber value={mounted ? d.xp : 0} duration={1300} />
                    </span>
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        height: 4,
                        background: "#fff",
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: mounted ? `${pct}%` : "0%",
                          height: "100%",
                          background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)`,
                          borderRadius: 2,
                          transition: anim
                            ? `width 1.2s cubic-bezier(.2,.8,.2,1) ${400 + i * 100}ms`
                            : "none",
                          position: "relative",
                        }}
                      >
                        {anim && d.you && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)",
                              backgroundSize: "200% 100%",
                              animation: "progressShine 2.4s ease-in-out infinite",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ WHAT CHANGED FOR YOUR ROLE ═══ */}
        <div style={{ ...reveal(5) }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div>
              <div className="eyebrow" style={{ color: "#616161" }}>
                What changed this week
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                Tuned for {roleLabel.toLowerCase()} · {updates.length} updates
              </div>
            </div>
            <a style={{ fontSize: 12, color: accentColor, fontWeight: 600, cursor: "pointer" }}>View all</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {updates.map((u, i) => (
              <UpdateCard key={i} u={u} accent={accentColor} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer-cell { 0% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }
        @keyframes pulse-strobe-briefing {
          0%, 100% { box-shadow: inset 0 0 0 0 rgba(86, 85, 206, 0); }
          50% { box-shadow: inset 0 0 0 3px rgba(86, 85, 206, 0.7); }
        }
        @keyframes critical-pulse-briefing {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes focus-glow {
          0%, 100% { box-shadow: 0 0 0 2px ${accentColor}, 0 0 0 5px ${accentColor}33; }
          50% { box-shadow: 0 0 0 2px ${accentColor}, 0 0 0 8px ${accentColor}55; }
        }
        @keyframes pulse-you {
          0%, 100% { box-shadow: 0 0 0 2px ${accentColor}, 0 0 12px ${accentColor}; }
          50%      { box-shadow: 0 0 0 2px ${accentColor}, 0 0 22px ${accentColor}; }
        }
        @keyframes arrowUp {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────────

type CatRowProps = {
  cat: string;
  skills: Skill[];
  rowI: number;
  cellColor: (m: number, f: number) => string;
  freshTier: (f: number) => FreshTier;
  isStale: (s: Skill) => boolean;
  isCritical: (s: Skill) => boolean;
  focusCellId: string;
  mounted: boolean;
  anim: boolean;
};

function CatRow({
  cat,
  skills,
  rowI,
  cellColor,
  freshTier,
  isStale,
  isCritical,
  focusCellId,
  mounted,
  anim,
}: CatRowProps) {
  return (
    <>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#212121",
          display: "flex",
          alignItems: "center",
          padding: "0 6px 0 2px",
          borderRight: "2px solid #F0F0F0",
          letterSpacing: ".02em",
        }}
      >
        {cat}
      </div>
      {skills.map((s, colI) => (
        <BriefingHeatCell
          key={s.id}
          s={s}
          bg={cellColor(s.mastery, s.freshness)}
          tier={freshTier(s.freshness)}
          stale={isStale(s)}
          critical={isCritical(s)}
          isFocus={s.id === focusCellId}
          mounted={mounted}
          anim={anim}
          delay={250 + rowI * 120 + colI * 45}
        />
      ))}
    </>
  );
}

type BriefingHeatCellProps = {
  s: Skill;
  bg: string;
  tier: FreshTier;
  stale: boolean;
  critical: boolean;
  isFocus: boolean;
  mounted: boolean;
  anim: boolean;
  delay: number;
};

function BriefingHeatCell({
  s,
  bg,
  tier,
  stale,
  critical,
  isFocus,
  mounted,
  anim,
  delay,
}: BriefingHeatCellProps) {
  const [hover, setHover] = useState(false);
  const TXT = "#1a1a1a";
  const BADGES: Record<FreshTier, { icon: LucideIcon; fg: string; bg: string; border: string; label: string }> = {
    fresh: { icon: CheckCircle, fg: "#0B5E2A", bg: "#E8F8E5", border: "#B5E8AA", label: "Fresh" },
    aging: { icon: MinusCircle, fg: "#616161", bg: "#fff", border: "#E0E0E0", label: "Aging" },
    stale: { icon: AlertTriangle, fg: "#8C5400", bg: "#FFF1C6", border: "#FFD8A8", label: "Stale" },
    critical: { icon: AlertOctagon, fg: "#A11048", bg: "#FFE5EE", border: "#F8C5D5", label: "Critical" },
  };
  const badge = BADGES[tier];
  const BadgeIcon = badge.icon;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        minHeight: 62,
        borderRadius: 6,
        background: bg,
        color: TXT,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 6,
        cursor: "pointer",
        opacity: mounted ? 1 : 0,
        transition: anim
          ? `opacity .5s ease ${delay}ms, transform .15s ease, box-shadow .15s ease`
          : "none",
        animation: anim
          ? isFocus
            ? "focus-glow 2.4s ease-in-out infinite"
            : critical
              ? "critical-pulse-briefing 2.4s ease-in-out infinite"
              : "none"
          : "none",
        ...(hover ? { boxShadow: "0 6px 18px rgba(0,0,0,.18)", transform: "scale(1.02)", zIndex: 20 } : {}),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {stale && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(135deg, rgba(0,0,0,.08) 0 2px, transparent 2px 8px)",
            }}
          />
        )}
        {stale && anim && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              backgroundSize: "200% 200%",
              animation: "shimmer-cell 2.6s linear infinite",
              mixBlendMode: "soft-light",
            }}
          />
        )}
        {s.ship && anim && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 6,
              animation: "pulse-strobe-briefing 2.6s ease-in-out infinite",
            }}
          />
        )}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.2,
          paddingRight: 22,
        }}
      >
        {s.name}
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: 9.5,
          opacity: 0.75,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Clock size={10} color={TXT} />
        <span>{s.days < 30 ? `${s.days}d ago` : `${Math.round(s.days / 7)}w ago`}</span>
      </div>

      <div
        style={{
          position: "absolute",
          right: 5,
          top: 5,
          zIndex: 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: badge.bg,
          color: badge.fg,
          border: `1px solid ${badge.border}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={badge.label}
      >
        <BadgeIcon size={11} color={badge.fg} />
      </div>

      {s.ship && (
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 6,
            zIndex: 2,
            padding: "1px 5px",
            borderRadius: 3,
            background: "#5655CE",
            color: "#fff",
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: ".03em",
          }}
        >
          ☄ {s.ship}
        </div>
      )}

      {isFocus && (
        <div
          style={{
            position: "absolute",
            left: 6,
            bottom: 6,
            zIndex: 2,
            padding: "1px 5px",
            borderRadius: 3,
            background: "#212121",
            color: "#fff",
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: ".04em",
          }}
        >
          DO THIS NOW
        </div>
      )}

      {hover && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(100% + 6px)",
            transform: "translateX(-50%)",
            background: "#212121",
            color: "#fff",
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 10.5,
            lineHeight: 1.45,
            whiteSpace: "nowrap",
            zIndex: 100,
            boxShadow: "0 6px 18px rgba(0,0,0,.28)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{s.name}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <BadgeIcon size={10} color="#fff" />
            <span style={{ fontWeight: 600 }}>{badge.label}</span>
          </div>
          <div style={{ opacity: 0.92 }}>
            Mastery <strong>{Math.round(s.mastery * 100)}%</strong> · Freshness{" "}
            <strong>{Math.round(s.freshness * 100)}%</strong>
          </div>
          <div style={{ opacity: 0.7, fontSize: 9.5 }}>Last refreshed {s.days} days ago</div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #212121",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ColorScale() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span>fresh</span>
      <div
        style={{
          width: 72,
          height: 8,
          borderRadius: 3,
          background:
            "linear-gradient(90deg, hsl(210,75%,50%), hsl(210,40%,85%) 50%, hsl(28,65%,80%) 50%, hsl(20,80%,42%))",
        }}
      />
      <span>stale</span>
    </div>
  );
}

type DiagCardProps = {
  color: string;
  icon: LucideIcon;
  num: string;
  sub: string;
  heading: string;
  body: string;
};

function DiagCard({ color, icon: I, num, sub, heading, body }: DiagCardProps) {
  return (
    <div
      style={{
        background: "#FAFAFA",
        borderRadius: 8,
        border: "1px solid #EEE",
        padding: "10px 12px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
      <div style={{ paddingLeft: 4, minWidth: 38 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <I size={12} color={color} />
          <span style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{num}</span>
        </div>
        <div style={{ fontSize: 9, color: "#9E9E9E", fontWeight: 600, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#212121", marginBottom: 3 }}>{heading}</div>
        <div style={{ fontSize: 10.5, color: "#616161", lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function UpdateCard({ u, accent }: { u: Update; accent: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 200,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            background: u.tagBg,
            color: u.tagColor,
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".02em",
          }}
        >
          {u.tag}
        </span>
        <span style={{ fontSize: 10, color: "#9E9E9E", fontWeight: 600 }}>{u.src}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#212121", lineHeight: 1.3 }}>{u.title}</div>
      <div style={{ fontSize: 11.5, color: "#616161", lineHeight: 1.5, flex: 1 }}>{u.why}</div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          alignSelf: "flex-start",
          fontSize: 10,
          color: "#616161",
          fontWeight: 600,
          background: "#F5F5F5",
          padding: "3px 8px",
          borderRadius: 999,
        }}
      >
        <Grid size={10} /> Cell · {u.cell}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #F0F0F0",
          paddingTop: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: u.stat.color, lineHeight: 1 }}>{u.stat.val}</div>
          <div style={{ fontSize: 9, color: "#9E9E9E", fontWeight: 600, marginTop: 2 }}>{u.stat.label}</div>
        </div>
        <button
          style={{
            background: accent,
            color: "#fff",
            border: "none",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Play size={11} /> {u.mins} min
        </button>
      </div>
    </div>
  );
}
