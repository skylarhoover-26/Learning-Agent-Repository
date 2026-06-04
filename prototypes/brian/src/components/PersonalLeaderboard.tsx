"use client";

import { Award, Building2, Crown, Users } from "lucide-react";
import { Profile, Role, ROLE_LABEL } from "@/lib/profile";

const ACCENT = "#0E6FBE";

// Department populations, tuned to roughly add up to ~2,500 — stable
// across the demo so percentile + rank numbers stay coherent.
const DEPT_SIZE: Record<Role, number> = {
  cs: 412,
  sales: 380,
  engineering: 280,
  analytics: 145,
  people: 120,
  other: 1163,
};
const ORG_SIZE = 2500;

// Deterministic fake-name pool — re-used by anchor index. In production
// these come from the org directory (filtered by privacy settings).
const NAMES = [
  "Priya M.",
  "Devon K.",
  "Marcus L.",
  "Skylar O.",
  "Bridget R.",
  "Casey N.",
  "Jordan P.",
  "Sam W.",
  "Avery T.",
  "Riley B.",
  "Quinn S.",
  "Reese F.",
  "Jamie H.",
  "Dakota V.",
  "Morgan Z.",
  "Hayden D.",
  "Phoenix A.",
  "Sage E.",
  "River C.",
  "Charlie G.",
];

function avgMastery(p: Profile) {
  const vals = Object.values(p.skills);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Compute deterministic ranks based on average mastery. A 0.85 average
// puts you near the top; 0.3 puts you mid-pack.
function computeRanks(p: Profile) {
  const m = avgMastery(p);
  const deptSize = DEPT_SIZE[p.role];
  // Map mastery 0..1 → percentile 5..96
  const deptPct = Math.max(5, Math.min(96, Math.round(100 - m * 92 - 4)));
  const orgPct = Math.max(5, Math.min(96, Math.round(100 - m * 90 - 6)));
  const deptRank = Math.max(1, Math.round((deptPct / 100) * deptSize));
  const orgRank = Math.max(1, Math.round((orgPct / 100) * ORG_SIZE));
  return { deptRank, deptSize, orgRank, orgSize: ORG_SIZE };
}

function buildPeers(p: Profile, anchor: number, total: number) {
  // Show 2 above + you + 2 below
  const ranks = [anchor - 2, anchor - 1, anchor, anchor + 1, anchor + 2].filter(
    (r) => r >= 1 && r <= total,
  );
  const m = avgMastery(p);
  return ranks.map((rank, i) => {
    const isYou = rank === anchor;
    // XP modeled on rank: top of org ~16k, bottom ~1k
    const xp = Math.round(
      16000 - ((rank - 1) / Math.max(1, total - 1)) * 14500,
    );
    const name = isYou
      ? "You"
      : NAMES[(rank * 7 + (p.role.length || 1)) % NAMES.length];
    return {
      rank,
      name,
      xp,
      mastery: isYou ? Math.round(m * 100) : Math.round(60 + (Math.random() * 0)),
      isYou,
      key: `peer-${rank}-${i}`,
    };
  });
}

export function PersonalLeaderboard({ profile }: { profile: Profile }) {
  const { deptRank, deptSize, orgRank, orgSize } = computeRanks(profile);
  const deptPeers = buildPeers(profile, deptRank, deptSize);
  const orgPeers = buildPeers(profile, orgRank, orgSize);
  const m = avgMastery(profile);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      <RankPanel
        icon={<Building2 size={16} />}
        label={`In ${ROLE_LABEL[profile.role]}`}
        rank={deptRank}
        total={deptSize}
        peers={deptPeers}
        accent={ACCENT}
      />
      <RankPanel
        icon={<Users size={16} />}
        label="Across the org"
        rank={orgRank}
        total={orgSize}
        peers={orgPeers}
        accent="#623CC9"
      />
      <div style={{ gridColumn: "1 / -1" }}>
        <BellCurve mastery={m} pctile={Math.round(((orgSize - orgRank) / orgSize) * 100)} />
      </div>
    </div>
  );
}

function RankPanel({
  icon,
  label,
  rank,
  total,
  peers,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  rank: number;
  total: number;
  peers: { rank: number; name: string; xp: number; isYou: boolean; key: string }[];
  accent: string;
}) {
  const pct = Math.round(((total - rank) / total) * 100);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E0E0E0",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {icon} {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#fff",
            background: accent,
            padding: "3px 8px",
            borderRadius: 999,
          }}
        >
          Top {100 - pct + 1}%
        </span>
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#212121",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        #{rank.toLocaleString()}
        <span style={{ fontSize: 16, color: "#9E9E9E", fontWeight: 500 }}>
          {" "}
          of {total.toLocaleString()}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#616161", marginBottom: 12 }}>
        Higher than {pct}% of {label.toLowerCase()}
      </div>

      <div
        style={{
          borderTop: "1px solid #F5F5F5",
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {peers.map((p) => (
          <div
            key={p.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
              borderRadius: 6,
              background: p.isYou ? `${accent}10` : "transparent",
              border: p.isYou ? `1px solid ${accent}` : "1px solid transparent",
            }}
          >
            <span
              style={{
                width: 30,
                fontSize: 11,
                fontWeight: 700,
                color: p.isYou ? accent : "#9E9E9E",
                textAlign: "right",
              }}
            >
              #{p.rank}
            </span>
            {p.rank === 1 ? (
              <Crown size={12} color="#BF8600" />
            ) : (
              <span style={{ width: 12 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: p.isYou ? 700 : 500,
                color: "#212121",
              }}
            >
              {p.name}
              {p.isYou && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: accent,
                    marginLeft: 6,
                    padding: "1px 6px",
                    background: "#fff",
                    borderRadius: 999,
                    border: `1px solid ${accent}`,
                  }}
                >
                  YOU
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: p.isYou ? accent : "#616161",
              }}
            >
              {p.xp.toLocaleString()} XP
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BellCurve({ mastery, pctile }: { mastery: number; pctile: number }) {
  // x: 0..100 percentile, y: bell-curve density approximated.
  const w = 760;
  const h = 110;
  const points: string[] = [];
  for (let x = 0; x <= 100; x += 2) {
    const z = (x - 50) / 18;
    const y = Math.exp(-(z * z) / 2);
    const py = h - 12 - y * (h - 24);
    const px = (x / 100) * w;
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const pathD = `M ${points[0]} L ${points.slice(1).join(" L ")}`;
  const yourX = (pctile / 100) * w;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E0E0E0",
        borderRadius: 12,
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
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "#623CC9",
            textTransform: "uppercase",
          }}
        >
          <Award size={14} /> Where you sit on the org curve
        </span>
        <span style={{ fontSize: 12, color: "#616161" }}>
          {Math.round(mastery * 100)}/100 average mastery
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 110, display: "block" }}
      >
        <defs>
          <linearGradient id="bell-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E6FBE" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0E6FBE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L ${w},${h - 12} L 0,${h - 12} Z`}
          fill="url(#bell-fill)"
        />
        <path
          d={pathD}
          stroke={ACCENT}
          strokeWidth={1.5}
          fill="none"
        />
        <line
          x1={yourX}
          y1={4}
          x2={yourX}
          y2={h - 12}
          stroke="#623CC9"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <circle cx={yourX} cy={h - 12} r={6} fill="#623CC9" />
        <text
          x={yourX}
          y={h - 22}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="#623CC9"
        >
          You
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#9E9E9E",
          marginTop: 4,
        }}
      >
        <span>Bottom 10%</span>
        <span>Median</span>
        <span>Top 10%</span>
      </div>
    </div>
  );
}
