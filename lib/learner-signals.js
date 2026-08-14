// The four things a learner tells us about themselves, in one place.
//
//   tools    — what they work with (Claude, n8n, ChatGPT…)
//   tasks    — what they do day to day
//   goals    — what they want out of AI
//   projects — the real work in flight right now
//
// All four were collected at onboarding, but only tools and tasks ever reached
// the lesson generator: generateLessonPlan and generateTeachStep destructured
// `{ tier, department, top_tasks }` and nothing else, so goals shaped only which
// topics got *suggested*, and projects (stored separately as `work_projects`)
// were read by two components and no generator at all. Meanwhile onboarding
// promised "we'll tailor your lessons to all of them" and the projects page
// promised "every lesson will be tailored to what you're actually doing."
//
// This module is the single source of truth that makes those promises true, so
// lessons, teach steps, video scripts and games all weight the four signals the
// same way instead of each prompt site deciding for itself.
//
// Pure and dependency-light on purpose: imported by server generators (lib/ai.js)
// AND client surfaces (the Games page), so it must never pull in the Anthropic
// SDK or anything node-only.

import { cleanList, midSentence } from './discovery-examples';

// Projects are stored as [{ id, title, description, status }] under the
// `work_projects` user-data key. Only unfinished work is a useful signal — a
// shipped project is not what they need help applying AI to today.
export function activeProjects(profile) {
  const raw = Array.isArray(profile?.work_projects) ? profile.work_projects : [];
  return raw
    .filter((p) => p && p.status !== 'completed' && String(p.title || '').trim())
    .map((p) => ({
      title: String(p.title).trim(),
      description: String(p.description || '').trim(),
    }));
}

// Goals live in two shapes. Onboarding writes the `goals` ARRAY and keeps a
// joined `goal` string beside it for older read sites. Profiles created before
// that have only the string — several goals separated by "; " — and treating it
// as one goal produced run-on combos like "integrate AI into my daily workflow;
// Master advanced prompting & workflows, applied to training content creation".
// Split it back apart so every profile, new or old, yields real individual goals.
function readGoals(profile) {
  if (Array.isArray(profile?.goals) && profile.goals.length) return cleanList(profile.goals);
  const joined = typeof profile?.goal === 'string' ? profile.goal : '';
  return cleanList(joined.split(';'));
}

// The learner's four signals, normalized. `has` is false when we know so little
// that a prompt is better off saying nothing than saying something generic.
export function readSignals(profile) {
  const tasks = cleanList(profile?.top_tasks);
  const goals = readGoals(profile);
  const projects = activeProjects(profile);
  const department = String(profile?.department || '').trim();
  return {
    tasks,
    goals,
    projects,
    department,
    has: !!(tasks.length || goals.length || projects.length),
  };
}

// Pairings that carry more than either half alone. A goal on its own is often
// too vague to teach from ("Explore what's possible"), and a project on its own
// says nothing about which AI skill to bring — but crossed with a concrete task
// they name a real piece of work. Same reasoning as lib/game-topics.js, which
// has anchored goals to tasks since it was written.
//
// Index-rotated rather than fully crossed: two goals shouldn't both land on the
// learner's first task, or every "combined" angle reads as the same suggestion.
export function buildCombos(profile, limit = 4) {
  const { tasks, goals, projects } = readSignals(profile);
  const out = [];
  if (tasks.length) {
    goals.forEach((goal, i) => {
      out.push(`${midSentence(goal)}, applied to ${midSentence(tasks[i % tasks.length])}`);
    });
    projects.forEach((project, i) => {
      out.push(`using AI for ${midSentence(tasks[(i + 1) % tasks.length])} on ${project.title}`);
    });
  }
  // A project crossed with a goal needs no task to be concrete — the project
  // supplies the specifics.
  projects.forEach((project, i) => {
    if (goals.length) out.push(`${midSentence(goals[i % goals.length])}, on ${project.title}`);
  });
  return [...new Set(out)].slice(0, limit);
}

// Everything the learner has told us, as anchor phrases in a deliberate order:
// task, project, goal, task, project… so callers that walk the list (Today's
// Pick, "Surprise me") rotate across the signal TYPES instead of exhausting all
// the tasks before reaching a goal.
export function buildAnchors(profile) {
  const { tasks, goals, projects } = readSignals(profile);
  const lanes = [
    tasks.map((t) => ({ kind: 'task', phrase: midSentence(t), label: t })),
    projects.map((p) => ({ kind: 'project', phrase: p.title, label: p.title })),
    goals.map((g) => ({ kind: 'goal', phrase: midSentence(g), label: g })),
  ];
  const out = [];
  const depth = Math.max(...lanes.map((l) => l.length), 0);
  for (let i = 0; i < depth; i++) {
    for (const lane of lanes) if (lane[i]) out.push(lane[i]);
  }
  return out;
}

function projectLine(projects) {
  const shown = projects.slice(0, 3).map((p) => (
    p.description ? `${p.title} (${p.description})` : p.title
  ));
  return `- Real work they have in flight (their projects): ${shown.join('; ')}. Prefer one of these as the worked example over an invented scenario — this is the work they will apply the lesson to today.`;
}

/**
 * The prompt block every generator should use in place of a bare tasks line.
 *
 * Returns null when the learner has told us nothing usable, so callers can
 * `.filter(Boolean)` it out rather than pasting an empty heading into a prompt.
 *
 * @param {object} profile learner profile, ideally with `work_projects` attached
 * @returns {string|null}
 */
export function buildSignalBlock(profile) {
  const { tasks, goals, projects, department, has } = readSignals(profile);
  if (!has) return null;

  const combos = buildCombos(profile);

  return [
    'THEIR WORK — TASKS, GOALS AND PROJECTS CARRY EQUAL WEIGHT:',
    '- Use all three. Do NOT build the whole lesson on one of them and ignore the others, and do not treat goals as decoration — a lesson that never connects to what they are trying to achieve has missed half its job.',
    tasks.length
      ? `- Tasks they do day to day: ${tasks.join(', ')}. Ground the examples, prompts and activities in these — this is the work the lesson has to survive contact with.`
      : null,
    goals.length
      ? `- What they want out of AI (their goals): ${goals.join(', ')}. Say plainly, at least once, how what they are learning moves them toward one of these. Frame "why this matters" in these terms rather than in the abstract.`
      : null,
    projects.length ? projectLine(projects) : null,
    combos.length
      ? `- Combine them where it fits. Angles that are true for THIS learner: ${combos.map((c) => `"${c}"`).join('; ')}. Vary which pairing you use — don't hammer the same one every step.`
      : null,
    department ? `- They work in ${department}, so keep the vocabulary and stakes recognizable to that team.` : null,
  ].filter(Boolean).join('\n');
}

// A short, stable fingerprint of the four signals. Used as a cache key
// component so a pre-generated lesson is thrown away the moment someone edits
// their tools, tasks, goals or projects — otherwise "Today's Pick" keeps serving
// a lesson built from the profile they had this morning (it was keyed on
// date + topic + format only, and an edit doesn't change the topic).
//
// djb2 rather than a crypto hash: this runs on both sides of the wire and only
// needs to differ when the inputs differ.
export function signalSignature(profile) {
  const { tasks, goals, projects } = readSignals(profile);
  const tools = Array.isArray(profile?.preferred_tools)
    ? profile.preferred_tools.map((t) => (typeof t === 'string' ? t : t?.id || t?.label || '')) : [];
  const parts = [
    profile?.department || '',
    profile?.sub_team || '',
    profile?.tier || '',
    tools.join(','),
    tasks.join(','),
    goals.join(','),
    projects.map((p) => p.title).join(','),
  ].join('|').toLowerCase();

  let hash = 5381;
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) + hash + parts.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
