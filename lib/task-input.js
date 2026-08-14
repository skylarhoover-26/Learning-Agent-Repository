// Shared logic for the "add your own task" input that appears on four screens:
// onboarding step 2, /my-tasks, /my-goals and the role manager card on /profile.
//
// All four used to do `if (trimmed && !tasks.includes(trimmed))` inline, which
// meant an exact duplicate hit a silent dead end — the Add button did nothing,
// the text stayed put, and nothing said why. That reads as "the app won't let me
// type this", especially when the existing copy is scrolled out of view.
//
// Nothing here filters tasks on *content*. Any phrasing is valid, tool names
// included ("Using Claude Code to draft release notes"). The only thing that
// stops an add is a task the learner already has.

// Compare tasks the way a person would: case and inner spacing don't make two
// tasks different, so "Using Claude Code  To Draft Notes" matches
// "using claude code to draft notes" instead of quietly becoming a second copy.
export function normalizeTaskText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function findMatch(list, key) {
  return (list || []).find(task => normalizeTaskText(task) === key) || null;
}

/**
 * Work out what adding `typed` to the learner's task list should do.
 *
 * Pure — returns a new array, never mutates `selected`.
 *
 * @param {object}   input
 * @param {string}   input.typed     raw text from the input
 * @param {string[]} input.selected  tasks the learner has chosen
 * @param {string[]} input.available the department/sub-team task list, if any
 * @returns {{status: 'empty'|'added'|'selected'|'duplicate', tasks: string[], match: string|null}}
 *   empty     — nothing typed; leave everything alone
 *   added     — brand new task, appended
 *   selected  — it was already an option on this screen, so that option got
 *               ticked (keeps one canonical string instead of a near-copy)
 *   duplicate — they already have this one; `match` is the existing wording
 */
export function resolveTaskAdd({ typed, selected = [], available = [] }) {
  const trimmed = String(typed || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { status: 'empty', tasks: selected, match: null };

  const key = normalizeTaskText(trimmed);

  const alreadyChosen = findMatch(selected, key);
  if (alreadyChosen) {
    return { status: 'duplicate', tasks: selected, match: alreadyChosen };
  }

  const onOfferedList = findMatch(available, key);
  if (onOfferedList) {
    return { status: 'selected', tasks: [...selected, onOfferedList], match: onOfferedList };
  }

  return { status: 'added', tasks: [...selected, trimmed], match: trimmed };
}

// The line shown under the input. `null` when there is nothing to say.
export function taskNoticeText(notice) {
  if (!notice?.task) return null;
  if (notice.kind === 'duplicate') {
    return `"${notice.task}" is already on your list — edit the wording to add a different task.`;
  }
  if (notice.kind === 'selected') {
    return `"${notice.task}" was already an option here, so we ticked it for you.`;
  }
  return null;
}
