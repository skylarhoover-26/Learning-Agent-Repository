import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logAuditEntry } from '@/lib/audit-log';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const FALLBACK_TONES = [
  {
    tone: 'warm',
    message: 'Here is a warm, empathetic version of the response that leads with understanding and ends with a clear next step.',
    whyItWorks: 'Names the person, acknowledges the situation, and closes with care.',
  },
  {
    tone: 'concise',
    message: 'Here is a direct, efficient version that covers all the key points in the fewest words possible.',
    whyItWorks: 'Every sentence carries information. Best when the reader wants the bottom line.',
  },
  {
    tone: 'playful',
    message: 'Here is a lighter version that uses approachable language and subtle personality to deliver the same information.',
    whyItWorks: 'Light tone makes the same content feel less clinical and more human.',
  },
];

export async function POST(request) {
  try {
    const { sourceText, toneContext } = await request.json();
    const source = sourceText || 'a workplace scenario';
    const context = toneContext || 'a professional workplace communication';

    const start = Date.now();
    let tonesResult;
    let tonesSource = 'fallback';

    try {
      const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: `You write 3 alternative versions of a workplace communication, each in a different tone.
Context: ${context}.
Tones: warm (caring, neighborly), concise (direct, efficient), playful (light, friendly personality).
Each version: well-structured, professional, plain English. Match the length and format appropriate to the task.
Return ONLY JSON array: [{"tone":"warm","message":"...","whyItWorks":"one sentence"}, {"tone":"concise","message":"...","whyItWorks":"one sentence"}, {"tone":"playful","message":"...","whyItWorks":"one sentence"}].`,
        messages: [
          {
            role: 'user',
            content: `Source material:\n"${source}"\n\nWrite 3 tone variants for this ${context}.`,
          },
        ],
      });

      let text = response.content[0].text.trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length === 3) {
          tonesResult = parsed;
          tonesSource = 'ai';
        }
      }
    } catch (error) {
      console.error('Tones API error, using fallback:', error);
    }

    if (!tonesResult) tonesResult = FALLBACK_TONES;

    logAuditEntry({
      type: 'tones',
      endpoint: '/api/lesson/tones',
      user: { email: 'unknown', name: 'Unknown' },
      model: tonesSource === 'ai' ? 'claude-haiku-4-5-20251001' : 'fallback',
      input: { sourceText: source, toneContext: context },
      output: { tones: tonesResult.map((t) => t.tone), source: tonesSource },
      durationMs: Date.now() - start,
    }).catch(() => {});

    return NextResponse.json({ tones: tonesResult });
  } catch (error) {
    console.error('POST /api/lesson/tones error:', error);
    return NextResponse.json({ tones: FALLBACK_TONES });
  }
}

export async function GET() {
  return NextResponse.json({ tones: FALLBACK_TONES });
}
