"use client";

import { SKILL_LABEL, SkillKey } from "@/lib/profile";

const ACCENT = "#0E6FBE";

export function ProfileRadar({
  skills,
  size = 280,
}: {
  skills: Record<SkillKey, number>;
  size?: number;
}) {
  const keys = Object.keys(SKILL_LABEL) as SkillKey[];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 50;

  const points = keys.map((k, i) => {
    const angle = (i / keys.length) * 2 * Math.PI - Math.PI / 2;
    const v = skills[k];
    return {
      key: k,
      x: cx + Math.cos(angle) * r * v,
      y: cy + Math.sin(angle) * r * v,
      lx: cx + Math.cos(angle) * (r + 18),
      ly: cy + Math.sin(angle) * (r + 18),
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
    <svg width={size} height={size} style={{ overflow: "visible" }}>
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
      />
      {points.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r={4} fill={ACCENT} />
      ))}
      {points.map((p) => (
        <text
          key={p.key + "-l"}
          x={p.lx}
          y={p.ly}
          textAnchor={p.lx > cx + 10 ? "start" : p.lx < cx - 10 ? "end" : "middle"}
          fontSize={11}
          fontWeight={600}
          fill="#424242"
        >
          {SKILL_LABEL[p.key]}
        </text>
      ))}
    </svg>
  );
}
