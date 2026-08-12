import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { SKILL_LABELS, SKILL_DEFINITIONS, SKILL_KEYS } from '@/lib/competencies';
import { normalizeQuiz, MIN_ANSWERS, MAX_ANSWERS } from '@/lib/onboarding-quiz';

// Turn a pasted conversation into placement questions.
//
// Authoring a question by hand means typing a setup, a prompt, up to six answers,
// a "why", and a score weight per competency for every answer — well over a
// hundred inputs for a five-question set. In practice the questions get drafted
// in a chat somewhere and then re-keyed field by field. This route removes the
// re-keying: paste the conversation, get structured questions back.
//
// NOTHING is saved here. This returns a draft for the admin to review in the
// import preview; saving still goes through POST /api/onboarding-quiz, which
// re-normalizes everything anyway.
//
// Sonnet rather than Haiku: this is authoring judgment (which competency, which
// answer is genuinely best, how to weight partial credit), not bulk extraction,
// and it runs a handful of times per set.
export const maxDuration = 120;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const COMPETENCY_GUIDE = SKILL_KEYS
  .map((key) => `- ${key} (${SKILL_LABELS[key]}): ${SKILL_DEFINITIONS[key]}`)
  .join('\n');

const SYSTEM = [
  'You convert a rough draft — usually a chat transcript where someone worked out quiz questions with an AI — into structured placement-quiz questions for an internal AI-skills learning platform.',
  '',
  'Every new employee answers these once. They see the best answer and a short explanation immediately after each one, and the answers produce a graded competency score. So a question has to have one defensibly best answer.',
  '',
  'The competencies you may assign, and what each means:',
  COMPETENCY_GUIDE,
  '',
  'Return ONLY JSON, no prose and no code fences, shaped exactly:',
  '{"questions":[{"id":"kebab-case-slug","competency":"<one key from the list>","setup":"<the situation, or empty string>","prompt":"<the question itself>","answers":[{"text":"<option>","scores":{"<key>":<0..1>}}],"best":<index into answers>,"why":"<explanation>"}],"notes":["<anything you had to guess at, skip, or invent>"]}',
  '',
  'Rules that matter:',
  `- ${MIN_ANSWERS}-${MAX_ANSWERS} answers per question; 4 is the house style.`,
  '- Keep every option within roughly 15% of the same length, and NEVER make the best answer the longest one. Learners who spot that tell stop reading and just pick the wordiest option, and the scores stop meaning anything.',
  '- The best answer scores 1.0 on the question\'s primary competency. Give the others partial credit reflecting how defensible they are: a near-miss around 0.5-0.65, a plausible-but-wrong around 0.2-0.35, a genuinely bad one 0.05-0.15.',
  '- An answer may also carry smaller scores on OTHER competencies it genuinely demonstrates. Only when it really does — do not sprinkle these.',
  '- `setup` is the scenario in a grey panel; `prompt` is the actual question ("What\'s the best move?"). If the draft merges them, split them.',
  '- `why` is 1-3 sentences of plain language explaining what makes the best answer best. Address the learner as "you". No jargon.',
  '- NEVER name specific AI models or versions. Model names change constantly; ask about the judgment (fast everyday model vs. slower deep-reasoning one) instead.',
  '- ids are short, stable, kebab-case, derived from the subject ("refund-window-check"). Reuse an id from the draft only if the draft clearly refers to an existing question.',
  '- Ignore commentary, revisions, and chatter in the transcript. If the draft revises a question, keep only the final version.',
  '- Do not invent questions to hit a count. Return only what is actually in the draft, and put anything ambiguous in `notes`.',
].join('\n');

export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let text;
  try {
    const body = await request.json();
    text = typeof body?.text === 'string' ? body.text.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Could not read the request' }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: 'Paste something to import first' }, { status: 400 });
  }
  // Roughly a novel's worth of chat. Past this we're almost certainly being fed
  // the wrong thing, and the model output would be unreviewable anyway.
  if (text.length > 200000) {
    return NextResponse.json(
      { error: 'That paste is too long. Split it into a few smaller imports.' },
      { status: 400 },
    );
  }

  try {
    const response = await getClient().messages.create({
      model: MODELS.sonnet,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Here is the draft. Extract every placement question in it.\n\n---\n\n${text}`,
      }],
    });

    const raw = response.content[0]?.text?.trim() || '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "We couldn't find any questions in that. Check the paste and try again." },
        { status: 422 },
      );
    }

    // Run the model's output through the same normalizer the save path uses, so
    // the preview shows exactly what would be stored — not a rosier version of it.
    const incoming = parsed.questions.length;
    const questions = normalizeQuiz(parsed.questions);
    const notes = (Array.isArray(parsed.notes) ? parsed.notes : [])
      .filter((n) => typeof n === 'string' && n.trim())
      .map((n) => n.trim());

    const dropped = incoming - questions.length;
    if (dropped > 0) {
      notes.push(
        `${dropped} question${dropped === 1 ? '' : 's'} couldn't be used — usually a missing question line or fewer than ${MIN_ANSWERS} answers.`,
      );
    }

    return NextResponse.json({ questions, notes });
  } catch (error) {
    console.error('POST /api/onboarding-quiz/parse error:', error);
    return NextResponse.json(
      { error: 'Import failed while reading that. Try again, or paste a smaller chunk.' },
      { status: 500 },
    );
  }
}
