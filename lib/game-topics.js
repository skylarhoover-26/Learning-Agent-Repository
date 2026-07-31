// Topic starters for the "Surprise me" button on Games.
//
// These were five hardcoded strings — drafting customer follow-up emails,
// pricing quotes, dispatch schedules, invoice descriptions. Reasonable for a CSR
// or dispatcher and wrong for everyone else: an Enablement director pressing
// Surprise me got handed someone else's job.
//
// Same approach as lib/discovery-examples.js: build them from the tasks the
// learner entered at onboarding. Deterministic, so pressing the button is instant
// and can't invent work they don't do.
//
// Shape differs from the Discovery starters on purpose. Those are first-person
// descriptions of a working day ("I'm a X. My typical day: ..."), because they get
// fed to the opportunity finder. These are short topic phrases, because they get
// fed to a game generator as "your topic".

import { cleanList, midSentence } from './discovery-examples';

// Kept as the fallback for anyone without usable onboarding data.
export const GENERIC_GAME_TOPICS = [
  'using AI to draft customer follow-up emails',
  'spotting AI hallucinations in a pricing quote',
  'prompt patterns for summarizing long call notes',
  'evaluating AI output for a dispatch schedule',
  'writing better prompts for invoice descriptions',
];

// Each template turns one of the learner's real tasks into a game-sized topic.
// Kept varied in ANGLE (doing it, prompting for it, catching mistakes, checking
// output) so cycling through them doesn't feel like the same suggestion reworded.
const ANGLES = [
  (task) => `using AI for ${task}`,
  (task) => `prompt patterns for ${task}`,
  (task) => `spotting AI mistakes in ${task}`,
  (task) => `checking AI output before you ship it — ${task}`,
];

// Ordered angle-major on purpose: consecutive presses of "Surprise me" walk
// across the learner's DIFFERENT tasks before changing the phrasing, so the
// button surfaces more of their job rather than four rewordings of task one.
export function buildGameTopics(profile) {
  const tasks = cleanList(profile?.top_tasks).map(midSentence);
  if (!tasks.length) return GENERIC_GAME_TOPICS;

  const out = [];
  for (const angle of ANGLES) {
    for (const task of tasks.slice(0, 3)) out.push(angle(task));
  }

  const dept = (profile?.department || '').trim();
  if (dept) out.push(`where AI actually helps in ${dept}`);

  // De-dupe in case two tasks normalise to the same phrase.
  return [...new Set(out)];
}
