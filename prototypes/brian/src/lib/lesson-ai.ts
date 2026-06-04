// Lesson AI helpers. Uses real Claude when ANTHROPIC_API_KEY is set;
// otherwise returns realistic canned responses so the demo runs anywhere.

import Anthropic from "@anthropic-ai/sdk";

export type Grade = {
  score: number;
  strength: string;
  improvement: string;
};

export type ToneVariant = {
  tone: "warm" | "concise" | "playful";
  message: string;
  whyItWorks: string;
};

const TECH_NOTE =
  "cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit";

function hasKey() {
  return !!process.env.ANTHROPIC_API_KEY;
}

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function gradeMessage(input: string): Promise<Grade> {
  const trimmed = input.trim();
  if (trimmed.length < 12) {
    return {
      score: 12,
      strength: "You started — that's the hardest part.",
      improvement:
        "Try a full 2-sentence message: what you found, what you did, and one next step.",
    };
  }

  if (!hasKey()) {
    return cannedGrade(trimmed);
  }

  try {
    const msg = await client().messages.create({
      model: "claude-opus-4-7",
      max_tokens: 400,
      system: `You grade short customer messages written by Housecall Pro technicians.
You receive a messy technician note and the technician's customer-facing rewrite.
Score 0-100 based on: clarity, friendliness, includes what was found + what was done + next step, no jargon.
Return ONLY JSON: {"score": int, "strength": "one sentence praise", "improvement": "one sentence specific suggestion"}.`,
      messages: [
        {
          role: "user",
          content: `Technician note:\n"${TECH_NOTE}"\n\nTechnician's customer rewrite:\n"${trimmed}"\n\nGrade it.`,
        },
      ],
    });
    const text = msg.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        strength: parsed.strength,
        improvement: parsed.improvement,
      };
    }
  } catch (e) {
    console.error("[lesson-ai] grade failed, falling back:", e);
  }
  return cannedGrade(trimmed);
}

function cannedGrade(input: string): Grade {
  const lower = input.toLowerCase();
  const wordCount = input.split(/\s+/).length;
  const mentionsRefrigerant = /refrig|refrigerant|410a|coolant/.test(lower);
  const mentionsClean = /clean|coil|maintenance|service/.test(lower);
  const greets = /hi|hello|hey|good (morning|afternoon)|thanks/.test(lower);
  const tooTechnical = /\b410a\b|\brefrigerant\b/.test(lower);

  let score = 40;
  if (wordCount > 12) score += 10;
  if (wordCount > 25) score += 10;
  if (greets) score += 8;
  if (mentionsRefrigerant) score += 6;
  if (mentionsClean) score += 12;
  if (!tooTechnical) score += 10;
  if (/\?|!/.test(input)) score += 4;
  score = Math.min(score, 92);

  return {
    score,
    strength: greets
      ? "Friendly opener — that sets the tone before the technical detail."
      : "You captured what was done and the next step. That's what customers care about.",
    improvement: tooTechnical
      ? "Swap '410a' for plain words — 'topped off the AC' lands better than the chemical name."
      : "Add one sentence about what to expect next (when to schedule the coil clean, what it costs).",
  };
}

export async function generateTones(): Promise<ToneVariant[]> {
  if (!hasKey()) return cannedTones();

  try {
    const msg = await client().messages.create({
      model: "claude-opus-4-7",
      max_tokens: 800,
      system: `You rewrite messy Housecall Pro technician notes into 3 short customer messages, each in a different tone.
Tones: warm (caring, neighborly), concise (direct, efficient), playful (light, friendly humor).
Each message: 2-3 short sentences. Plain English, no chemical names like "410a" — say "topped off the AC".
Return ONLY JSON array: [{"tone":"warm","message":"...","whyItWorks":"one sentence"}, ...].`,
      messages: [
        {
          role: "user",
          content: `Technician note:\n"${TECH_NOTE}"\n\nWrite 3 tone variants for the customer (Mrs. Henderson).`,
        },
      ],
    });
    const text = msg.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as ToneVariant[];
      if (Array.isArray(parsed) && parsed.length === 3) return parsed;
    }
  } catch (e) {
    console.error("[lesson-ai] tones failed, falling back:", e);
  }
  return cannedTones();
}

function cannedTones(): ToneVariant[] {
  return [
    {
      tone: "warm",
      message:
        "Hi Mrs. Henderson — your AC was running low on coolant, so I topped it off and it's blowing cold again. To keep it that way through summer, I'd recommend a coil cleaning on the next visit. Stay cool out there!",
      whyItWorks:
        "Names her, explains the fix in plain words, ends with a small kindness.",
    },
    {
      tone: "concise",
      message:
        "AC is fixed — was low on coolant, topped it off. Recommend a coil cleaning at your next visit to prevent it from happening again. Let me know when works.",
      whyItWorks:
        "Three short sentences, every one carries info. Best for repeat customers who want the bottom line.",
    },
    {
      tone: "playful",
      message:
        "Good news, Mrs. Henderson — your AC was running on empty, so I gave it a refill and it's back to chilling. One small follow-up: a coil cleaning next visit will keep it humming. Onward to a cool summer!",
      whyItWorks:
        "Light metaphor ('running on empty', 'chilling') makes the same info feel less clinical.",
    },
  ];
}
