import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from './models';
import { PRIORITY_LEVELS, PRIORITY_DEFINITIONS } from './feedback-priority';

let client;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const BUG_VERDICTS = ['likely_bug', 'not_bug', 'unclear'];

const SYSTEM_PROMPT = [
  'You triage feedback submitted through an internal AI learning platform\'s in-app feedback form.',
  'The person picked a CATEGORY themselves (Bug, Confusing, Idea, Other) but categories do not determine urgency — read the actual text and judge real-world impact.',
  'Assign exactly one priority level from this list, using these definitions:',
  PRIORITY_LEVELS.map((level) => `- ${level}: ${PRIORITY_DEFINITIONS[level]}`).join('\n'),
  'Be conservative with Critical — it should be rare, reserved for people who are fully blocked.',
  'When the category is "Bug", ALSO decide whether it describes a genuine, reproducible product bug — as opposed to user error, a feature request in disguise, or a one-off environment issue (set bugVerdict to "likely_bug", "not_bug", or "unclear"). For any other category, set bugVerdict to null.',
  `Return ONLY JSON: {"priority": "<one of: ${PRIORITY_LEVELS.join(', ')}>", "reason": "<one sentence explaining the call>", "bugVerdict": "likely_bug" | "not_bug" | "unclear" | null}`,
  'No markdown fences, no extra text.',
].join('\n');

// Classify one non-Praise feedback submission with a cheap model: an urgency
// priority (independent of the user-picked category), plus — for Bug reports
// only — whether it actually describes a real, reproducible bug. Returns
// { priority, reason, bugVerdict } or null if classification fails (never
// blocks the submission itself; caller leaves priority unset on failure).
export async function classifyFeedback(record) {
  if (record.category === 'Praise') return null;
  try {
    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          `Category: ${record.category || '(none)'}`,
          `Report: ${record.text}`,
          record.page ? `Filed from page: ${record.page}` : null,
          record.screenshotUrls?.length ? `Includes ${record.screenshotUrls.length} screenshot(s).` : null,
        ].filter(Boolean).join('\n'),
      }],
    });
    const text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed || !PRIORITY_LEVELS.includes(parsed.priority)) return null;
    const bugVerdict = record.category === 'Bug' && BUG_VERDICTS.includes(parsed.bugVerdict) ? parsed.bugVerdict : null;
    return {
      priority: parsed.priority,
      reason: (parsed.reason || '').toString().slice(0, 500),
      bugVerdict,
    };
  } catch (error) {
    console.error('classifyFeedback error:', error);
    return null;
  }
}
