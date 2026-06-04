"use client";

import {
  Bell,
  Briefcase,
  CalendarDays,
  DollarSign,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Search,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Avatar } from "./Primitives";

export type Density = "cozy" | "compact";
export type Animation = "off" | "normal";
export type Persona = "non-tech" | "tech" | "leader";
export type Gamification = "off" | "light" | "heavy";

export const PERSONAS: Record<
  Persona,
  { label: string; topic: string; example: string }
> = {
  "non-tech": {
    label: "Non-technical (Sales/Ops)",
    topic: "Writing better customer follow-ups with AI",
    example: "Draft a polite reminder to a customer 7 days overdue on payment.",
  },
  tech: {
    label: "Technical (Eng/Data)",
    topic: "RAG pipelines: retrieval, ranking, grounding",
    example: "Sketch a RAG pipeline that grounds answers in HCP's help docs.",
  },
  leader: {
    label: "Leader (Manager)",
    topic: "Scoping AI pilots that ship in 30 days",
    example: "Propose 3 measurable pilots for your team this quarter.",
  },
};

type HcpAppBarProps = {
  activeTab?: string;
  accent?: string;
  density?: Density;
};

export function HcpAppBar({
  activeTab = "learn",
  accent = "#0E6FBE",
  density = "cozy",
}: HcpAppBarProps) {
  const TABS = [
    { key: "dash", label: "Dash", Icon: LayoutDashboard },
    { key: "schedule", label: "Schedule", Icon: CalendarDays },
    { key: "jobs", label: "Jobs", Icon: Briefcase },
    { key: "customers", label: "Customers", Icon: Users },
    { key: "learn", label: "AI Academy", Icon: GraduationCap },
    { key: "money", label: "My Money", Icon: DollarSign },
  ];
  const h = density === "compact" ? 48 : 56;
  return (
    <div
      style={{
        height: h,
        background: "#fff",
        borderBottom: "1px solid #E0E0E0",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      <Image
        src="/assets/housecall-pro-wordmark.svg"
        alt="Housecall Pro"
        width={120}
        height={22}
        style={{ height: 22, width: "auto" }}
        priority
      />
      <div style={{ display: "flex", gap: 2, marginLeft: 12 }}>
        {TABS.map((t) => {
          const active = t.key === activeTab;
          const I = t.Icon;
          return (
            <div
              key={t.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 12px",
                height: h,
                borderBottom: active
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
                color: active ? accent : "#616161",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <I size={16} />
              {t.label}
              {t.key === "learn" && (
                <span
                  style={{
                    background: "#EFECFA",
                    color: "#623CC9",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 999,
                    marginLeft: 2,
                  }}
                >
                  NEW
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "#F5F5F5",
          borderRadius: 999,
          fontSize: 12,
          color: "#616161",
        }}
      >
        <Search size={14} /> Search
      </div>
      <Bell size={18} style={{ color: "#616161" }} />
      <Avatar initials="MR" size={30} color={accent} />
    </div>
  );
}

type AnimatedNumberProps = {
  value: number;
  duration?: number;
  format?: (n: number) => string;
};

export function AnimatedNumber({
  value,
  duration = 800,
  format = (n) => Math.round(n).toLocaleString(),
}: AnimatedNumberProps) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setN(start + (end - start) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

type RingProps = {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
};

export function Ring({
  value = 0.6,
  size = 96,
  stroke = 10,
  color = "#0E6FBE",
  track = "#E3F2FD",
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)",
          }}
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
        {children}
      </div>
    </div>
  );
}

export function XPChip({
  xp = 1240,
  streak = 7,
  gamification = "light",
  accent = "#0E6FBE",
  animated = true,
}: {
  xp?: number;
  streak?: number;
  gamification?: Gamification;
  accent?: string;
  animated?: boolean;
}) {
  if (gamification === "off") return null;
  const xpBg = accent === "#623CC9" ? "#EFECFA" : "#E3F2FD";
  return (
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
            animation: animated ? "flicker 1.6s ease-in-out infinite" : "none",
          }}
        >
          <Flame size={14} />
        </span>
        {streak}-day streak
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: xpBg,
          color: accent,
          padding: "6px 12px",
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <Zap size={14} />
        <AnimatedNumber value={xp} /> XP
      </div>
    </div>
  );
}

export function useReveal(delay = 0): CSSProperties {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(8px)",
    transition: "opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1)",
  };
}
