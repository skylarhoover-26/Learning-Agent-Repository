"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Lightbulb,
  Loader2,
  PartyPopper,
  Send,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatedNumber, HcpAppBar, Ring } from "./Shared";

type Grade = {
  score: number;
  strength: string;
  improvement: string;
};

type ToneVariant = {
  tone: "warm" | "concise" | "playful";
  message: string;
  whyItWorks: string;
};

const STEPS = ["Read", "Try", "Compare", "Ship", "Reflect"] as const;
type Step = (typeof STEPS)[number];

const ACCENT = "#0E6FBE";

const TECH_NOTE =
  "cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit";

const TONE_COLOR: Record<ToneVariant["tone"], string> = {
  warm: "#D81B60",
  concise: "#0E6FBE",
  playful: "#BF8600",
};

export function LessonPlayer() {
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submission, setSubmission] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [grading, setGrading] = useState(false);
  const [tones, setTones] = useState<ToneVariant[] | null>(null);
  const [loadingTones, setLoadingTones] = useState(false);
  const [shipChoice, setShipChoice] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");

  const goNext = () => {
    setDirection(1);
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const submitForGrade = async () => {
    if (!submission.trim()) return;
    setGrading(true);
    try {
      const r = await fetch("/api/lesson/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: submission }),
      });
      const data = (await r.json()) as Grade;
      setGrade(data);
    } finally {
      setGrading(false);
    }
  };

  // Pre-fetch tones when entering Compare so transition feels instant
  useEffect(() => {
    if (stepIdx >= 2 && !tones && !loadingTones) {
      setLoadingTones(true);
      fetch("/api/lesson/tones")
        .then((r) => r.json())
        .then((d) => setTones(d.tones))
        .finally(() => setLoadingTones(false));
    }
  }, [stepIdx, tones, loadingTones]);

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

      <Stepper stepIdx={stepIdx} />

      <div
        style={{
          flex: 1,
          maxWidth: 880,
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px 64px",
          position: "relative",
        }}
      >
        <StepFrame stepIdx={stepIdx} direction={direction}>
          {STEPS[stepIdx] === "Read" && <ReadStep onContinue={goNext} />}
          {STEPS[stepIdx] === "Try" && (
            <TryStep
              submission={submission}
              setSubmission={setSubmission}
              grade={grade}
              grading={grading}
              onSubmit={submitForGrade}
              onContinue={goNext}
              onBack={goBack}
            />
          )}
          {STEPS[stepIdx] === "Compare" && (
            <CompareStep
              userMessage={submission}
              tones={tones}
              loading={loadingTones}
              onContinue={goNext}
              onBack={goBack}
            />
          )}
          {STEPS[stepIdx] === "Ship" && (
            <ShipStep
              tones={tones ?? []}
              choice={shipChoice}
              setChoice={setShipChoice}
              onContinue={goNext}
              onBack={goBack}
            />
          )}
          {STEPS[stepIdx] === "Reflect" && (
            <ReflectStep
              reflection={reflection}
              setReflection={setReflection}
            />
          )}
        </StepFrame>
      </div>
    </div>
  );
}

// --- Stepper ---------------------------------------------------------------

function Stepper({ stepIdx }: { stepIdx: number }) {
  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #E0E0E0",
        padding: "16px 24px",
        position: "sticky",
        top: 56,
        zIndex: 9,
      }}
    >
      <div
        style={{
          maxWidth: 880,
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
          <ArrowLeft size={14} /> Academy
        </Link>
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          {STEPS.map((label, i) => {
            const done = i < stepIdx;
            const current = i === stepIdx;
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: done
                      ? "#00A344"
                      : current
                        ? ACCENT
                        : "#E0E0E0",
                    transformOrigin: "left",
                    transform: current ? "scaleX(1)" : "scaleX(1)",
                    transition: "background-color .35s ease",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: current ? 700 : 500,
                    color: current
                      ? ACCENT
                      : done
                        ? "#00A344"
                        : "#9E9E9E",
                    letterSpacing: ".04em",
                  }}
                >
                  {i + 1}. {label}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: "#623CC9",
            background: "#EFECFA",
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          <Sparkles size={12} /> 5 min · adaptive
        </div>
      </div>
    </div>
  );
}

// --- Step transition wrapper ----------------------------------------------

function StepFrame({
  stepIdx,
  direction,
  children,
}: {
  stepIdx: number;
  direction: 1 | -1;
  children: React.ReactNode;
}) {
  return (
    <div
      key={stepIdx}
      style={{
        animation: `stepIn${direction === 1 ? "Right" : "Left"} .4s cubic-bezier(.2,.8,.2,1)`,
      }}
    >
      <style>{`
        @keyframes stepInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes stepInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {children}
    </div>
  );
}

// --- 1. Read --------------------------------------------------------------

function ReadStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          padding: "40px 40px 32px",
          background:
            "linear-gradient(135deg, #0E6FBE 0%, #0D47A1 60%, #5655CE 100%)",
          color: "#fff",
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
          <Sparkles size={14} /> Today&apos;s lesson · 5 min
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
            maxWidth: 640,
          }}
        >
          Tone is the difference between &quot;cold&quot; and &quot;cared
          for.&quot;
        </h1>
      </div>

      <div style={{ padding: "32px 40px" }}>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: "#212121",
            marginBottom: 20,
          }}
        >
          Customers don&apos;t remember the technical fix. They remember{" "}
          <strong>how the message felt to read.</strong> Same facts, different
          tone, completely different impression — &quot;they cared&quot; vs.
          &quot;they got the job done.&quot;
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: 16,
              background: "#FFDDE9",
              borderRadius: 8,
              border: "1px solid #F8BBD0",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#880E4F",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Cold
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#212121" }}>
              &quot;Refrigerant low. Added 2lb R-410A. Recommend coil clean.&quot;
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#DCF9D7",
              borderRadius: 8,
              border: "1px solid #A5D6A7",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#00662B",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Cared for
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#212121" }}>
              &quot;Hi Mrs. Henderson — your AC was low on coolant, so I topped
              it off and it&apos;s cooling again. A coil cleaning next visit
              will keep it that way.&quot;
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#EFECFA",
            border: "1px solid #D5C9F0",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <Lightbulb
            size={20}
            color="#623CC9"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "#4E30A1" }}>
            <strong>The shift:</strong> Plain words instead of jargon. Name them.
            Say what to expect next. Same info — three small moves.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onContinue}
            className="hcp-btn hcp-btn--contained hcp-btn--lg"
          >
            <span>Got it — let&apos;s try</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 2. Try ---------------------------------------------------------------

function TryStep({
  submission,
  setSubmission,
  grade,
  grading,
  onSubmit,
  onContinue,
  onBack,
}: {
  submission: string;
  setSubmission: (s: string) => void;
  grade: Grade | null;
  grading: boolean;
  onSubmit: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        padding: "32px 40px",
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
          color: ACCENT,
          marginBottom: 8,
        }}
      >
        Your turn
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        Rewrite this for Mrs. Henderson.
      </h2>
      <p style={{ fontSize: 14, color: "#616161", marginBottom: 20 }}>
        Two short sentences. What you found, what you did, what&apos;s next.
        Plain words, no chemicals.
      </p>

      <div
        style={{
          background: "#FAFAFA",
          border: "1px dashed #E0E0E0",
          borderRadius: 8,
          padding: 16,
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 13,
          color: "#616161",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "#9E9E9E",
            marginBottom: 6,
          }}
        >
          TECHNICIAN NOTE
        </div>
        &quot;{TECH_NOTE}&quot;
      </div>

      <textarea
        value={submission}
        onChange={(e) => setSubmission(e.target.value)}
        disabled={!!grade}
        placeholder="Hi Mrs. Henderson — ..."
        style={{
          width: "100%",
          minHeight: 120,
          padding: 14,
          fontSize: 15,
          fontFamily: "inherit",
          border: `1px solid ${grade ? "#E0E0E0" : "#BDBDBD"}`,
          borderRadius: 8,
          outline: "none",
          resize: "vertical",
          background: grade ? "#FAFAFA" : "#fff",
          color: "#212121",
          lineHeight: 1.5,
          marginBottom: 12,
          transition: "border-color .15s ease",
        }}
        onFocus={(e) => {
          if (!grade) e.currentTarget.style.borderColor = ACCENT;
        }}
        onBlur={(e) => {
          if (!grade) e.currentTarget.style.borderColor = "#BDBDBD";
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, fontSize: 12, color: "#9E9E9E" }}>
          {submission.trim().split(/\s+/).filter(Boolean).length} words
        </div>
        {!grade && (
          <button
            onClick={onSubmit}
            disabled={grading || submission.trim().length < 8}
            className="hcp-btn hcp-btn--contained"
            style={{
              opacity: grading || submission.trim().length < 8 ? 0.5 : 1,
              cursor:
                grading || submission.trim().length < 8
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {grading ? (
              <>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span>Grading…</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Submit for AI feedback</span>
              </>
            )}
          </button>
        )}
      </div>

      {grade && <GradeReveal grade={grade} />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 24,
        }}
      >
        <button onClick={onBack} className="hcp-btn hcp-btn--text">
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <button
          onClick={onContinue}
          disabled={!grade}
          className="hcp-btn hcp-btn--contained hcp-btn--lg"
          style={{ opacity: grade ? 1 : 0.4, cursor: grade ? "pointer" : "not-allowed" }}
        >
          <span>See AI alternatives</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function GradeReveal({ grade }: { grade: Grade }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 50);
    return () => clearTimeout(t);
  }, []);

  const ringColor =
    grade.score >= 75 ? "#00A344" : grade.score >= 50 ? ACCENT : "#BF8600";

  return (
    <div
      style={{
        ...({
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(8px)",
          transition: "all .5s cubic-bezier(.2,.8,.2,1)",
        } as CSSProperties),
        display: "flex",
        gap: 16,
        padding: 16,
        background: "linear-gradient(135deg, #fff, #F5F5F5)",
        border: "1px solid #E0E0E0",
        borderRadius: 12,
      }}
    >
      <Ring
        value={shown ? grade.score / 100 : 0}
        size={72}
        stroke={8}
        color={ringColor}
        track="#F5F5F5"
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
            <AnimatedNumber value={shown ? grade.score : 0} duration={1100} />
          </div>
          <div style={{ fontSize: 9, color: "#616161", letterSpacing: ".04em" }}>
            /100
          </div>
        </div>
      </Ring>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "#00662B",
            fontWeight: 600,
          }}
        >
          <Check size={14} /> {grade.strength}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            fontSize: 13,
            color: "#8C5400",
          }}
        >
          <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{grade.improvement}</div>
        </div>
      </div>
    </div>
  );
}

// --- 3. Compare -----------------------------------------------------------

function CompareStep({
  userMessage,
  tones,
  loading,
  onContinue,
  onBack,
}: {
  userMessage: string;
  tones: ToneVariant[] | null;
  loading: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        padding: "32px 40px",
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
          color: ACCENT,
          marginBottom: 8,
        }}
      >
        Three ways to say it
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        Same message, three tones.
      </h2>
      <p style={{ fontSize: 14, color: "#616161", marginBottom: 20 }}>
        Read each one out loud. Notice how the same facts land differently.
      </p>

      {userMessage.trim() && (
        <div
          style={{
            background: "#F5F5F5",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".08em",
              color: "#9E9E9E",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Yours
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "#212121" }}>
            {userMessage}
          </div>
        </div>
      )}

      {loading || !tones ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                padding: 16,
                background: "#FAFAFA",
                borderRadius: 8,
                border: "1px solid #E0E0E0",
                animation: `shimmer 1.6s ease-in-out infinite ${i * 0.15}s`,
                backgroundImage:
                  "linear-gradient(110deg, #f5f5f5 8%, #ececec 18%, #f5f5f5 33%)",
                backgroundSize: "200% 100%",
                height: 100,
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tones.map((t, i) => (
            <ToneCard key={t.tone} variant={t} delay={i * 90} />
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 24,
        }}
      >
        <button onClick={onBack} className="hcp-btn hcp-btn--text">
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <button
          onClick={onContinue}
          disabled={!tones}
          className="hcp-btn hcp-btn--contained hcp-btn--lg"
          style={{
            opacity: tones ? 1 : 0.4,
            cursor: tones ? "pointer" : "not-allowed",
          }}
        >
          <span>Pick the one to ship</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ToneCard({ variant, delay }: { variant: ToneVariant; delay: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const c = TONE_COLOR[variant.tone];
  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(8px)",
        transition: "all .45s cubic-bezier(.2,.8,.2,1)",
        padding: 16,
        background: "#fff",
        borderRadius: 8,
        border: `1px solid ${c}33`,
        borderLeft: `4px solid ${c}`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: `${c}15`,
          color: c,
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 10,
        }}
      >
        {variant.tone}
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          color: "#212121",
          marginBottom: 8,
        }}
      >
        {variant.message}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#616161",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        Why it works: {variant.whyItWorks}
      </div>
    </div>
  );
}

// --- 4. Ship -------------------------------------------------------------

function ShipStep({
  tones,
  choice,
  setChoice,
  onContinue,
  onBack,
}: {
  tones: ToneVariant[];
  choice: string | null;
  setChoice: (c: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        padding: "32px 40px",
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
          color: ACCENT,
          marginBottom: 8,
        }}
      >
        Ship it
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        Which one would you actually send to Mrs. Henderson?
      </h2>
      <p style={{ fontSize: 14, color: "#616161", marginBottom: 24 }}>
        Trust your gut. There&apos;s no wrong answer — but the one you pick says
        a lot about what you value in customer comms.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tones.map((t) => {
          const picked = choice === t.tone;
          const c = TONE_COLOR[t.tone];
          return (
            <button
              key={t.tone}
              onClick={() => setChoice(t.tone)}
              style={{
                textAlign: "left",
                padding: 16,
                background: picked ? `${c}10` : "#fff",
                border: `2px solid ${picked ? c : "#E0E0E0"}`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .2s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!picked) e.currentTarget.style.borderColor = "#BDBDBD";
              }}
              onMouseLeave={(e) => {
                if (!picked) e.currentTarget.style.borderColor = "#E0E0E0";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${picked ? c : "#BDBDBD"}`,
                    background: picked ? c : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {picked && <Check size={14} />}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: c,
                  }}
                >
                  {t.tone}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#212121",
                  paddingLeft: 32,
                }}
              >
                {t.message}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 24,
        }}
      >
        <button onClick={onBack} className="hcp-btn hcp-btn--text">
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <button
          onClick={onContinue}
          disabled={!choice}
          className="hcp-btn hcp-btn--contained hcp-btn--lg"
          style={{
            opacity: choice ? 1 : 0.4,
            cursor: choice ? "pointer" : "not-allowed",
          }}
        >
          <span>Ship &amp; reflect</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// --- 5. Reflect + Celebration --------------------------------------------

function ReflectStep({
  reflection,
  setReflection,
}: {
  reflection: string;
  setReflection: (s: string) => void;
}) {
  const [done, setDone] = useState(false);
  return (
    <div>
      {!done ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
            padding: "32px 40px",
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
              color: ACCENT,
              marginBottom: 8,
            }}
          >
            Last step
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: "0 0 8px",
              lineHeight: 1.3,
            }}
          >
            One situation this week where you&apos;d use a different tone?
          </h2>
          <p style={{ fontSize: 14, color: "#616161", marginBottom: 20 }}>
            One sentence is plenty. (Reflection beats repetition for retention —
            this is why we ask.)
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="e.g. End-of-quarter overdue invoice — would lean concise instead of warm so it doesn't feel passive."
            style={{
              width: "100%",
              minHeight: 100,
              padding: 14,
              fontSize: 15,
              fontFamily: "inherit",
              border: "1px solid #BDBDBD",
              borderRadius: 8,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
              marginBottom: 16,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#BDBDBD")}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              onClick={() => setDone(true)}
              className="hcp-btn hcp-btn--text"
            >
              <span>Skip</span>
            </button>
            <button
              onClick={() => setDone(true)}
              className="hcp-btn hcp-btn--contained hcp-btn--lg"
            >
              <span>Finish lesson</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <Celebration />
      )}
    </div>
  );
}

function Celebration() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, []);

  const confetti = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        rot: Math.random() * 360,
        color: ["#0E6FBE", "#00A344", "#BF8600", "#623CC9", "#D81B60"][i % 5],
        dur: 1.6 + Math.random() * 1.4,
      })),
    [],
  );

  return (
    <div
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 0 12px 2px rgba(0,0,0,.1)",
        padding: "48px 40px",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Confetti */}
      {confetti.map((c, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${c.left}%`,
            width: 8,
            height: 12,
            background: c.color,
            transform: `rotate(${c.rot}deg)`,
            borderRadius: 2,
            animation: `confetti-fall ${c.dur}s ease-in ${c.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(560px) rotate(720deg); opacity: 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: 96,
          height: 96,
          margin: "0 auto 16px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00A344, #00662B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          animation: "pop-in .55s cubic-bezier(.34,1.56,.64,1)",
          boxShadow: "0 12px 28px rgba(0,163,68,.3)",
        }}
      >
        <Trophy size={44} />
      </div>

      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          margin: "0 0 8px",
          lineHeight: 1.2,
        }}
      >
        Lesson shipped.
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "#616161",
          maxWidth: 480,
          margin: "0 auto 24px",
          lineHeight: 1.5,
        }}
      >
        That&apos;s 5 minutes you won&apos;t get back — but the next time a
        customer reads one of your messages, they&apos;ll feel it.
      </p>

      <div
        style={{
          display: "inline-flex",
          gap: 12,
          marginBottom: 28,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <RewardChip
          icon={<Zap size={16} />}
          label="XP earned"
          value={shown ? 50 : 0}
          color="#0E6FBE"
          bg="#E3F2FD"
          suffix=""
        />
        <RewardChip
          icon={<Flame size={16} />}
          label="Streak"
          value={shown ? 8 : 7}
          color="#8C5400"
          bg="#FFF1C6"
          suffix=" days"
        />
        <RewardChip
          icon={<PartyPopper size={16} />}
          label="Mastery"
          value={shown ? 65 : 62}
          color="#00662B"
          bg="#DCF9D7"
          suffix="% (+3)"
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <Link href="/" className="hcp-btn hcp-btn--outlined">
          <span>Back to Academy</span>
        </Link>
        <Link href="/lesson/customer-followups" className="hcp-btn hcp-btn--contained">
          <Sparkles size={14} />
          <span>Tomorrow&apos;s lesson</span>
        </Link>
      </div>
    </div>
  );
}

function RewardChip({
  icon,
  label,
  value,
  color,
  bg,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  suffix: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        background: bg,
        color,
        padding: "12px 20px",
        borderRadius: 12,
        gap: 4,
        minWidth: 120,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
        <AnimatedNumber value={value} duration={1200} />
        {suffix}
      </div>
    </div>
  );
}
