import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logAuditEntry } from '@/lib/audit-log';

// LLM call — don't let Vercel's short default timeout kill it mid-answer.
export const maxDuration = 60;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Conversational coach for a graded practice attempt: the learner asks why they
// got their score and how to push it higher, and can revise & resubmit. We feed
// the task, criteria, their attempt, and the score so the coaching is concrete.
export async function POST(request) {
  try {
    const { task, criteria, learnerResponse, score, strength, improvement, messages } = await request.json();
    const convo = (Array.isArray(messages) ? messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }))
      .slice(-10);
    if (!convo.length) return NextResponse.json({ reply: 'Ask me anything about your score or how to improve it.' });

    const system = `You are a kind, concrete writing coach on a workplace AI-learning platform. A learner just practiced this task and you're helping them understand their score and improve.

THE TASK:
"${task || 'a hands-on practice exercise'}"

WHAT IT'S GRADED ON: ${criteria || 'clarity, completeness, and how well it does the task'}

THE LEARNER'S ATTEMPT:
"${learnerResponse || '(empty)'}"

THEIR SCORE: ${typeof score === 'number' ? score : '—'}/100
${strength ? `What worked: ${strength}` : ''}
${improvement ? `Biggest gap: ${improvement}` : ''}

RULES:
- Answer their questions directly and specifically — point to what in THEIR attempt cost points and exactly what to add or change to score higher.
- When useful, show a short before/after snippet so the fix is concrete.
- Be encouraging and brief (2-4 sentences unless they ask for more). This is practice, not a test.
- Never just restate the score. Give them something actionable to try, then invite them to revise and resubmit.`;

    const start = Date.now();
    let reply = '';
    try {
      const response = await getClient().messages.create({
        model: MODELS.haiku,
        max_tokens: 500,
        system,
        messages: convo,
      });
      reply = response.content[0]?.text?.trim() || '';
    } catch (error) {
      console.error('Grade-chat API error:', error);
      reply = "I had trouble answering just now — try asking again, or tweak your response and resubmit to see a fresh score.";
    }

    logAuditEntry({
      type: 'grade_chat',
      endpoint: '/api/lesson/grade-chat',
      user: { email: 'unknown', name: 'Unknown' },
      model: MODELS.haiku,
      input: { task, score, lastQuestion: convo[convo.length - 1]?.content },
      output: { reply },
      durationMs: Date.now() - start,
    }).catch(() => {});

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('POST /api/lesson/grade-chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
