// Shared audience framing for every generated game round.
//
// Two layers, deliberately kept apart: WHO is playing (HCP employees doing
// software-company work) vs WHAT HCP sells (software for home-service
// businesses). Collapsing them is how feedback #141 happened — the previous copy
// said "ground every scenario in THIS world: jobs, estimates, dispatch…" and the
// model started casting the player as a plumber ("What might a home services
// professional use to do evaluations on their AI tool?"). The terminology
// guardrail at the bottom is from feedback #67 (a Family Feud answer about
// "incorrect SKUs" — HCP has no SKUs), so keep both.

export const GAME_AUDIENCE = `AUDIENCE CONTEXT — this describes two different groups. Do not mix them up.

WHO IS PLAYING: employees of Housecall Pro (HCP), a software company. They are product managers, product marketers, engineers, designers, support/CX reps, sales reps, operations, enablement/L&D, finance, and data people. Their day-to-day work is software-company work: specs and tickets, launch and positioning, messaging, decks, help articles, campaigns, dashboards, customer calls, QBRs, hiring, training.

WHO HCP SELLS TO: home-service businesses (plumbing, HVAC, electrical, cleaning, landscaping, pest control). HCP's CUSTOMERS are contractors and their teams — owners, office/CSR staff, dispatchers, and technicians in the field. HCP builds field-service management software for them.

HOW TO USE THAT DISTINCTION:
- The person answering is ALWAYS the HCP employee. Never cast the player as a technician, plumber, contractor, dispatcher, or business owner, and never ask what a "home service professional" or "home services pro" would do — that person is not the one playing.
- Home services is legitimate SUBJECT MATTER whenever it is the OBJECT of the employee's work: drafting release notes for a dispatch feature, summarizing support tickets from HVAC customers, positioning invoicing for plumbers. That framing is good and encouraged.
- The AI skill being taught must be one the employee can apply to their OWN job that same day — not one their customer would apply.

TERMINOLOGY GUARDRAIL: never use retail, e-commerce, or manufacturing references that don't exist here — no "SKUs", inventory units, warehouses, or product catalogs.`;

// The player's own role, so a PMM gets launch/messaging scenarios and an
// engineer gets code-review ones. Reads the same profile fields the lesson
// prompts in lib/ai.js use. Returns generic-but-safe framing when the profile is
// thin (pre-onboarding, or a demo account).
export function playerRoleContext(profile) {
  const { department, sub_team, title, top_tasks } = profile || {};
  const tasks = Array.isArray(top_tasks) && top_tasks.length ? top_tasks.slice(0, 5).join(', ') : null;
  const details = [
    title ? `- Their title: ${title}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasks ? `- Their day-to-day tasks: ${tasks}.` : null,
  ].filter(Boolean);

  if (!details.length) {
    return 'THIS PLAYER: no role details on file. Keep scenarios in general internal software-company work — writing, meetings, docs, spreadsheets, customer follow-ups. Still never the contractor persona.';
  }

  return [
    "THIS PLAYER — anchor every scenario, example, and answer in THIS person's actual work:",
    ...details,
    '- The questions should read like they were written for someone with this exact role. Teach the AI skill through their tasks, never through a customer\'s tasks.',
  ].join('\n');
}
