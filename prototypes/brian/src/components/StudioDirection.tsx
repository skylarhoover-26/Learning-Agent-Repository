"use client";

import {
  ArrowRight,
  BarChart3,
  Clock,
  Code,
  Flame,
  Headphones,
  Info,
  Lightbulb,
  Play,
  Repeat,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import {
  AnimatedNumber,
  Density,
  Animation,
  Gamification,
  HcpAppBar,
  PERSONAS,
  Persona,
  Ring,
} from "./Shared";
import {
  loadProfile,
  orgPercentile,
  Profile,
  recommendNextLesson,
  ROLE_LABEL,
  SKILL_LABEL,
} from "@/lib/profile";
import { WhatsNewWidget } from "./WhatsNewWidget";

type StudioProps = {
  accent?: string;
  gamification?: Gamification;
  persona?: Persona;
  density?: Density;
  animation?: Animation;
};

export function StudioDirection({
  accent = "#0E6FBE",
  gamification = "light",
  persona = "non-tech",
  density = "cozy",
  animation = "normal",
}: StudioProps) {
  const p = PERSONAS[persona];
  const pad = density === "compact" ? 16 : 24;
  const gap = density === "compact" ? 12 : 16;
  const useAi = accent === "#623CC9" || accent === "gradient";
  const accentColor = accent === "gradient" ? "#5655CE" : accent;
  const anim = animation !== "off";

  const [quizAns, setQuizAns] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Load saved learner profile (set by /onboarding) so the page personalizes.
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    setProfile(loadProfile());
  }, []);
  const personalized = !!profile;
  const recommendation = profile ? recommendNextLesson(profile) : null;
  const percentile = profile ? orgPercentile(profile) : null;
  const yourDept =
    profile?.role === "cs"
      ? "Customer Success"
      : profile?.role === "engineering"
        ? "Engineering"
        : profile?.role === "analytics"
          ? "Analytics"
          : profile?.role === "people"
            ? "People"
            : profile?.role === "sales"
              ? "Sales"
              : null;

  const [xp, setXp] = useState(3940);
  useEffect(() => {
    if (!anim) return;
    const t = setInterval(
      () => setXp((v) => v + Math.floor(Math.random() * 3)),
      4500,
    );
    return () => clearInterval(t);
  }, [anim]);

  const tones = [
    { name: "warm", color: "#D81B60" },
    { name: "concise", color: "#0E6FBE" },
    { name: "playful", color: "#BF8600" },
  ];
  const [toneIdx, setToneIdx] = useState(0);
  useEffect(() => {
    if (!anim) return;
    const t = setInterval(() => setToneIdx((i) => (i + 1) % tones.length), 2400);
    return () => clearInterval(t);
  }, [anim, tones.length]);
  const tone = tones[toneIdx];

  const [score, setScore] = useState(0);
  useEffect(() => {
    if (!anim) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setScore(Math.round(78 * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, mounted]);

  const [hoverSkill, setHoverSkill] = useState(-1);

  const [viewers, setViewers] = useState(412);
  useEffect(() => {
    if (!anim) return;
    const t = setInterval(
      () =>
        setViewers((v) =>
          Math.max(
            380,
            Math.min(
              460,
              v + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 3),
            ),
          ),
        ),
      1800,
    );
    return () => clearInterval(t);
  }, [anim]);

  const [flashIdx, setFlashIdx] = useState(-1);
  useEffect(() => {
    if (!anim) return;
    const t = setInterval(() => setFlashIdx((i) => (i + 1) % 3), 3200);
    return () => clearInterval(t);
  }, [anim]);

  type Skill = {
    name: string;
    level: number;
    mastery: number;
    hot: boolean;
  };
  const skills: Skill[] = profile
    ? [
        {
          name: SKILL_LABEL.prompting,
          level: Math.round(profile.skills.prompting * 5),
          mastery: profile.skills.prompting,
          hot: false,
        },
        {
          name: SKILL_LABEL.comms,
          level: Math.round(profile.skills.comms * 5),
          mastery: profile.skills.comms,
          hot: true,
        },
        {
          name: SKILL_LABEL.privacy,
          level: Math.round(profile.skills.privacy * 5),
          mastery: profile.skills.privacy,
          hot: false,
        },
        {
          name: SKILL_LABEL.agents,
          level: Math.round(profile.skills.agents * 5),
          mastery: profile.skills.agents,
          hot: true,
        },
        {
          name: SKILL_LABEL.eval,
          level: Math.round(profile.skills.eval * 5),
          mastery: profile.skills.eval,
          hot: false,
        },
        {
          name: SKILL_LABEL.data,
          level: Math.round(profile.skills.data * 5),
          mastery: profile.skills.data,
          hot: false,
        },
      ]
    : [
        { name: "Prompting basics", level: 4, mastery: 0.85, hot: false },
        { name: "Customer comms with AI", level: 3, mastery: 0.62, hot: true },
        { name: "Data privacy & PII", level: 2, mastery: 0.4, hot: false },
        { name: "AI agents & tools", level: 1, mastery: 0.18, hot: true },
        { name: "Eval & hallucinations", level: 2, mastery: 0.3, hot: false },
        { name: "Image & voice models", level: 0, mastery: 0.05, hot: false },
      ];

  const recent = [
    {
      title: "GPT-5 reasoning best practices",
      ago: "2d",
      diff: "+ 3 examples",
      src: "OpenAI blog · arXiv",
    },
    {
      title: "Anthropic's new agent SDK",
      ago: "4d",
      diff: "New module",
      src: "Anthropic news",
    },
    {
      title: "Hallucination eval techniques",
      ago: "6d",
      diff: "Updated rubric",
      src: "HuggingFace · arXiv",
    },
  ];

  const departments = [
    {
      name: "Customer Success",
      xp: 14820,
      members: 412,
      color: "#00A344",
      Icon: Headphones,
      mover: "+12%",
      you: yourDept === "Customer Success",
    },
    {
      name: "Sales",
      xp: 12840,
      members: 380,
      color: accentColor,
      Icon: TrendingUp,
      you: yourDept === null || yourDept === "Sales",
      mover: "+8%",
    },
    {
      name: "Engineering",
      xp: 11560,
      members: 280,
      color: "#0E6FBE",
      Icon: Code,
      mover: "+9%",
      you: yourDept === "Engineering",
    },
    {
      name: "Analytics",
      xp: 10240,
      members: 145,
      color: "#623CC9",
      Icon: BarChart3,
      mover: "+11%",
      you: yourDept === "Analytics",
    },
    {
      name: "People",
      xp: 8740,
      members: 120,
      color: "#BF8600",
      Icon: Users,
      mover: "+6%",
      you: yourDept === "People",
    },
  ];
  const maxDeptXp = Math.max(...departments.map((d) => d.xp));

  const reveal = (i: number): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(14px)",
    transition: anim
      ? `opacity .55s ease ${i * 60}ms, transform .55s cubic-bezier(.2,.8,.2,1) ${i * 60}ms`
      : "none",
  });

  const quizOptions = [
    { k: "a", text: "Whether the AI tool is approved for PII at HCP", ok: true },
    { k: "b", text: "How long the recording is", ok: false },
    { k: "c", text: "Which model variant they're using", ok: false },
  ];

  return (
    <div
      style={{
        width: "100%",
        minHeight: 900,
        background: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <HcpAppBar activeTab="learn" accent={accentColor} density={density} />

      {!personalized && (
        <Link
          href="/onboarding"
          style={{
            margin: `${pad}px ${pad + 8}px 0`,
            padding: "14px 18px",
            background:
              "linear-gradient(110deg, #2FA7CD 4%, #5655CE 35%, #7A09BE 100%)",
            color: "#fff",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            boxShadow: "0 6px 18px rgba(98,60,201,.25)",
          }}
        >
          <Sparkles size={20} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Take the 3-minute placement so we can personalize your training.
            </div>
            <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
              Your home, lessons, and weekly updates all adapt to your role
              and gaps.
            </div>
          </div>
          <ArrowRight size={18} />
        </Link>
      )}

      <div
        style={{
          padding: `${pad}px ${pad + 8}px ${gap}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          ...reveal(0),
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ color: "#616161" }}>
            AI Academy · Tuesday, May 5
            {personalized && profile && (
              <>
                {" · "}
                <span style={{ color: accentColor, fontWeight: 700 }}>
                  {ROLE_LABEL[profile.role]}
                  {profile.isManager ? " · Manager" : ""}
                </span>
              </>
            )}
          </div>
          <h5
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Good morning, Mara — let&apos;s keep the streak.
          </h5>
          {personalized && percentile && (
            <Link
              href="/profile"
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: "#EFECFA",
                color: "#4E30A1",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background-color .15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#E6DFF7")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#EFECFA")
              }
            >
              <Sparkles size={12} />
              Top {Math.max(4, 100 - percentile.pct)}% of{" "}
              {profile && ROLE_LABEL[profile.role]} for{" "}
              {SKILL_LABEL[percentile.skill]}
              <ArrowRight size={12} />
            </Link>
          )}
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
                  animation: anim
                    ? "flicker 1.6s ease-in-out infinite"
                    : "none",
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
                background: accentColor === "#623CC9" ? "#EFECFA" : "#E3F2FD",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap,
          padding: `0 ${pad + 8}px ${pad + 8}px`,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {/* HERO */}
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
              padding: 28,
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
                animation: anim
                  ? "float 10s ease-in-out infinite reverse"
                  : "none",
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
            {anim &&
              [...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${((i * 113) % 92) + 4}%`,
                    top: `${((i * 71) % 80) + 10}%`,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.9)",
                    animation: `sparkle ${3 + (i % 3)}s ease-in-out infinite ${i * 0.4}s`,
                  }}
                />
              ))}

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
              <span
                style={{
                  display: "inline-flex",
                  animation: anim ? "spin-slow 8s linear infinite" : "none",
                }}
              >
                <Sparkles size={14} />
              </span>
              Today&apos;s lesson · 5 min · adaptive
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.2,
                maxWidth: 600,
                marginBottom: 12,
                position: "relative",
              }}
            >
              {recommendation?.title ?? p.topic}
            </div>
            {personalized && recommendation && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: "rgba(255,255,255,.18)",
                  border: "1px solid rgba(255,255,255,.35)",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  marginBottom: 10,
                  position: "relative",
                }}
              >
                <Sparkles size={12} /> {recommendation.reasonHeadline}
              </div>
            )}
            <div
              style={{
                fontSize: 15,
                opacity: 0.92,
                maxWidth: 640,
                marginBottom: 20,
                position: "relative",
              }}
            >
              {personalized && recommendation
                ? recommendation.reasonBody
                : "We picked this because your last quiz nailed prompt clarity but stalled on tone. Today: rewrite a real Housecall Pro follow-up with three different tones, then ship the best one."}
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
              <Link
                href="/lesson/customer-followups"
                className="hero-cta"
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
                  transition: "transform .18s ease, box-shadow .18s ease",
                  textDecoration: "none",
                }}
              >
                <Play size={14} /> Start lesson
              </Link>
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
                <Clock size={14} /> Save for later
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
                <AnimatedNumber value={viewers} duration={400} /> in your org
                started this today
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 24,
                position: "relative",
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: i === 0 ? "#fff" : "rgba(255,255,255,.25)",
                    transform: mounted ? "scaleX(1)" : "scaleX(.2)",
                    transformOrigin: "left",
                    transition: anim
                      ? `transform .8s cubic-bezier(.2,.8,.2,1) ${300 + i * 80}ms`
                      : "none",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginTop: 6,
                opacity: 0.85,
                position: "relative",
              }}
            >
              <span>1. Read</span>
              <span>2. Try</span>
              <span>3. Compare</span>
              <span>4. Ship</span>
              <span>5. Reflect</span>
            </div>
          </div>

          {/* MICRO-QUIZ + PROMPT TRY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap,
            }}
          >
            <div
              style={{
                ...reveal(2),
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
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  marginBottom: 14,
                }}
              >
                A teammate asks ChatGPT to &quot;summarize this customer call
                recording.&quot; What&apos;s the first thing to check?
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {quizOptions.map((o) => {
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
                        background: showResult
                          ? o.ok
                            ? "#DCF9D7"
                            : "#FFDDE9"
                          : "#fff",
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
                          background: showResult
                            ? o.ok
                              ? "#00A344"
                              : "#D81B60"
                            : "#F5F5F5",
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
                    Right — call recordings carry PII. Use the HCP-approved
                    tool list before pasting any customer data.
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                ...reveal(3),
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
                  Prompt playground
                </span>
                <span style={{ fontSize: 11, color: "#616161" }}>
                  Auto-graded · 3 tries left
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#424242",
                  marginBottom: 10,
                }}
              >
                Write a prompt that turns this messy job note into a clear
                customer summary.
              </div>
              <div
                style={{
                  background: "#FAFAFA",
                  border: "1px dashed #E0E0E0",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: "#616161",
                  fontFamily: "ui-monospace, Menlo, monospace",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                &quot;cust said AC blowing warm — checked refrig, low — added
                2lb 410a — recommended coil clean nxt visit&quot;
              </div>
              <div
                style={{
                  flex: 1,
                  border: "1px solid #BDBDBD",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                  color: "#212121",
                  minHeight: 60,
                  fontFamily: "ui-monospace, Menlo, monospace",
                }}
              >
                Rewrite this technician note as a friendly 2-sentence message
                to the customer
                <span
                  key={tone.name}
                  style={{
                    background: tone.color,
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontSize: 11,
                    marginLeft: 4,
                    display: "inline-block",
                    animation: anim
                      ? "tonePop .35s cubic-bezier(.34,1.56,.64,1)"
                      : "none",
                  }}
                >
                  tone: {tone.name}
                </span>
                <span
                  style={{
                    animation: anim ? "blink 1.1s steps(2) infinite" : "none",
                    marginLeft: 2,
                  }}
                >
                  |
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: "#616161" }}>Score:</span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: "#F5F5F5",
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #FFC107, #00A344)",
                      transition: anim ? "width .15s linear" : "none",
                    }}
                  />
                  {anim && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: "40%",
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)",
                        animation: "progressShine 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#00A344" }}
                >
                  {score}
                </span>
                <button
                  style={{
                    marginLeft: 8,
                    padding: "6px 12px",
                    background: accentColor,
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "transform .18s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-1px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          {/* SKILL MAP */}
          <div
            style={{
              ...reveal(4),
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#616161" }}>
                  Your skill map
                </span>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  6 of 12 areas in progress
                </div>
              </div>
              <button className="hcp-btn hcp-btn--text">View full map</button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {skills.map((s, i) => {
                const hovered = hoverSkill === i;
                return (
                  <div
                    key={s.name}
                    onMouseEnter={() => setHoverSkill(i)}
                    onMouseLeave={() => setHoverSkill(-1)}
                    style={{
                      border: "1px solid #E0E0E0",
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: s.hot
                        ? "linear-gradient(135deg, #fff 0%, #EFECFA 100%)"
                        : "#fff",
                      transform: hovered
                        ? "translateY(-3px)"
                        : "translateY(0)",
                      boxShadow: hovered
                        ? "0 6px 16px rgba(0,0,0,.10)"
                        : "0 0 0 rgba(0,0,0,0)",
                      transition: anim
                        ? "all .22s cubic-bezier(.2,.8,.2,1)"
                        : "none",
                    }}
                  >
                    <Ring
                      value={mounted ? s.mastery : 0}
                      size={48}
                      stroke={6}
                      color={
                        s.mastery > 0.7
                          ? "#00A344"
                          : s.mastery > 0.4
                            ? accentColor
                            : "#BDBDBD"
                      }
                      track="#F5F5F5"
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>
                        <AnimatedNumber
                          value={mounted ? Math.round(s.mastery * 100) : 0}
                          duration={1200}
                        />
                      </span>
                    </Ring>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#616161",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        Level {s.level}/5
                        {s.hot && (
                          <span
                            style={{
                              background: "#EFECFA",
                              color: "#623CC9",
                              padding: "1px 6px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                animation: anim
                                  ? "flicker 1.6s ease-in-out infinite"
                                  : "none",
                              }}
                            >
                              <Flame size={10} />
                            </span>
                            Hot topic
                          </span>
                        )}
                      </div>
                    </div>
                    {hovered && anim && (
                      <ArrowRight
                        size={16}
                        style={{
                          color: accentColor,
                          animation: "slideRight .25s ease",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {/* Daily streak ring */}
          <div
            style={{
              ...reveal(2),
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Ring
              value={mounted ? 0.6 : 0}
              size={84}
              stroke={9}
              color={accentColor}
              track="#F5F5F5"
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  <AnimatedNumber value={mounted ? 3 : 0} duration={1100} />
                  <span style={{ color: "#9E9E9E", fontSize: 14 }}>/5</span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "#616161",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  this week
                </div>
              </div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                5-min daily drill
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#616161",
                  lineHeight: 1.5,
                }}
              >
                2 more this week to keep your streak alive. Last drill: 4 days
                ago — 88% accuracy.
              </div>
            </div>
          </div>

          {/* What's new this week — role-aware impact (when profile exists),
              otherwise the legacy "refreshed this week" mini-feed. */}
          {personalized && profile ? (
            <div style={{ ...reveal(3) }}>
              <WhatsNewWidget role={profile.role} />
            </div>
          ) : (
          <div
            style={{
              ...reveal(3),
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#623CC9" }}>
                  Refreshed this week
                </span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  What&apos;s new in your training
                </div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#00A344",
                  animation: anim ? "pulse 2s infinite" : "none",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {recent.map((r, i) => {
                const flashing = flashIdx === i;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 8px",
                      borderRadius: 6,
                      borderBottom:
                        i < recent.length - 1 ? "1px solid #F5F5F5" : "none",
                      background:
                        flashing && anim
                          ? "rgba(98,60,201,.06)"
                          : "transparent",
                      transition: "background .8s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#623CC9",
                        marginTop: 7,
                        flexShrink: 0,
                        boxShadow:
                          flashing && anim
                            ? "0 0 0 4px rgba(98,60,201,.18)"
                            : "none",
                        transition: "box-shadow .8s ease",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {r.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#616161" }}>
                        {r.diff} · {r.src} · {r.ago} ago
                      </div>
                    </div>
                    {flashing && anim && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#623CC9",
                          background: "#EFECFA",
                          padding: "2px 6px",
                          borderRadius: 999,
                          animation: "fadeOut 1.6s ease forwards",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: "#EFECFA",
                borderRadius: 8,
                fontSize: 12,
                color: "#4E30A1",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Info size={14} />
              Updated by HCP&apos;s AI Curriculum team · weekly
            </div>
          </div>
          )}

          {/* Department leaderboard */}
          <div
            style={{
              ...reveal(4),
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: pad,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#616161" }}>
                  This week&apos;s squad challenge
                </span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Department leaderboard
                </div>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  animation: anim ? "wobble 4s ease-in-out infinite" : "none",
                }}
              >
                <Trophy size={18} style={{ color: "#BF8600" }} />
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {departments.map((d, i) => {
                const pct = (d.xp / maxDeptXp) * 100;
                const I = d.Icon;
                return (
                  <div
                    key={d.name}
                    style={{
                      padding: d.you ? "8px 10px" : "0",
                      borderRadius: 8,
                      background: d.you ? "#E3F2FD" : "transparent",
                      border: d.you
                        ? `1px solid ${accentColor}`
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          fontSize: 11,
                          fontWeight: 700,
                          color: i === 0 ? "#BF8600" : "#9E9E9E",
                          textAlign: "center",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: `${d.color}1F`,
                          color: d.color,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <I size={12} />
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: d.you ? 700 : 600,
                          }}
                        >
                          {d.name}
                        </span>
                        {d.you && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: accentColor,
                              background: "#fff",
                              padding: "1px 6px",
                              borderRadius: 999,
                              border: `1px solid ${accentColor}`,
                            }}
                          >
                            YOU
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            color: "#616161",
                            marginLeft: "auto",
                          }}
                        >
                          {d.members} learners
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#00A344",
                          background: "#DCF9D7",
                          padding: "2px 6px",
                          borderRadius: 999,
                        }}
                      >
                        {d.mover}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        paddingLeft: 22,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          background: "#F5F5F5",
                          borderRadius: 5,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            height: "100%",
                            background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)`,
                            borderRadius: 5,
                            transition: anim
                              ? `width 1.2s cubic-bezier(.2,.8,.2,1) ${300 + i * 120}ms`
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
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)",
                                backgroundSize: "200% 100%",
                                animation:
                                  "progressShine 2.4s ease-in-out infinite",
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: d.color,
                          minWidth: 56,
                          textAlign: "right",
                        }}
                      >
                        <AnimatedNumber
                          value={mounted ? d.xp : 0}
                          duration={1300}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                padding: 10,
                background: "#FAFAFA",
                borderRadius: 8,
                fontSize: 12,
                color: "#616161",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Clock size={14} />
              2 days, 14h left · winning squad gets early access to the GPT-5
              evals module
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
