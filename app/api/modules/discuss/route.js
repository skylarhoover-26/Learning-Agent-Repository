import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import Anthropic from '@anthropic-ai/sdk';
import { logAuditEntry } from '@/lib/audit-log';

const MODEL = MODELS.sonnet;

function buildDiscussionPrompt(quizContext, profile) {
  const { question, options, correct, userAnswer, explanation } = quizContext;
  const correctOption = options[correct];
  const userOption = options[userAnswer];

  return [
    'You are a concise AI tutor helping a learner understand a quiz question they just answered.',
    '',
    `Quiz question: ${question}`,
    `Options: ${options.map((o, i) => `${i + 1}. ${o}`).join('; ')}`,
    `Correct answer: ${correctOption}`,
    `Learner chose: ${userOption}`,
    `Explanation: ${explanation}`,
    '',
    'Rules:',
    '- Keep responses to 3-5 sentences max.',
    '- Be direct and helpful.',
    '- If they ask why their answer was wrong, explain specifically what makes it incorrect.',
    '- If they ask for examples, give one concrete example from a workplace setting.',
    '- Use **bold** for emphasis.',
    '- Never repeat the full explanation — they already see it. Add new insight.',
    profile?.department ? `- They work in ${profile.department}.` : '',
    profile?.tier === 'developer'
      ? '- They are a developer, so technical references are fine.'
      : '- Keep language non-technical.',
  ].filter(Boolean).join('\n');
}

export async function POST(request) {
  try {
    const { quizContext, messages } = await request.json();

    if (!quizContext || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const profile = await getAuthenticatedProfile();
    const systemPrompt = buildDiscussionPrompt(quizContext, profile);

    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].text;

    const userMessage = messages?.[messages.length - 1]?.content || '';
    logAuditEntry({
      type: 'discuss',
      endpoint: '/api/modules/discuss',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODEL,
      input: { question: quizContext?.question, userMessage, messageCount: messages.length },
      output: { reply },
      durationMs: 0,
    }).catch(() => {});

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('POST /api/modules/discuss error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 },
    );
  }
}
