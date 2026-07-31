// The client-safe half of the "skill is worth a refresh" feature (#54).
//
// Kept separate from lib/skill-staleness.js on purpose: that module imports the
// Anthropic SDK to classify news, which drags Node built-ins into whatever
// imports it. The heatmap is a client component, so it needs a pure module —
// importing the server one broke the build with an unhandled `node:path` scheme.
//
// A mark looks like:
//   { skill, reason, headline, url, source, effective_at }
// where `effective_at` is the cutoff: you're out of date on that skill if you
// last studied it BEFORE this date.

// Given the live marks, return a { [skillName]: mark } map of the skills this
// learner studied before the relevant release. A skill they've never touched
// isn't "out of date" — it's just unlearned, which the heatmap already shows.
export function applyStaleMarks(skills, marks) {
  if (!marks?.length) return {};
  const bySkill = new Map(marks.map((m) => [m.skill, m]));
  const out = {};
  for (const skill of skills || []) {
    const mark = bySkill.get(skill.name);
    if (!mark || !skill.hasActivity || !skill.lastStudied) continue;
    if (new Date(skill.lastStudied) < new Date(mark.effective_at)) {
      out[skill.name] = mark;
    }
  }
  return out;
}
