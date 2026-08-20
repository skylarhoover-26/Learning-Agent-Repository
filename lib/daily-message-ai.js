// LLM-written copy for the daily Slack nudge.
//
// The handwritten pool (lib/daily-message.js) is seeded by content-day + email, which
// keeps a real learner's message stable for the day but means it never varies within
// one — and it could only ever say generic things about the topic. The pick's own
// description was the weak part: "This is a gap in your knowledge. A focused lesson
// here will round out your AI skills" tells someone nothing about why Bias & Fairness
// is worth the few minutes it asks of their morning.
//
// So the greeting and the reason are written per send, by a model, about THIS topic.
//
// What the model does NOT get to write: the topic name, the streak, the level, the XP,
// the buttons. Those are facts and they stay in code — a model that can phrase the
// standing line is a model that can get someone's XP wrong.
//
// Never throws. On any failure the caller falls back to the handwritten pool, so a
// model hiccup at 9:30 AM costs variety, never the nudge itself.

import Anthropic from '@anthropic-ai/sdk';
import { capSentences } from './text-trim';
import { MODELS } from './models';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Haiku: this is two short sentences, it runs once per recipient inside the send loop,
// and it must not add real latency to a weekday cron.
const MODEL = MODELS.haiku;

// Enough about the learner to be specific, without inviting the model to make the
// lesson about their job title. Role detail is scenery (see the audience split in
// lib/audience.js) — the topic is the subject.
function learnerContext(profile) {
  const bits = [];
  if (profile?.department) bits.push(`They work in ${profile.department}.`);
  const tasks = Array.isArray(profile?.top_tasks) ? profile.top_tasks.filter(Boolean).slice(0, 3) : [];
  if (tasks.length) bits.push(`Day to day they: ${tasks.join(', ')}.`);
  if (profile?.goal) bits.push(`Their learning goal: ${profile.goal}.`);
  return bits.join(' ');
}

const WHY_BY_TYPE = {
  refresh: 'They have practiced this before and it is going stale, so the angle is "this is worth keeping sharp".',
  new: 'This is new to them and was picked to fill a gap, so the angle is "here is what this unlocks for you".',
  deepen: 'They have already started this, so the angle is "there is a level past where you stopped".',
  start: 'This is their very first lesson, so the angle is "here is a good place to begin".',
};

// Returns { why } or null.
//   why — at most 2 short sentences on why THIS topic is worth their time, and how
//         it applies to using AI in their work
//
// The greeting used to come from here too. It now lives in lib/daily-message.js as a
// pool of ten day-of-the-week openers: the model's versions read as filler ("quick
// thing this morning") and made time claims the rest of the message didn't support
// (feedback #194). The caller still passes `firstName`; nothing here needs it now.
//
// The message DOES state a duration now, on the training line, derived from the
// lesson format. That makes it more important, not less, that the model never
// writes one: two independent time claims in one message is the exact failure the
// old pooled promises caused.
export async function generateDailyNudge({ profile, pick }) {
  const topic = pick?.topic || pick?.title;
  if (!topic) return null;

  const system = [
    'You write the two-line opening of a friendly internal Slack message that nudges a coworker to take a short AI lesson.',
    'You are writing for Housecall Pro employees. Plain, warm, human. Never corporate.',
    '',
    'Return ONLY JSON: {"why": "..."}',
    '',
    'WHY:',
    `- AT MOST 2 short sentences on why "${topic}" is genuinely worth their time TODAY, for THIS person. Never 3.`,
    '- Say how it applies to USING AI in their actual work. That connection is the whole point of the line.',
    '- Be concrete about what it lets them do, or what it stops going wrong. Name a real situation they would recognise.',
    '- This is the most important line in the message. It must be specific to the topic.',
    '- BANNED, because they say nothing: "round out your AI skills", "this is a gap in your knowledge", "level up",',
    '  "in today\'s fast-paced world", "unlock your potential", "take your skills to the next level", "game changer".',
    '- Do not mention XP, levels, streaks, points or the leaderboard. Other code writes those and will contradict you.',
    '- Do not claim what the lesson contains beyond the topic itself. You have not seen it.',
    '- NEVER state how long it takes. No "five minutes", "a couple of minutes", "quick", "in no time".',
    '  The message names the real duration on its own line, from the format, and a second guess at it',
    '  would contradict that number.',
    '',
    'STYLE RULES (strict):',
    '- NO em dashes or en dashes. Use commas, full stops, or "and".',
    '- Short sentences. No semicolons. No markdown headings or bullets.',
    '- Write "Housecall Pro" in full, never HCP.',
    '- Do not address them as "team" or "folks".',
  ].filter(Boolean).join('\n');

  const user = [
    `Topic: "${topic}"`,
    pick?.type && WHY_BY_TYPE[pick.type] ? `Why it was chosen: ${WHY_BY_TYPE[pick.type]}` : null,
    pick?.description ? `The app's own (deliberately generic) description, which you are replacing with something better: "${pick.description}"` : null,
    learnerContext(profile) || null,
    '',
    'Write the greeting and the why.',
  ].filter(Boolean).join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = (response.content?.[0]?.text || '').trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const why = clean(parsed.why);
    if (!why) return null;
    // Length cap rather than trust: this goes out unreviewed. Tightened from 400 to
    // 260 so "at most 2 short sentences" is enforced in code and not just asked for.
    return { why: capSentences(why, 260) };
  } catch (error) {
    console.error('generateDailyNudge failed, falling back to the written pool:', error?.message || error);
    return null;
  }
}

// House style enforced in code, because a style rule in a prompt is a request. Dashes
// are the one thing that reliably slips through.
function clean(value) {
  if (typeof value !== 'string') return null;
  const out = value
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\bHCP\b/g, 'Housecall Pro')
    .replace(/\s+/g, ' ')
    .trim();
  return out || null;
}
