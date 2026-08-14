import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { logAuditEntry } from '@/lib/audit-log';
import { AUDIENCE, playerRoleContext } from '@/lib/audience';
import { withProjects } from '@/lib/work-projects';
import { enforceRateLimit } from '@/lib/rate-limit';

// LLM generation of a full custom round can take a while — give it room so the
// route doesn't time out before responding (see the maxDuration gotcha).
export const maxDuration = 120;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Per game-type: the system prompt and a normalizer that coerces the model
// output into the exact shape that game expects (dropping malformed items).
const SPEED_COUNT = 10;
// Six jumps to reach the shore. Enough to feel like a journey, few enough that a
// round stays under the 3-5 minutes the card promises.
const LILY_COUNT = 6;
const HALLUC_ROUNDS = 3;
const PROMPT_COUNT = 4;
const WHEEL_COUNT = 4;
const FEUD_ROUNDS = 4;
const TRUTHS_ROUNDS = 5;
const MILLIONAIRE_COUNT = 10;

// Audience framing (who's playing vs who HCP sells to) lives in
// lib/audience.js and is prepended to every game's system prompt below.
//
// `roleAnchored` applies to Prompt Battle ONLY, because writing a prompt requires
// a situation to write it for. Every other game teaches concept knowledge, where
// role detail just narrows the material — players already know their own jobs;
// they came to learn AI. Even in Prompt Battle the role is scenery, not the answer
// (see the flavor-only rules in playerRoleContext).
//
// Family Feud used to be role-anchored too, until the format itself turned out to
// be the problem: "guess what your coworkers said" polls opinion instead of
// teaching. Its questions now have known answer sets, and each answer carries a
// one-line "why" the board shows on reveal. Wheel of Fortune got the same
// treatment via "meaning" — solving a phrase should teach the idea, not the
// spelling.

const GENERATORS = {
  speed: {
    maxTokens: 3000,
    system: `You are writing a "Speed Round" quiz for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${SPEED_COUNT} rapid-fire multiple-choice questions that teach and test genuinely useful, practical knowledge about that topic.

Rules:
- Each question has EXACTLY 4 options, with ONE clearly correct answer.
- "correct" is the 0-based index (0–3) of the right option.
- Keep questions and options short enough to read in a few seconds.
- Vary difficulty from foundational to nuanced. Accurate, no trick questions.
- "explanation" is one sentence on why the answer is right.

Return ONLY valid JSON (no markdown fences):
{ "questions": [ { "q": "<question>", "options": ["a","b","c","d"], "correct": <0-3>, "explanation": "<one sentence>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.questions) ? parsed.questions : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 4 && Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3)
        .map((x) => ({
          q: String(x.q).trim(),
          options: x.options.map((o) => String(o).trim()),
          correct: x.correct,
          explanation: String(x.explanation || '').trim(),
        }))
        .slice(0, SPEED_COUNT);
      return clean.length >= 5 ? { questions: clean } : null;
    },
  },

  // Lily Leap answers by TAPPING a pad, so its options live inside a circle about
  // 120px across. Speed Round's generator was the obvious thing to reuse — same
  // question/options/correct shape — but its options are written to be read in a
  // list and routinely run a full line, which overflows a pad or shrinks to
  // unreadable. Hence its own entry: identical JSON, much harder brevity rules.
  lilyleap: {
    maxTokens: 2000,
    system: `You are writing a "Lily Leap" quiz for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${LILY_COUNT} multiple-choice questions that teach genuinely useful, practical knowledge about it.

The player answers by jumping onto a lily pad, so each option is printed inside a small circle.

Rules:
- Each question has EXACTLY 3 options, with ONE clearly correct answer.
- Every option is AT MOST 4 words, and short is better than clever. One or two words is ideal. They must fit inside a circle.
- Never write an option as a sentence, and never start options with "The" just to pad them.
- The question itself is at most 14 words. It sits in a single strip above the pond.
- "correct" is the 0-based index (0-2) of the right option.
- The three options must be genuinely different answers, not shades of the same one. No "all of the above", no "none of the above".
- Accurate. No trick questions. Vary difficulty from foundational to nuanced.
- "explanation" is ONE short sentence on why the answer is right, shown after the jump.

Return ONLY valid JSON (no markdown fences):
{ "questions": [ { "q": "<question>", "options": ["a","b","c"], "correct": <0-2>, "explanation": "<one sentence>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.questions) ? parsed.questions : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 3
          && Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 2)
        .map((x) => ({
          q: String(x.q).trim(),
          // Hard cap in code as well as in the prompt: a pad that has to render
          // "Retrieval augmented generation pipeline" is a broken pad, and a brevity
          // rule that only exists in the prompt is a request.
          options: x.options.map((o) => String(o).trim().split(/\s+/).slice(0, 4).join(' ')),
          correct: x.correct,
          explanation: String(x.explanation || '').trim(),
        }))
        .slice(0, LILY_COUNT);
      return clean.length >= 4 ? { questions: clean } : null;
    },
  },

  halluc: {
    maxTokens: 4000,
    system: `You are writing "Hallucination Hunt" rounds for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${HALLUC_ROUNDS} rounds. Each round is a realistic AI-generated answer about the topic that contains a few PLANTED factual errors ("hallucinations") the player must spot.

Rules per round:
- "context": one sentence framing what was asked (e.g. 'You asked an AI: "..."'), related to the topic.
- "sentences": 6–8 short, standalone sentences forming the AI's answer.
- "hallucinations": array of the 0-based indices of the sentences that are factually WRONG. Include 1–2 per round (never 0). The rest must be TRUE and plausible.
- "explanations": an object keyed by each hallucination index, each a one-sentence explanation of what's actually correct.
- Errors must be genuinely wrong but believable — not obvious. Everything else must be accurate.

Return ONLY valid JSON (no markdown fences):
{ "rounds": [ { "context": "<...>", "sentences": ["...","..."], "hallucinations": [3], "explanations": { "3": "<why it's wrong>" } } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.rounds) ? parsed.rounds : null;
      if (!arr) return null;
      const clean = arr.map((r, i) => {
        const sentences = Array.isArray(r?.sentences) ? r.sentences.map((s) => String(s).trim()).filter(Boolean) : [];
        const hallucinations = (Array.isArray(r?.hallucinations) ? r.hallucinations : [])
          .map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < sentences.length);
        const explanations = {};
        hallucinations.forEach((n) => { explanations[n] = String(r?.explanations?.[n] || r?.explanations?.[String(n)] || 'This claim is not accurate.').trim(); });
        return { id: i + 1, context: String(r?.context || '').trim(), sentences, hallucinations, explanations };
      }).filter((r) => r.context && r.sentences.length >= 4 && r.hallucinations.length >= 1)
        .slice(0, HALLUC_ROUNDS);
      return clean.length >= 2 ? { rounds: clean } : null;
    },
  },

  prompt: {
    maxTokens: 2500,
    roleAnchored: true,
    system: `You are writing "Prompt Battle" scenarios for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${PROMPT_COUNT} realistic workplace scenarios where the player must write a good prompt for an AI tool, all connected to the topic.

Rules per scenario:
- "department": the team this fits (e.g. "Sales", "Operations", "Customer Success").
- "title": a short task name.
- "context": 1–2 sentences of realistic situation/background.
- "task": one sentence telling the player what prompt to write (e.g. "Write a prompt that would get an AI to draft ...").
- Make each scenario distinct and genuinely useful for the topic.

Return ONLY valid JSON (no markdown fences):
{ "scenarios": [ { "department": "<team>", "title": "<short title>", "context": "<1-2 sentences>", "task": "<what prompt to write>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.scenarios) ? parsed.scenarios : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && x.title && x.context && x.task)
        .map((x, i) => ({
          id: i + 1,
          department: String(x.department || 'Your work').trim(),
          title: String(x.title).trim(),
          context: String(x.context).trim(),
          task: String(x.task).trim(),
        }))
        .slice(0, PROMPT_COUNT);
      return clean.length >= 2 ? { scenarios: clean } : null;
    },
  },

  wheel: {
    maxTokens: 1500,
    system: `You are writing "Wheel of Fortune" puzzles for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${WHEEL_COUNT} puzzles. Each puzzle is a short phrase the player uncovers letter by letter.

Rules per puzzle:
- "phrase": an AI concept, tool, technique, or best-practice phrase relevant to the topic. 2–4 words. Use ONLY letters A–Z and single spaces — NO punctuation, numbers, hyphens, or symbols.
- "category": a short uppercase hint for what kind of thing it is (e.g. "AI TECHNIQUE", "TOOL", "BEST PRACTICE", "CONCEPT").
- "meaning": ONE short sentence — up to about 20 words — saying what the phrase means and when you'd use it, in plain language. Solving the puzzle should teach the idea, not just the words, so never restate the phrase back.
- Keep phrases recognizable and genuinely educational for the topic. Vary length.

Return ONLY valid JSON (no markdown fences):
{ "puzzles": [ { "category": "<UPPERCASE HINT>", "phrase": "<TWO TO FOUR WORDS>", "meaning": "<one plain-language sentence>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.puzzles) ? parsed.puzzles : null;
      if (!arr) return null;
      const clean = arr.map((p) => ({
        category: String(p?.category || 'PHRASE').toUpperCase().replace(/[^A-Z \-&]/g, '').trim() || 'PHRASE',
        phrase: String(p?.phrase || '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim(),
        // Optional, like the Feud "why": a missing meaning costs the teaching
        // line, not the puzzle.
        meaning: String(p?.meaning || '').trim(),
      })).filter((p) => p.phrase.replace(/ /g, '').length >= 3)
        .slice(0, WHEEL_COUNT);
      return clean.length >= 2 ? { puzzles: clean } : null;
    },
  },

  feud: {
    maxTokens: 3500,
    system: `You are writing "Family Feud"-style survey rounds for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${FEUD_ROUNDS} rounds. The board is the teaching tool: every answer a player uncovers must be a practice, technique, or pitfall they can use afterwards.

THE QUESTION IS THE WHOLE GAME. It must have a KNOWN answer set — the things a practitioner in the field would name — not a matter of taste or local habit.
- GOOD: "Name a way to check whether an AI answer is accurate." / "Name something you should put in a prompt to get better output." / "Name something AI is genuinely bad at." / "Name a sign an AI wrote something." / "Name a kind of information you should never paste into a public AI tool."
- BAD, never write these: what tools people prefer, which AI is most popular, what a specific team or company does, how often people use AI, opinions, feelings, or predictions. If two well-informed experts would give different answers because of taste rather than knowledge, the question is wrong.
- The player should finish the round knowing more about the topic than when they started — not knowing more about their coworkers.

Rules per round:
- "question": the survey prompt, phrased as "Name a…" or "Name something…".
- "answers": 5–6 answers, RANKED by how commonly a practitioner would name them. Each answer has:
  - "text": the answer, a few words (e.g. "Check it against the source").
  - "points": popularity points; the answers' points should sum to about 100, with the most commonly named answer highest.
  - "keywords": 4–8 lowercase words/phrases for matching a player's typed guess. Cover the DIFFERENT WAYS someone might say this answer, not restatements of it — for "ask for citations" give ["citations","citation","sources","source","references","cite","where it got that"]. Every keyword must be at least 4 characters and specific enough that it could only mean this answer: never generic words like "ask", "use", "may", "check" on their own.
  - "why": ONE short sentence — up to about 15 words — saying why this answer matters or how to do it. This is what the player reads when the tile flips, so make it teach, not restate the answer.
- Every answer must be genuinely correct practice. No filler entries to pad the board.

Return ONLY valid JSON (no markdown fences):
{ "rounds": [ { "question": "<survey question>", "answers": [ { "text": "<answer>", "points": <number>, "keywords": ["...","..."], "why": "<one teaching sentence>" } ] } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.rounds) ? parsed.rounds : null;
      if (!arr) return null;
      const clean = arr.map((r) => {
        const answers = (Array.isArray(r?.answers) ? r.answers : [])
          .filter((a) => a && a.text)
          .map((a) => ({
            text: String(a.text).trim(),
            points: Math.max(1, Math.round(Number(a.points) || 0)) || 10,
            keywords: (Array.isArray(a.keywords) ? a.keywords : []).map((k) => String(k).toLowerCase().trim()).filter(Boolean),
            // Optional: the board still works without it, so a missing "why"
            // costs the teaching line rather than the whole round.
            why: String(a.why || '').trim(),
          }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 6);
        return { question: String(r?.question || '').trim(), answers };
      }).filter((r) => r.question && r.answers.length >= 3)
        .slice(0, FEUD_ROUNDS);
      return clean.length >= 2 ? { rounds: clean } : null;
    },
  },

  twotruths: {
    maxTokens: 3000,
    system: `You are writing "Two Truths and a Lie" rounds for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${TRUTHS_ROUNDS} rounds. Each round has 3 statements about the topic: exactly 2 are TRUE and 1 is a believable but FALSE "lie".

Rules per round:
- "statements": an array of 3 statements, similar in length and style so the lie isn't obvious.
- "lie": the 0-based index (0–2) of the FALSE statement.
- "explanation": one sentence explaining why the lie is false (and ideally what's actually true).
- The two true statements must be genuinely accurate and teach something useful.

Return ONLY valid JSON (no markdown fences):
{ "rounds": [ { "statements": ["...","...","..."], "lie": <0-2>, "explanation": "<why it's false>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.rounds) ? parsed.rounds : null;
      if (!arr) return null;
      const clean = arr
        .filter((r) => Array.isArray(r?.statements) && r.statements.length === 3 && Number.isInteger(r.lie) && r.lie >= 0 && r.lie <= 2)
        .map((r) => ({
          statements: r.statements.map((s) => String(s).trim()),
          lie: r.lie,
          explanation: String(r.explanation || '').trim(),
        }))
        .slice(0, TRUTHS_ROUNDS);
      return clean.length >= 3 ? { rounds: clean } : null;
    },
  },

  millionaire: {
    maxTokens: 3500,
    system: `You are writing a "Who Wants to Be a Millionaire"-style question ladder for a corporate AI-learning platform. Given a TOPIC, write EXACTLY ${MILLIONAIRE_COUNT} multiple-choice questions, ORDERED from easiest (question 1) to hardest (question ${MILLIONAIRE_COUNT}).

Rules:
- Each question has EXACTLY 4 options with ONE correct answer.
- "correct" is the 0-based index (0–3).
- Difficulty must clearly rise down the ladder: early questions foundational, later ones nuanced/expert.
- "explanation" is one sentence on why the answer is right.
- Accurate and genuinely useful for the topic. No trick questions.

Return ONLY valid JSON (no markdown fences):
{ "questions": [ { "q": "<question>", "options": ["a","b","c","d"], "correct": <0-3>, "explanation": "<one sentence>" } ] }`,
    normalize: (parsed) => {
      const arr = Array.isArray(parsed?.questions) ? parsed.questions : null;
      if (!arr) return null;
      const clean = arr
        .filter((x) => x && typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 4 && Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3)
        .map((x) => ({
          q: String(x.q).trim(),
          options: x.options.map((o) => String(o).trim()),
          correct: x.correct,
          explanation: String(x.explanation || '').trim(),
        }))
        .slice(0, MILLIONAIRE_COUNT);
      return clean.length >= 5 ? { questions: clean } : null;
    },
  },
};

export async function POST(request) {
  const limited = await enforceRateLimit('games/generate', 'ai', request);
  if (limited) return limited;

  try {
    const profile = await getAuthenticatedProfile();
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || '').trim();
    const topic = String(body.topic || '').trim();

    const gen = GENERATORS[type];
    if (!gen) return NextResponse.json({ error: 'Unknown game type.' }, { status: 400 });
    if (!topic) return NextResponse.json({ error: 'A topic is required.' }, { status: 400 });

    // Projects are part of the backdrop for role-anchored games, so load them
    // alongside the profile (they live under their own user-data key).
    const profileForGen = gen.roleAnchored ? await withProjects(profile) : profile;

    const system = [
      AUDIENCE,
      gen.roleAnchored ? playerRoleContext(profileForGen) : null,
      gen.system,
    ].filter(Boolean).join('\n\n');

    const response = await getClient().messages.create({
      model: MODELS.sonnet,
      max_tokens: gen.maxTokens,
      system,
      messages: [{ role: 'user', content: `TOPIC: ${topic}\n\nWrite the full round now.` }],
    });

    const text = response.content?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }

    const result = gen.normalize(parsed);
    if (!result) {
      return NextResponse.json({ error: 'Could not build that round. Try rephrasing your topic.' }, { status: 502 });
    }

    logAuditEntry({
      type: `generate_game_${type}`,
      endpoint: '/api/games/generate',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { type, topic },
      output: { ok: true },
    }).catch(() => {});

    return NextResponse.json({ type, topic, ...result });
  } catch (error) {
    console.error('POST /api/games/generate error:', error);
    return NextResponse.json({ error: 'Something went wrong generating the game.' }, { status: 500 });
  }
}
