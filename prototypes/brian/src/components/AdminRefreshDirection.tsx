"use client";

import {
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  Filter,
  Inbox,
  Link as LinkIcon,
  Play,
  Radar,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { AnimatedNumber, Density, Animation, HcpAppBar } from "./Shared";
import { Avatar } from "./Primitives";

type AdminProps = {
  accent?: string;
  density?: Density;
  animation?: Animation;
};

type Severity = "high" | "med" | "low";

type Proposal = {
  id: number;
  title: string;
  type: string;
  severity: Severity;
  summary: string;
  sources: string[];
  affects: string[];
  diff: { added: number; edited: number; removed: number };
  confidence: number;
  status: "pending" | "approved" | "rejected";
  enrolled: number;
};

const sevColors: Record<Severity, { bg: string; fg: string; label: string }> = {
  high: { bg: "#FFDDE9", fg: "#880E4F", label: "High impact" },
  med: { bg: "#FFF1C6", fg: "#8C5400", label: "Medium impact" },
  low: { bg: "#DEF0FF", fg: "#0D47A1", label: "Low impact" },
};

export function AdminRefreshDirection({
  accent = "#0E6FBE",
  density = "cozy",
  animation = "normal",
}: AdminProps) {
  const accentColor = accent === "gradient" ? "#5655CE" : accent;
  const anim = animation !== "off";

  const sources = [
    { name: "OpenAI blog", lastSeen: "2h ago", found: 3, status: "scanning" },
    { name: "Anthropic news", lastSeen: "4h ago", found: 1, status: "idle" },
    { name: "Google DeepMind", lastSeen: "6h ago", found: 0, status: "idle" },
    {
      name: "arXiv (cs.CL/cs.AI)",
      lastSeen: "1h ago",
      found: 12,
      status: "scanning",
    },
    {
      name: "HuggingFace daily",
      lastSeen: "30m ago",
      found: 5,
      status: "scanning",
    },
    {
      name: "Hacker News (AI)",
      lastSeen: "12m ago",
      found: 8,
      status: "scanning",
    },
    { name: "r/LocalLLaMA", lastSeen: "3h ago", found: 2, status: "idle" },
    {
      name: "AI engineering blog",
      lastSeen: "5h ago",
      found: 1,
      status: "idle",
    },
  ];

  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: 1,
      title: "New module: GPT-5 reasoning controls",
      type: "NEW MODULE",
      severity: "high",
      summary:
        "OpenAI shipped new reasoning_effort & verbosity params. Affects 3 lessons in Prompt Engineering track.",
      sources: ["OpenAI blog · May 2", "arXiv 2604.18821"],
      affects: [
        "Prompt basics (Lv 2)",
        "Advanced prompting (Lv 4)",
        "Cost-aware prompting (Lv 3)",
      ],
      diff: { added: 2, edited: 3, removed: 0 },
      confidence: 0.94,
      status: "pending",
      enrolled: 1840,
    },
    {
      id: 2,
      title: "Update: Anthropic agent SDK examples",
      type: "CONTENT UPDATE",
      severity: "med",
      summary:
        "New computer-use API replaces older tool-call patterns in Module 6. Examples need refresh.",
      sources: ["Anthropic news · Apr 30"],
      affects: ["Agents 101 (Lv 5)", "Build a tool (Lv 6)"],
      diff: { added: 0, edited: 5, removed: 2 },
      confidence: 0.88,
      status: "pending",
      enrolled: 612,
    },
    {
      id: 3,
      title: "Flag: Outdated hallucination eval rubric",
      type: "DEPRECATION",
      severity: "low",
      summary:
        "Recent eval research suggests our 5-point rubric misses tool-use hallucinations. Consider updating.",
      sources: ["arXiv 2604.20911", "HuggingFace eval blog"],
      affects: ["Eval & checks (Lv 3)"],
      diff: { added: 1, edited: 1, removed: 0 },
      confidence: 0.71,
      status: "pending",
      enrolled: 410,
    },
  ]);

  const [activeTab, setActiveTab] = useState("pending");

  const handle = (id: number, status: "approved" | "rejected") => {
    setProposals((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const activity = [
    {
      who: "Priya M.",
      did: "approved",
      what: "GPT-5 cost guidance",
      when: "2h ago",
      avatar: "PM",
      color: "#00A344",
      isBot: false,
    },
    {
      who: "AI Curator",
      did: "flagged",
      what: "4 hallucination examples (re-check)",
      when: "5h ago",
      avatar: "AI",
      color: "#623CC9",
      isBot: true,
    },
    {
      who: "Devon K.",
      did: "rejected",
      what: "Anthropic SDK breaking changes",
      when: "8h ago",
      avatar: "DK",
      color: "#D81B60",
      isBot: false,
    },
    {
      who: "AI Curator",
      did: "discovered",
      what: "12 new arXiv papers, 1 high-impact",
      when: "12h ago",
      avatar: "AI",
      color: "#623CC9",
      isBot: true,
    },
    {
      who: "Priya M.",
      did: "edited",
      what: "Module 4 quiz question wording",
      when: "1d ago",
      avatar: "PM",
      color: "#00A344",
      isBot: false,
    },
  ];

  const stats = [
    {
      label: "Proposed updates",
      value: proposals.filter((p) => p.status === "pending").length,
      Icon: Inbox,
      color: accentColor,
      sub: "awaiting review",
    },
    {
      label: "Approved this month",
      value: 18,
      Icon: CheckCircle2,
      color: "#00A344",
      sub: "+6 vs last month",
    },
    {
      label: "Sources scanned",
      value: 142,
      Icon: Radar,
      color: "#623CC9",
      sub: "last 7 days",
    },
    {
      label: "Learners auto-updated",
      value: 2473,
      Icon: Users,
      color: "#BF8600",
      sub: "of 2,500 active",
    },
  ];

  const radarDots = [
    { x: 30, y: 30, hot: true },
    { x: 75, y: 20, hot: false },
    { x: 140, y: 35, hot: true },
    { x: 170, y: 60, hot: false },
    { x: 130, y: 90, hot: true },
    { x: 60, y: 95, hot: false },
    { x: 25, y: 75, hot: false },
    { x: 95, y: 50, hot: false },
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

      <div
        style={{
          padding: "20px 32px 8px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="eyebrow" style={{ color: "#616161" }}>
            AI Academy · Content approvers
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            Curriculum auto-refresh
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#EFECFA",
                color: "#623CC9",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#623CC9",
                  animation: anim ? "pulse2 1.6s infinite" : "none",
                }}
              />
              LIVE
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#616161",
              marginTop: 4,
            }}
          >
            Scans 14 sources · 3× weekly · 2,500 learners syncing automatically
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="hcp-btn hcp-btn--outlined">
            <Settings size={14} /> Configure
          </button>
          <button className="hcp-btn hcp-btn--ai">
            <Play size={14} /> Run scan now
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div
        style={{
          padding: "12px 32px 0",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {stats.map((s, i) => {
          const I = s.Icon;
          return (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${s.color}15`,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#616161",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  <AnimatedNumber value={s.value} />
                </div>
                <div style={{ fontSize: 11, color: "#616161" }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 320px",
          gap: 16,
          padding: "16px 32px 32px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: Sources radar */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
            padding: 16,
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
            <span className="eyebrow" style={{ color: "#616161" }}>
              Sources
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#623CC9",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#623CC9",
                  animation: anim ? "pulse2 1.6s infinite" : "none",
                }}
              />
              3 scanning
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: 120,
              borderRadius: 8,
              background:
                "radial-gradient(circle at center, #EFECFA 0%, #fff 70%)",
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 200 120"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              {[20, 40, 55].map((r) => (
                <circle
                  key={r}
                  cx="100"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke="#623CC9"
                  strokeOpacity="0.15"
                />
              ))}
              <line
                x1="100"
                y1="5"
                x2="100"
                y2="115"
                stroke="#623CC9"
                strokeOpacity="0.1"
              />
              <line
                x1="45"
                y1="60"
                x2="155"
                y2="60"
                stroke="#623CC9"
                strokeOpacity="0.1"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(98,60,201,.35) 30deg, transparent 60deg)",
                  animation: anim ? "spin 4s linear infinite" : "none",
                }}
              />
            </div>
            {radarDots.map((d, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(d.x / 200) * 100}%`,
                  top: `${(d.y / 120) * 100}%`,
                  width: d.hot ? 8 : 5,
                  height: d.hot ? 8 : 5,
                  borderRadius: "50%",
                  background: d.hot ? "#623CC9" : "#9E9E9E",
                  boxShadow: d.hot ? "0 0 0 0 rgba(98,60,201,.6)" : "none",
                  animation:
                    d.hot && anim
                      ? `pulse-dot 1.6s ease-out infinite ${i * 0.2}s`
                      : "none",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%,-50%)",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2FA7CD, #7A09BE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={10} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {sources.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      s.status === "scanning" ? "#623CC9" : "#BDBDBD",
                    animation:
                      s.status === "scanning" && anim
                        ? "pulse2 1.4s infinite"
                        : "none",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: "#9E9E9E" }}>
                    {s.lastSeen}
                  </div>
                </div>
                {s.found > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#EFECFA",
                      color: "#623CC9",
                      padding: "2px 6px",
                      borderRadius: 999,
                    }}
                  >
                    +{s.found}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Proposals */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #F5F5F5",
              padding: "0 20px",
            }}
          >
            {[
              {
                k: "pending",
                label: "Pending review",
                count: proposals.filter((p) => p.status === "pending").length,
              },
              { k: "approved", label: "Approved", count: 18 },
              { k: "rejected", label: "Rejected", count: 4 },
              { k: "history", label: "History", count: null as number | null },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "14px 16px",
                  borderBottom:
                    activeTab === t.k
                      ? `3px solid ${accentColor}`
                      : "3px solid transparent",
                  color: activeTab === t.k ? accentColor : "#616161",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {t.label}
                {t.count !== null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background:
                        activeTab === t.k ? `${accentColor}22` : "#F5F5F5",
                      color: activeTab === t.k ? accentColor : "#616161",
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {proposals.map((p) => {
              const sev = sevColors[p.severity];
              const isHandled = p.status !== "pending";
              return (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #E0E0E0",
                    borderRadius: 12,
                    padding: 16,
                    opacity: isHandled ? 0.5 : 1,
                    transition: "all .3s ease",
                    background: isHandled
                      ? p.status === "approved"
                        ? "#F6FDF3"
                        : "#FEF7F9"
                      : "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: ".08em",
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "#EFECFA",
                            color: "#623CC9",
                          }}
                        >
                          {p.type}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: ".04em",
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: sev.bg,
                            color: sev.fg,
                          }}
                        >
                          {sev.label}
                        </span>
                        <span style={{ fontSize: 11, color: "#616161" }}>
                          confidence {Math.round(p.confidence * 100)}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#616161",
                          lineHeight: 1.5,
                        }}
                      >
                        {p.summary}
                      </div>
                    </div>
                    {isHandled && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          color: p.status === "approved" ? "#00A344" : "#D81B60",
                        }}
                      >
                        {p.status === "approved" ? (
                          <Check size={14} />
                        ) : (
                          <X size={14} />
                        )}
                        {p.status === "approved" ? "Approved" : "Rejected"}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 10,
                      marginBottom: 12,
                    }}
                  >
                    {p.sources.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#F5F5F5",
                          color: "#616161",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <LinkIcon size={10} /> {s}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      background: "#FAFAFA",
                      border: "1px dashed #E0E0E0",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#616161",
                        marginBottom: 6,
                        fontSize: 11,
                        letterSpacing: ".04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Affects
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      {p.affects.map((a) => (
                        <span
                          key={a}
                          style={{
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "#fff",
                            border: "1px solid #E0E0E0",
                            color: "#212121",
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        fontSize: 11,
                        color: "#616161",
                      }}
                    >
                      <span style={{ color: "#00A344", fontWeight: 700 }}>
                        +{p.diff.added} new
                      </span>
                      <span style={{ color: "#BF8600", fontWeight: 700 }}>
                        ~{p.diff.edited} edited
                      </span>
                      <span style={{ color: "#D81B60", fontWeight: 700 }}>
                        −{p.diff.removed} removed
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        {p.enrolled.toLocaleString()} learners affected
                      </span>
                    </div>
                  </div>

                  {!isHandled && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handle(p.id, "approved")}
                        className="hcp-btn hcp-btn--contained"
                        style={{ background: "#00A344" }}
                      >
                        <Check size={14} /> Approve & publish
                      </button>
                      <button className="hcp-btn hcp-btn--outlined">
                        <Edit3 size={14} /> Edit first
                      </button>
                      <button
                        className="hcp-btn hcp-btn--text"
                        style={{ color: "#616161" }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                      <button
                        onClick={() => handle(p.id, "rejected")}
                        className="hcp-btn hcp-btn--text"
                        style={{ color: "#D81B60", marginLeft: "auto" }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Activity feed */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
            padding: 16,
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
            <span className="eyebrow" style={{ color: "#616161" }}>
              Activity
            </span>
            <Filter size={14} style={{ color: "#9E9E9E" }} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {activity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar initials={a.avatar} size={28} color={a.color} />
                  {a.isBot && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#fff",
                        border: "2px solid #fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                      }}
                    >
                      <Sparkles size={8} color="#623CC9" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{a.who}</span>{" "}
                    <span
                      style={{
                        color:
                          a.did === "approved"
                            ? "#00A344"
                            : a.did === "rejected"
                              ? "#D81B60"
                              : "#616161",
                      }}
                    >
                      {a.did}
                    </span>{" "}
                    <span>{a.what}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#9E9E9E",
                      marginTop: 2,
                    }}
                  >
                    {a.when}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: "#EFECFA",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#623CC9",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={12} /> NEXT SCAN
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#212121",
                fontWeight: 600,
              }}
            >
              Tomorrow at 6:00am PT
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#616161",
                marginTop: 2,
              }}
            >
              Mon/Wed/Fri schedule · 14 sources
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
