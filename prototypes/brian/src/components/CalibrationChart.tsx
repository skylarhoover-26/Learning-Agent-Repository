"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { SKILL_LABEL, SkillKey } from "@/lib/profile";

const ACCENT = "#0E6FBE";
const ACCENT_PURPLE = "#623CC9";

type Props = {
  selfRating: Record<SkillKey, number>;
  measured: Record<SkillKey, number>;
  // Sort by gap magnitude so the biggest miscalibration shows first.
  sortByGap?: boolean;
};

const DELTA_THRESHOLD = 0.12; // 12 points or more is a "real" gap

export function CalibrationChart({
  selfRating,
  measured,
  sortByGap = true,
}: Props) {
  const dims = (Object.keys(SKILL_LABEL) as SkillKey[])
    .map((k) => ({
      k,
      self: selfRating[k] ?? 0.5,
      meas: measured[k] ?? 0,
      delta: (selfRating[k] ?? 0.5) - (measured[k] ?? 0),
    }))
    .sort((a, b) =>
      sortByGap ? Math.abs(b.delta) - Math.abs(a.delta) : 0,
    );

  const gaps = dims.filter((d) => Math.abs(d.delta) >= DELTA_THRESHOLD);
  const avgAbs =
    dims.reduce((s, d) => s + Math.abs(d.delta), 0) / dims.length;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E0E0E0",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            className="eyebrow"
            style={{
              color: ACCENT_PURPLE,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Calibration · what you said vs. what we measured
          </span>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
            {gaps.length === 0 ? (
              <>You called it. Self-rating matches the measurement.</>
            ) : (
              <>
                {gaps.length} {gaps.length === 1 ? "dimension" : "dimensions"}{" "}
                miscalibrated by 12+ points.
              </>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#616161",
            background: "#F5F5F5",
            padding: "4px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          Avg delta: {Math.round(avgAbs * 100)} pts
        </span>
      </div>

      <Legend />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginTop: 16,
        }}
      >
        {dims.map((d) => (
          <Row key={d.k} label={SKILL_LABEL[d.k]} self={d.self} meas={d.meas} />
        ))}
      </div>

      {gaps.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#FFF1C6",
            borderRadius: 8,
            fontSize: 12,
            color: "#8C5400",
            lineHeight: 1.55,
          }}
        >
          <strong>Why this matters.</strong> Most learners are off by 20+
          points on at least one dimension — usually the one they thought they
          were strongest in. The gap is the most useful number on this page:
          it tells us where your blind spot is, and it&apos;s where your first
          lesson should land.
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        fontSize: 11,
        color: "#616161",
        marginTop: 4,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 10,
            height: 10,
            background: ACCENT_PURPLE,
            borderRadius: 2,
            border: `1px dashed ${ACCENT_PURPLE}`,
          }}
        />
        You said
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 10,
            height: 10,
            background: ACCENT,
            borderRadius: 2,
          }}
        />
        Measured
      </span>
    </div>
  );
}

function Row({
  label,
  self,
  meas,
}: {
  label: string;
  self: number;
  meas: number;
}) {
  const selfPct = Math.round(self * 100);
  const measPct = Math.round(meas * 100);
  const delta = selfPct - measPct;
  const isGap = Math.abs(delta) >= 12;
  const overrated = delta > 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>
          {label}
        </span>
        <DeltaTag delta={delta} isGap={isGap} overrated={overrated} />
      </div>

      <div
        style={{
          position: "relative",
          background: "#F5F5F5",
          borderRadius: 4,
          height: 22,
          overflow: "hidden",
        }}
      >
        {/* Self-rating bar — sits behind, dashed */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${selfPct}%`,
            background: `repeating-linear-gradient(45deg, ${ACCENT_PURPLE}33 0px, ${ACCENT_PURPLE}33 6px, ${ACCENT_PURPLE}55 6px, ${ACCENT_PURPLE}55 12px)`,
            borderRight: `2px dashed ${ACCENT_PURPLE}`,
            transition: "width 1s cubic-bezier(.2,.8,.2,1)",
          }}
        />
        {/* Measured bar — solid, on top */}
        <div
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 0,
            width: `${measPct}%`,
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}DD)`,
            borderRadius: 3,
            transition: "width 1.2s cubic-bezier(.2,.8,.2,1)",
            boxShadow: "0 1px 3px rgba(14,111,190,.3)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#616161",
          marginTop: 4,
        }}
      >
        <span>
          You said:{" "}
          <strong style={{ color: ACCENT_PURPLE }}>{selfPct}</strong>
        </span>
        <span>
          Measured:{" "}
          <strong style={{ color: ACCENT }}>{measPct}</strong>
        </span>
      </div>
    </div>
  );
}

function DeltaTag({
  delta,
  isGap,
  overrated,
}: {
  delta: number;
  isGap: boolean;
  overrated: boolean;
}) {
  if (!isGap) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#00662B",
          background: "#DCF9D7",
          padding: "2px 8px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        <Minus size={11} /> calibrated
      </span>
    );
  }
  const fmt = `${Math.abs(delta)} pts`;
  if (overrated) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#8C5400",
          background: "#FFF1C6",
          padding: "2px 8px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        <ArrowUp size={11} /> overrated by {fmt}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#0D47A1",
        background: "#DEF0FF",
        padding: "2px 8px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <ArrowDown size={11} /> underrated by {fmt}
    </span>
  );
}
