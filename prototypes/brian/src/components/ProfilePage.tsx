"use client";

import {
  ArrowLeft,
  Award,
  ChevronRight,
  Flame,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HcpAppBar } from "./Shared";
import { PersonalLeaderboard } from "./PersonalLeaderboard";
import { ProfileRadar } from "./ProfileRadar";
import { CalibrationChart } from "./CalibrationChart";
import {
  clearProfile,
  loadProfile,
  Profile,
  recommendNextLesson,
  ROLE_LABEL,
  SKILL_LABEL,
  SkillKey,
} from "@/lib/profile";

const ACCENT = "#0E6FBE";

export function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
        <HcpAppBar activeTab="learn" accent={ACCENT} density="cozy" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
        <HcpAppBar activeTab="learn" accent={ACCENT} density="cozy" />
        <div
          style={{
            maxWidth: 520,
            margin: "80px auto",
            padding: 32,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 12px" }}>
            Take the placement first.
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#616161",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            Your profile shows up after you complete the 5-minute placement
            assessment.
          </p>
          <Link
            href="/onboarding"
            className="hcp-btn hcp-btn--contained hcp-btn--lg"
          >
            <Sparkles size={14} /> <span>Take placement</span>
          </Link>
        </div>
      </div>
    );
  }

  const dims = (Object.keys(SKILL_LABEL) as SkillKey[]).map((k) => ({
    k,
    v: profile.skills[k],
  }));
  const sorted = [...dims].sort((a, b) => b.v - a.v);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const recommendation = recommendNextLesson(profile);
  const completedDate = new Date(profile.completedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  const retake = () => {
    if (
      window.confirm(
        "Retake the placement assessment? Your current profile will be replaced.",
      )
    ) {
      clearProfile();
      router.push("/onboarding");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
      <HcpAppBar activeTab="learn" accent={ACCENT} density="cozy" />

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 24px 64px",
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
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Back to Academy
        </Link>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                color: ACCENT,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={12} /> Your AI profile
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 600,
                margin: "0 0 4px",
                lineHeight: 1.2,
              }}
            >
              Mara — {ROLE_LABEL[profile.role]}
              {profile.isManager ? " · Manager" : ""}
            </h1>
            <div style={{ fontSize: 13, color: "#616161" }}>
              Last assessed {completedDate} · using {profile.tools.filter((t) => t !== "none").length || "no"} AI tool{profile.tools.filter((t) => t !== "none").length === 1 ? "" : "s"}{profile.tools.filter((t) => t !== "none").length ? ` (${profile.tools.filter((t) => t !== "none").join(", ")})` : ""} · {profile.frequency}
            </div>
          </div>
          <button
            onClick={retake}
            className="hcp-btn hcp-btn--outlined"
          >
            <RotateCcw size={14} /> <span>Retake assessment</span>
          </button>
        </div>

        {/* Top stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            color="#00A344"
            bg="#DCF9D7"
            label="Strongest"
            value={SKILL_LABEL[top.k]}
            sub={`${Math.round(top.v * 100)}/100`}
            icon={<Award size={16} />}
          />
          <StatCard
            color="#8C5400"
            bg="#FFF1C6"
            label="Biggest gap"
            value={SKILL_LABEL[bottom.k]}
            sub={`${Math.round(bottom.v * 100)}/100`}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            color="#0E6FBE"
            bg="#E3F2FD"
            label="XP earned"
            value="3,940"
            sub="+50 this week"
            icon={<Zap size={16} />}
          />
        </div>

        {/* Radar + skill breakdown */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="eyebrow"
              style={{ color: "#616161", marginBottom: 4 }}
            >
              Skill profile
            </span>
            <ProfileRadar skills={profile.skills} size={260} />
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
              padding: 20,
            }}
          >
            <span className="eyebrow" style={{ color: "#616161" }}>
              Detailed mastery
            </span>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              Where you are across the 6 dimensions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sorted.map((d) => {
                const v = d.v;
                const pct = Math.round(v * 100);
                const color =
                  v >= 0.7 ? "#00A344" : v >= 0.4 ? ACCENT : "#BF8600";
                return (
                  <div key={d.k}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {SKILL_LABEL[d.k]}
                      </span>
                      <span style={{ color, fontWeight: 700 }}>{pct}/100</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "#F5F5F5",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                          borderRadius: 4,
                          transition: "width 1s cubic-bezier(.2,.8,.2,1)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calibration — self vs measured. Only shown if learner did the
            self-rating step (older profiles may not have it). */}
        {profile.selfRating && (
          <div style={{ marginBottom: 16 }}>
            <CalibrationChart
              selfRating={profile.selfRating}
              measured={profile.skills}
            />
          </div>
        )}

        {/* Personal leaderboard */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <span className="eyebrow" style={{ color: "#623CC9" }}>
              Where you stack up
            </span>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              Personal rank — across your team and the whole org
            </div>
            <div style={{ fontSize: 12, color: "#616161", marginTop: 2 }}>
              Updated daily. Based on AI mastery score, not just XP.
            </div>
          </div>
          <PersonalLeaderboard profile={profile} />
        </div>

        {/* Recommended next */}
        <Link
          href={`/lesson/${recommendation.slug}`}
          style={{
            display: "block",
            background:
              "linear-gradient(110deg, #2FA7CD 4%, #5655CE 35%, #7A09BE 100%)",
            color: "#fff",
            borderRadius: 12,
            padding: 20,
            textDecoration: "none",
            boxShadow: "0 6px 18px rgba(98,60,201,.25)",
          }}
        >
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
              marginBottom: 8,
            }}
          >
            <Sparkles size={12} /> Recommended next
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {recommendation.title}
            <ChevronRight size={20} />
          </div>
          <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.5 }}>
            {recommendation.reasonHeadline} {recommendation.reasonBody}
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  color,
  bg,
  label,
  value,
  sub,
  icon,
}: {
  color: string;
  bg: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          background: bg,
          color,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".08em",
            color,
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#212121" }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "#616161" }}>{sub}</div>
      </div>
    </div>
  );
}

// Streak chip — included so the import set stays clean if surfaced later.
void Flame;
