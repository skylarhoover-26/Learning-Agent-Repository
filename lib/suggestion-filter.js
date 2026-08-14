// Enforcement for "don't suggest a lesson I already took".
//
// buildSuggestedTopicsPrompt ASKS the model to skip completed lessons. This makes
// it true, because "usually doesn't repeat" is not good enough for the one list a
// learner sees on every visit — being offered a lesson you just finished is the
// clearest possible signal that nothing is paying attention.
//
// Split out of lib/ai.js so it can be tested without pulling in the Anthropic SDK.

import { normalizeTaskText } from './task-input';
import { FALLBACK_TOPICS } from './fallback-topics';

/**
 * Drop suggestions the learner has already completed, and any duplicates within
 * the batch.
 *
 * Exact match (case and spacing insensitive) on either the label or the topic
 * sentence — NOT substring. "Prompt Basics" appears inside plenty of legitimately
 * different topics, and over-filtering would empty the list.
 *
 * @param {Array<{emoji?: string, label?: string, topic?: string}>} suggestions
 * @param {string[]} exclude  topics of recently completed lessons
 */
export function withoutCompleted(suggestions, exclude) {
  const done = new Set((exclude || []).filter(Boolean).map(normalizeTaskText));
  const seen = new Set();
  return (Array.isArray(suggestions) ? suggestions : []).filter((s) => {
    const label = normalizeTaskText(s?.label);
    const topic = normalizeTaskText(s?.topic);
    if (!label && !topic) return false;
    if (done.has(label) || done.has(topic)) return false;
    // A model asked for six can hand back two rewordings of one idea.
    const key = topic || label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The final six: everything that survived the filter, topped up from the generic
 * list if filtering left a short list. Rendering four cards would look broken, and
 * the padding runs through the same filter so a generic topic they've already
 * taken can't sneak in the back door.
 */
export function fillSuggestions(suggestions, exclude, size = 6) {
  const kept = withoutCompleted(suggestions, exclude);
  if (kept.length >= size) return kept.slice(0, size);
  const padding = withoutCompleted(FALLBACK_TOPICS, exclude)
    .filter((f) => !kept.some((k) => normalizeTaskText(k.topic) === normalizeTaskText(f.topic)));
  return [...kept, ...padding].slice(0, size);
}
