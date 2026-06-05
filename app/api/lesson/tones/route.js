import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const TECH_NOTE =
  "cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit";

const CANNED_TONES = [
  {
    tone: 'warm',
    message: "Hi Mrs. Henderson — your AC was running low on coolant, so I topped it off and it's blowing cold again. To keep it that way through summer, I'd recommend a coil cleaning on the next visit. Stay cool out there!",
    whyItWorks: 'Names her, explains the fix in plain words, ends with a small kindness.',
  },
  {
    tone: 'concise',
    message: "AC is fixed — was low on coolant, topped it off. Recommend a coil cleaning at your next visit to prevent it from happening again. Let me know when works.",
    whyItWorks: 'Three short sentences, every one carries info. Best for repeat customers who want the bottom line.',
  },
  {
    tone: 'playful',
    message: "Good news, Mrs. Henderson — your AC was running on empty, so I gave it a refill and it's back to chilling. One small follow-up: a coil cleaning next visit will keep it humming. Onward to a cool summer!",
    whyItWorks: "Light metaphor ('running on empty', 'chilling') makes the same info feel less clinical.",
  },
];

export async function GET() {
  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You rewrite messy Housecall Pro technician notes into 3 short customer messages, each in a different tone.
Tones: warm (caring, neighborly), concise (direct, efficient), playful (light, friendly humor).
Each message: 2-3 short sentences. Plain English, no chemical names like "410a" — say "topped off the AC".
Return ONLY JSON array: [{"tone":"warm","message":"...","whyItWorks":"one sentence"}, ...].`,
      messages: [
        {
          role: 'user',
          content: `Technician note:\n"${TECH_NOTE}"\n\nWrite 3 tone variants for the customer (Mrs. Henderson).`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return NextResponse.json({ tones: parsed });
      }
    }
  } catch (error) {
    console.error('Tones API error, using fallback:', error);
  }

  return NextResponse.json({ tones: CANNED_TONES });
}
