// "This skill is worth a refresh" — derived automatically from the AI news feed.
//
// Feedback #54 asked for heatmap freshness to account for the world changing, not
// just for how long ago you studied. When a model release actually changes how
// people should prompt, the thing you learned in March can be out of date even
// though you studied it recently.
//
// The signal comes from the daily news scan, which already classifies every
// finding (lib/news-relevance.js). Only `model_change` and `prompt_practice`
// items are even considered, and each candidate then has to survive a second,
// deliberately strict pass that must name which of our fixed heatmap skills it
// affects. A headline that can't name a skill changes nothing.
//
// Deliberate limits, because an automatic signal that overreaches is worse than
// none: this NEVER touches mastery scores. It only marks a skill as worth
// revisiting, and every mark carries the headline that caused it so a bad call is
// visible and traceable rather than mysterious.

import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from './models';
import { getUserData, saveUserData } from './blob-store';
import { SKILL_CATALOG } from './heatmap-data';
import { untrusted, QUARANTINE_NOTE } from './untrusted';

const SYSTEM_ID = '__system__';
const TYPE = 'skill_staleness';

// Only these news categories can ever mark a skill stale. Everything else in the
// feed — business, research, hardware, industry chatter — is incapable of
// changing how a learner should prompt, so it never reaches the classifier.
const ELIGIBLE_CATEGORIES = ['model_change', 'prompt_practice'];

// How long a mark stays live. A release stops being news eventually: without an
// expiry, one busy month would leave the whole heatmap permanently amber.
const MARK_TTL_DAYS = 120;

// A cap per run, so one noisy scan day can't flag the entire heatmap at once.
const MAX_MARKS_PER_RUN = 3;

const SKILL_NAMES = SKILL_CATALOG.map((s) => s.name);

function daysBetween(aIso, bIso) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.floor((b - a) / 86400000);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

// A mark: { skill, reason, headline, url, source, effective_at }
// `effective_at` is the cutoff — you're stale on this skill if you last studied
// it BEFORE this date. `reason` is one learner-facing sentence.
function validateMarks(raw) {
  const list = Array.isArray(raw) ? raw : raw?.marks;
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && typeof m.skill === 'string' && SKILL_NAMES.includes(m.skill))
    .filter((m) => typeof m.effective_at === 'string' && Number.isFinite(new Date(m.effective_at).getTime()))
    .map((m) => ({
      skill: m.skill,
      reason: typeof m.reason === 'string' ? m.reason : '',
      headline: typeof m.headline === 'string' ? m.headline : '',
      url: typeof m.url === 'string' ? m.url : '',
      source: typeof m.source === 'string' ? m.source : '',
      effective_at: m.effective_at,
    }));
}

// Live marks only — anything past its TTL is dropped on read, so an old release
// stops nagging without needing a cleanup job.
export async function getStaleSkillMarks(nowIso = new Date().toISOString()) {
  try {
    const stored = await getUserData(SYSTEM_ID, TYPE);
    return validateMarks(stored?.data || stored)
      .filter((m) => daysBetween(m.effective_at, nowIso) <= MARK_TTL_DAYS);
  } catch (error) {
    console.error('getStaleSkillMarks read error:', error);
    return [];
  }
}

// Keep one mark per skill — the most recent wins, since a newer release
// supersedes an older one for the same skill.
function mergeMarks(existing, incoming) {
  const bySkill = new Map(existing.map((m) => [m.skill, m]));
  for (const mark of incoming) {
    const prior = bySkill.get(mark.skill);
    if (!prior || new Date(mark.effective_at) > new Date(prior.effective_at)) {
      bySkill.set(mark.skill, mark);
    }
  }
  return [...bySkill.values()];
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const CLASSIFIER_SYSTEM = [
  'You decide whether an AI news item changes how ordinary (non-engineer) employees should USE or PROMPT AI tools,',
  'to the point that someone who already learned a skill would now be working from out-of-date habits.',
  '',
  'Answer YES for very few items. The bar is: "someone who learned this skill last month would now do it differently."',
  'Examples that clear the bar: a new model that changes which model you should pick for a task; a tool',
  'dropping or changing a feature people were taught to use; a prompting technique that a model release',
  'made unnecessary or newly effective.',
  '',
  'Answer NO for: benchmark results, funding and business news, research papers, roadmap speculation,',
  'incremental version bumps that change nothing about how you prompt, and anything aimed at engineers.',
  'A model simply being released is NOT enough on its own — it must change what a learner should DO.',
  '',
  `The only skills you may name are exactly these: ${SKILL_NAMES.join('; ')}.`,
  'Never invent a skill name. If nothing in that list is genuinely affected, the answer is NO.',
  '',
  QUARANTINE_NOTE,
  '',
  'Return ONLY a JSON array, no prose. One object per item you answer YES for:',
  '[{"i": <1-based item number>, "skills": ["<exact skill name>"], "reason": "<one short sentence a learner would understand, naming what changed>"}]',
  'Return [] if no item clears the bar. Name at most 2 skills per item — the ones most directly affected.',
].join('\n');

function parseClassifierJson(text) {
  const match = String(text || '').match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Ask the model which (if any) of these news items make a skill worth refreshing.
// Never throws — on any failure it returns [], which means "change nothing".
async function classifyStaleness(items) {
  if (!items.length) return [];
  // The category is ours (assigned by lib/news-relevance.js); the title and
  // summary are feed text, so they are quarantined (security review F-10). This
  // classifier's output marks skills stale on its own, with no human in the loop.
  const numbered = items
    .map((it, i) => {
      const head = `${i + 1}. [${it.category}] ${untrusted(it.title)}`;
      return it.summary ? `${head} — ${untrusted(it.summary)}` : head;
    })
    .join('\n');
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 1000,
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: 'user', content: numbered }],
    });
    return parseClassifierJson(response.content?.[0]?.text);
  } catch (error) {
    console.error('skill staleness classification failed:', error?.message || error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Entry point — called by the daily news scan after findings are classified
// ---------------------------------------------------------------------------

// Reads today's classified findings, works out which skills a release actually
// dated, and merges the result into the stored marks. Returns the marks it added
// (empty array when nothing cleared the bar, which is the common case).
export async function refreshStaleSkillMarks(findings, nowIso = new Date().toISOString()) {
  const eligible = (findings || [])
    .filter((f) => f && typeof f.title === 'string' && ELIGIBLE_CATEGORIES.includes(f.category))
    .slice(0, 25);
  if (!eligible.length) return [];

  const verdicts = await classifyStaleness(eligible);
  const added = [];
  for (const v of verdicts) {
    const item = eligible[Number(v?.i) - 1];
    if (!item) continue;
    const skills = Array.isArray(v.skills) ? v.skills.filter((s) => SKILL_NAMES.includes(s)) : [];
    const reason = typeof v.reason === 'string' ? v.reason.trim() : '';
    // A verdict with no valid skill or no reason is unusable — the whole point is
    // that a learner can see WHY their skill was flagged.
    if (!skills.length || !reason) continue;
    for (const skill of skills.slice(0, 2)) {
      added.push({
        skill,
        reason,
        headline: item.title,
        url: item.url || '',
        source: item.sourceName || '',
        // Findings carry no per-item publish date, so the scan date is the cutoff.
        // That errs on the safe side: it only flags people who studied before we
        // saw the news, never someone who studied the day it broke.
        effective_at: nowIso,
      });
    }
  }
  if (!added.length) return [];

  const capped = added.slice(0, MAX_MARKS_PER_RUN);
  if (added.length > capped.length) {
    console.warn(`skill staleness: capped ${added.length} marks to ${capped.length} for this run`);
  }

  try {
    const existing = await getStaleSkillMarks(nowIso);
    await saveUserData(SYSTEM_ID, TYPE, { marks: mergeMarks(existing, capped) });
  } catch (error) {
    console.error('skill staleness save error:', error);
    return [];
  }
  return capped;
}

// The read side (applyStaleMarks) lives in lib/stale-marks.js — this module
// imports the Anthropic SDK, so a client component can't import from here.
