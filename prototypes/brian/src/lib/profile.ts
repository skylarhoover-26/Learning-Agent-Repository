// Learner profile — captured from the placement assessment, persisted
// in localStorage for the demo, and read by the home page to personalize
// the experience.
//
// In production this lives in Postgres (see prisma/schema.prisma).

export type Role =
  | "sales"
  | "cs"
  | "engineering"
  | "analytics"
  | "people"
  | "other";

export const ROLE_LABEL: Record<Role, string> = {
  sales: "Sales",
  cs: "Customer Success",
  engineering: "Engineering",
  analytics: "Analytics",
  people: "People",
  other: "Other",
};

// Six skill dimensions we measure. Mastery is 0..1.
export type SkillKey =
  | "prompting"
  | "comms"
  | "privacy"
  | "agents"
  | "eval"
  | "data";

export const SKILL_LABEL: Record<SkillKey, string> = {
  prompting: "Prompting",
  comms: "AI for customer comms",
  privacy: "Data privacy & PII",
  agents: "AI agents & tools",
  eval: "Eval & hallucinations",
  data: "Data with AI",
};

export type Profile = {
  role: Role;
  isManager: boolean;
  frequency: "daily" | "weekly" | "monthly" | "never";
  tools: string[]; // ["chatgpt","claude",...]
  tasks?: string[]; // tasks the learner uses AI for
  skills: Record<SkillKey, number>; // measured 0..1 from scenarios
  selfRating?: Record<SkillKey, number>; // learner's self-rating 0..1
  completedAt: string;
};

const KEY = "ai-academy-profile-v1";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

// Pick the lesson with the highest gap × role-impact score.
// For the demo we only have one lesson; the recommendation logic returns
// the *reason* shown to the learner so the personalization is visible.
export function recommendNextLesson(p: Profile): {
  slug: string;
  title: string;
  reasonHeadline: string;
  reasonBody: string;
  estMinutes: number;
} {
  const gaps = (Object.entries(p.skills) as [SkillKey, number][])
    .map(([k, v]) => ({
      key: k,
      mastery: v,
      gap: 1 - v,
      roleWeight: roleWeight(p.role, k),
    }))
    .map((x) => ({ ...x, score: x.gap * x.roleWeight }))
    .sort((a, b) => b.score - a.score);

  const top = gaps[0];
  const dim = SKILL_LABEL[top.key];
  const role = ROLE_LABEL[p.role];

  return {
    slug: "customer-followups",
    title: "Writing better customer follow-ups with AI",
    reasonHeadline: `Picked for you: closes a ${Math.round(top.gap * 100)}% gap in ${dim}.`,
    reasonBody: `${role} reps using AI in customer comms gain the most from this skill — it's where your role × your gap line up biggest.`,
    estMinutes: 5,
  };
}

// Higher number = bigger impact for that role (0..1).
// Hand-tuned for the demo; in prod this'd be calibrated from outcome data.
function roleWeight(role: Role, skill: SkillKey): number {
  const matrix: Record<Role, Record<SkillKey, number>> = {
    sales: {
      prompting: 0.85,
      comms: 1.0,
      privacy: 0.7,
      agents: 0.55,
      eval: 0.7,
      data: 0.5,
    },
    cs: {
      prompting: 0.9,
      comms: 1.0,
      privacy: 0.95,
      agents: 0.5,
      eval: 0.8,
      data: 0.45,
    },
    engineering: {
      prompting: 0.85,
      comms: 0.4,
      privacy: 0.85,
      agents: 1.0,
      eval: 0.95,
      data: 0.85,
    },
    analytics: {
      prompting: 0.9,
      comms: 0.45,
      privacy: 0.9,
      agents: 0.65,
      eval: 0.85,
      data: 1.0,
    },
    people: {
      prompting: 0.85,
      comms: 0.95,
      privacy: 1.0,
      agents: 0.45,
      eval: 0.7,
      data: 0.55,
    },
    other: {
      prompting: 0.8,
      comms: 0.7,
      privacy: 0.8,
      agents: 0.6,
      eval: 0.7,
      data: 0.6,
    },
  };
  return matrix[role][skill];
}

// Org percentile for a learner — fake numbers, but the formula gives
// stable output for the same profile. Anchored on the strongest skill.
export function orgPercentile(p: Profile): {
  skill: SkillKey;
  pct: number;
} {
  const top = (Object.entries(p.skills) as [SkillKey, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  // Map mastery 0..1 → percentile 30..96 with role-strength bias.
  const base = 30 + Math.round(top[1] * 60);
  const pct = Math.min(96, base + 6);
  return { skill: top[0], pct };
}
