// Lesson activities as Slack modal inputs, plus the grading for what comes back.
//
// All six activity types the plan generator emits are supported, because a Slack
// lesson that quietly skipped match/categorize/order would be an easier lesson than
// the same one in the app while paying the same XP. Mapping to Slack's input
// elements:
//   mcq         -> radio buttons (one per option)
//   scenario    -> radio buttons (one per choice)
//   match       -> one select per left-hand item, options are the right-hand items
//   categorize  -> one select per item, options are the buckets
//   order       -> one select per item, options are the positions
//   write       -> multiline text input, graded by lib/grade-writing.js
//
// Grading rules match components/lesson-activity.jsx exactly: 3 attempts, then the
// activity settles unpassed; a "write" passes at activity.passScore (default 70).
//
// Shuffles are SEEDED by the step id, not random: the same modal reopened on a retry
// must show the options in the same order, or the learner's mental map of the list
// changes underneath them between attempts.

import { clamp, toMrkdwn } from './slack-mrkdwn';
import { gradeWriting } from './grade-writing';

export const MAX_ATTEMPTS = 3;

// Slack's limits. Exceeding any one of these rejects the whole view, which would
// show up as a button that silently does nothing.
const OPTION_TEXT_MAX = 150;
const LABEL_MAX = 2000;
const INPUT_HINT_MAX = 2000;

// Deterministic shuffle: same seed, same order, every time.
//
// Seeded Fisher-Yates over mulberry32 rather than the sort-by-hashed-key trick used
// elsewhere in the codebase (see dailyPick). That trick XORs one hash with a
// per-index constant, and for short lists a great many different seeds produce the
// SAME permutation — two activities would show their options in identical order, so
// the "don't always put the right answer in the same spot" intent quietly did nothing.
function seededShuffle(items, seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function option(text, value) {
  return { text: { type: 'plain_text', text: clamp(text, OPTION_TEXT_MAX) }, value: String(value) };
}

function selectBlock({ blockId, label, options, placeholder = 'Choose one' }) {
  return {
    type: 'input',
    block_id: blockId,
    label: { type: 'plain_text', text: clamp(label, LABEL_MAX) },
    element: {
      type: 'static_select',
      action_id: 'value',
      placeholder: { type: 'plain_text', text: clamp(placeholder, 150) },
      options,
    },
  };
}

// The prompt text above the inputs (question / situation / instructions).
function promptBlocks(activity, type) {
  const text = type === 'mcq' ? activity?.question
    : type === 'scenario' ? activity?.situation
    : activity?.instructions;
  const md = toMrkdwn(text || 'Answer the question below.');
  return [{ type: 'section', text: { type: 'mrkdwn', text: clamp(md, 2900) } }];
}

// ── Rendering ────────────────────────────────────────────────────────────────

// Returns the modal's input blocks for one activity step, or null when the step's
// activity data is too malformed to render (the caller then skips it rather than
// opening an empty modal).
export function activityInputBlocks(step) {
  const type = step?.activityType;
  const a = step?.activity || {};
  const seed = step?.id || 'step';
  const blocks = [...promptBlocks(a, type)];

  switch (type) {
    case 'mcq': {
      const options = (a.options || []).slice(0, 10);
      if (options.length < 2) return null;
      blocks.push({
        type: 'input',
        block_id: 'mcq',
        label: { type: 'plain_text', text: 'Your answer' },
        element: {
          type: 'radio_buttons',
          action_id: 'value',
          options: options.map((text, i) => option(text, i)),
        },
      });
      return blocks;
    }

    case 'scenario': {
      const choices = (a.choices || []).slice(0, 10);
      if (choices.length < 2) return null;
      // Seeded shuffle keeps the correct answer from always sitting in the same
      // place, while staying stable across retries. Value carries the ORIGINAL
      // index so grading doesn't depend on display order.
      const ordered = seededShuffle(choices.map((c, i) => ({ c, i })), seed);
      blocks.push({
        type: 'input',
        block_id: 'scenario',
        label: { type: 'plain_text', text: 'What would you do?' },
        element: {
          type: 'radio_buttons',
          action_id: 'value',
          options: ordered.map(({ c, i }) => option(c.text, i)),
        },
      });
      return blocks;
    }

    case 'match': {
      const pairs = (a.pairs || []).filter((p) => p?.left && p?.right).slice(0, 5);
      if (pairs.length < 2) return null;
      const rights = seededShuffle(pairs.map((p, i) => ({ text: p.right, i })), `${seed}:r`);
      pairs.forEach((pair, i) => {
        blocks.push(selectBlock({
          blockId: `match_${i}`,
          label: pair.left,
          options: rights.map((r) => option(r.text, r.i)),
          placeholder: 'Match to…',
        }));
      });
      return blocks;
    }

    case 'categorize': {
      const buckets = (a.buckets || []).filter(Boolean).slice(0, 5);
      const items = (a.items || []).filter((it) => it?.text).slice(0, 8);
      if (buckets.length < 2 || items.length < 2) return null;
      items.forEach((item, i) => {
        blocks.push(selectBlock({
          blockId: `cat_${i}`,
          label: item.text,
          options: buckets.map((b, bi) => option(b, bi)),
          placeholder: 'Put it in…',
        }));
      });
      return blocks;
    }

    case 'order': {
      const items = (a.items || []).filter(Boolean).slice(0, 6);
      if (items.length < 2) return null;
      // One select per item, choosing its position. Displayed in shuffled order so
      // the correct sequence isn't just "as listed"; the value is the item's index
      // in the ORIGINAL (correct) order.
      const shuffled = seededShuffle(items.map((text, i) => ({ text, i })), seed);
      const positions = items.map((_, i) => option(`Position ${i + 1}`, i));
      shuffled.forEach(({ text, i }) => {
        blocks.push(selectBlock({
          blockId: `order_${i}`,
          label: text,
          options: positions,
          placeholder: 'Which position?',
        }));
      });
      return blocks;
    }

    case 'write': {
      const passScore = a.passScore ?? 70;
      blocks.push({
        type: 'input',
        block_id: 'write',
        label: { type: 'plain_text', text: 'Your answer' },
        hint: { type: 'plain_text', text: clamp(`Graded on: ${a.gradingCriteria || 'clarity and completeness'}. You need ${passScore} to pass.`, INPUT_HINT_MAX) },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          multiline: true,
          placeholder: { type: 'plain_text', text: clamp(a.placeholder || 'Write your answer here…', 150) },
        },
      });
      return blocks;
    }

    default:
      return null;
  }
}

// ── Reading a submission ─────────────────────────────────────────────────────

// Slack nests submitted values as state.values[block_id][action_id]. Flatten to
// { block_id: string } so grading reads plainly.
export function readSubmission(view) {
  const values = view?.state?.values || {};
  const out = {};
  for (const [blockId, actions] of Object.entries(values)) {
    const action = actions?.value;
    if (!action) continue;
    if (action.type === 'plain_text_input') out[blockId] = action.value ?? '';
    else if (action.selected_option) out[blockId] = action.selected_option.value;
  }
  return out;
}

// Two items given the same position in an `order` activity. Slack can't enforce
// uniqueness across selects, and it's an easy slip to make.
//
// This deliberately does NOT block the submission. Rejecting a view has to happen
// within Slack's 3-second window, and getting there would mean a storage read before
// responding — a timeout would show the learner a Slack error for what is really just
// a wrong answer. Duplicated positions ARE an incorrect ordering, so it grades as
// wrong and this note explains why.
export function duplicatePositionNote(submission) {
  const values = Object.entries(submission)
    .filter(([k]) => k.startsWith('order_'))
    .map(([, v]) => v);
  const hasDuplicate = new Set(values).size !== values.length;
  return hasDuplicate
    ? "Heads up: you gave two items the same position, so at least one had to be wrong."
    : null;
}

// ── Grading ──────────────────────────────────────────────────────────────────
// Returns { passed, feedback, score? }. `feedback` is mrkdwn shown in the DM.
// `revealAnswers` is true on the final attempt, where the learner has no try left
// and should be told the right answer rather than left guessing.

function wrongCountFeedback(wrong, total, revealAnswers, reveal) {
  if (wrong === 0) return 'All correct. 🎯';
  const lead = `${wrong} of ${total} ${wrong === 1 ? 'is' : 'are'} not right yet.`;
  return revealAnswers ? `${lead}\n\n*The correct answers:*\n${reveal}` : lead;
}

export async function gradeActivity(step, submission, { attemptNumber = 1 } = {}) {
  const type = step?.activityType;
  const a = step?.activity || {};
  const isFinalAttempt = attemptNumber >= MAX_ATTEMPTS;

  switch (type) {
    case 'mcq': {
      const chosen = Number(submission.mcq);
      const correct = Number(a.correctIndex);
      const passed = chosen === correct;
      const perOption = Array.isArray(a.optionFeedback) ? a.optionFeedback[chosen] : null;
      const feedback = [
        passed ? '*Correct.* ✅' : '*Not quite.*',
        perOption || null,
        (passed || isFinalAttempt) && a.explanation ? toMrkdwn(a.explanation) : null,
        !passed && isFinalAttempt && a.options?.[correct]
          ? `The right answer was: *${clamp(a.options[correct], 300)}*`
          : null,
      ].filter(Boolean).join('\n\n');
      return { passed, feedback };
    }

    case 'scenario': {
      const chosen = Number(submission.scenario);
      const choice = (a.choices || [])[chosen];
      const passed = Boolean(choice?.correct);
      const right = (a.choices || []).find((c) => c?.correct);
      const feedback = [
        passed ? '*Good call.* ✅' : '*Not the best option.*',
        choice?.feedback ? toMrkdwn(choice.feedback) : null,
        !passed && isFinalAttempt && right?.text
          ? `The strongest choice was: *${clamp(right.text, 300)}*${right.feedback ? `\n${toMrkdwn(right.feedback)}` : ''}`
          : null,
      ].filter(Boolean).join('\n\n');
      return { passed, feedback };
    }

    case 'match': {
      const pairs = (a.pairs || []).filter((p) => p?.left && p?.right).slice(0, 5);
      let wrong = 0;
      pairs.forEach((_, i) => {
        if (Number(submission[`match_${i}`]) !== i) wrong += 1;
      });
      const reveal = pairs.map((p) => `• *${p.left}* → ${p.right}`).join('\n');
      return {
        passed: wrong === 0,
        feedback: wrongCountFeedback(wrong, pairs.length, isFinalAttempt, reveal),
      };
    }

    case 'categorize': {
      const buckets = (a.buckets || []).filter(Boolean).slice(0, 5);
      const items = (a.items || []).filter((it) => it?.text).slice(0, 8);
      let wrong = 0;
      items.forEach((item, i) => {
        const chosen = buckets[Number(submission[`cat_${i}`])];
        if (chosen !== item.bucket) wrong += 1;
      });
      const reveal = items.map((it) => `• *${it.text}* → ${it.bucket}`).join('\n');
      return {
        passed: wrong === 0,
        feedback: wrongCountFeedback(wrong, items.length, isFinalAttempt, reveal),
      };
    }

    case 'order': {
      const items = (a.items || []).filter(Boolean).slice(0, 6);
      let wrong = 0;
      items.forEach((_, i) => {
        if (Number(submission[`order_${i}`]) !== i) wrong += 1;
      });
      const reveal = items.map((text, i) => `${i + 1}. ${text}`).join('\n');
      const dupNote = duplicatePositionNote(submission);
      return {
        passed: wrong === 0,
        feedback: [
          wrongCountFeedback(wrong, items.length, isFinalAttempt, reveal),
          dupNote,
        ].filter(Boolean).join('\n\n'),
      };
    }

    case 'write': {
      const passScore = a.passScore ?? 70;
      const grade = await gradeWriting({
        message: submission.write || '',
        sourceText: a.instructions,
        gradingCriteria: a.gradingCriteria,
      });
      const passed = (grade.score || 0) >= passScore;
      const feedback = [
        `*Score: ${grade.score}/100* ${passed ? '— nice work. ✅' : `(you need ${passScore})`}`,
        grade.strength ? `👍 ${grade.strength}` : null,
        grade.improvement ? `🔧 ${grade.improvement}` : null,
      ].filter(Boolean).join('\n');
      return { passed, feedback, score: grade.score };
    }

    default:
      // An unrenderable activity shouldn't block the lesson: treat it as passed
      // rather than trapping the learner on a step Slack can't ask.
      return { passed: true, feedback: 'Skipping this one — it does not fit in Slack.' };
  }
}
