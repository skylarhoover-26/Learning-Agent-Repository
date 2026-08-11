// Grading for "write" activities — the ones where the learner produces something
// real (a prompt, a draft, a message) and it gets marked.
//
// This used to live inside app/api/lesson/grade/route.js, which meant only a
// browser could reach it. A "write" activity answered in Slack has to be graded
// the same way, against the same criteria, on the same scale, or the two surfaces
// disagree about whether the same answer passes. So the grader moved here and the
// route now calls it too.
//
// Never throws: an AI failure falls back to the heuristic below, because a learner
// who did the work should always get a score and some feedback.

import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from './models';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Structure-and-effort heuristic, used when the model call fails. Deliberately
// caps below a strong pass so a fallback grade can't look like a rave review.
export function cannedGrade(input) {
  const lower = input.toLowerCase();
  const wordCount = input.split(/\s+/).length;
  const hasStructure = wordCount > 20;
  const hasTone = /thank|please|appreciate|glad|happy|hope/.test(lower);

  let score = 45;
  if (wordCount > 12) score += 8;
  if (wordCount > 25) score += 8;
  if (hasStructure) score += 8;
  if (hasTone) score += 8;
  if (/[.!?]$/.test(input.trim())) score += 5;
  score = Math.min(score, 88);

  return {
    score,
    strength: hasTone
      ? 'Good tone — you kept it friendly and approachable.'
      : 'You captured the key information clearly.',
    improvement: hasStructure
      ? 'Try tightening the language — shorter sentences land harder.'
      : 'Add more detail or structure to make your response complete.',
  };
}

// Returns { score, strength, improvement, gradeSource, durationMs }.
// `gradeSource` is 'ai' | 'fallback' | 'too_short' so callers can log which path ran.
export async function gradeWriting({ message, sourceText, gradingCriteria }) {
  const trimmed = String(message || '').trim();
  const start = Date.now();

  if (trimmed.length < 12) {
    return {
      score: 12,
      strength: "You started — that's the hardest part.",
      improvement: 'Write a more complete response — at least a few sentences.',
      gradeSource: 'too_short',
      durationMs: Date.now() - start,
    };
  }

  const source = sourceText || 'a workplace scenario';
  const criteria = gradingCriteria || 'clarity, completeness, tone, and professionalism';

  try {
    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 400,
      system: `You grade a learner's attempt at a hands-on practice exercise on a workplace AI learning platform. Be fair and encouraging — this is practice, not a high-stakes test.

THE TASK THE LEARNER WAS GIVEN (grade against THIS):
"${source}"

GRADE ONLY ON: ${criteria}

RULES:
- Judge only whether the response reasonably does what THE TASK asked. Do NOT penalize for anything the task did not explicitly require.
- If the task invited the learner to use their own example or scenario, ACCEPT their own content — never expect quotes from a specific document or any material they were not given.
- Give partial credit for a genuine, on-task attempt. A solid attempt should land around or above the pass mark. Reserve low scores (under 40) for responses that are off-topic, empty, or clearly ignore the task.
- Keep feedback specific, kind, and actionable.

Return ONLY JSON: {"score": int 0-100, "strength": "one sentence praise", "improvement": "one sentence specific, encouraging suggestion"}.`,
      messages: [
        {
          role: 'user',
          content: `The learner's response:\n"${trimmed}"\n\nGrade it against the task and criteria above.`,
        },
      ],
    });

    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        strength: parsed.strength,
        improvement: parsed.improvement,
        gradeSource: 'ai',
        durationMs: Date.now() - start,
      };
    }
  } catch (error) {
    console.error('gradeWriting failed, using fallback:', error?.message || error);
  }

  return { ...cannedGrade(trimmed), gradeSource: 'fallback', durationMs: Date.now() - start };
}
