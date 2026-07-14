// The company's AI competency scales (1-5). These are the rubric the AI uses to
// synthesize each AI Impact score, and the source of the "why" explanations. The
// 1-5 level names line up with SCORE_LABELS in scoring-store.js
// (1 Needs Improving → 5 Role Model).

export const AI_COMPETENCIES = {
  personal: {
    label: 'Personal Impact',
    summary: 'How much AI enhances your own productivity and output quality.',
    levels: {
      5: 'Role Model — Uses AI to significantly enhance personal productivity and output quality. Automates workflows, saves substantial time, and consistently delivers higher-impact results because of AI.',
      4: 'Often Exceeds — Regularly uses AI to improve efficiency and quality of work. Clearly saves time and enhances outcomes across multiple tasks.',
      3: 'Fully Successful — Uses AI for common tasks with some efficiency gains. Impact is noticeable but not consistently leveraged across all work.',
      2: 'Still Developing — Occasional or surface-level AI use. Minimal effect on productivity or work quality.',
      1: 'Needs Improving — Does not use AI, or usage has no meaningful effect on work output or efficiency.',
    },
  },
  team: {
    label: 'Team Impact',
    summary: 'How much you enable and coach your team to use AI effectively.',
    levels: {
      5: 'Role Model — Builds a strong AI-driven culture across the team. Coaches and enables direct reports to effectively use AI, leading to measurable improvements in team productivity, quality, and innovation.',
      4: 'Often Exceeds — Actively encourages and supports team adoption of AI. Helps direct reports apply AI in their work, resulting in clear improvements in efficiency and outcomes.',
      3: 'Fully Successful — Supports team use of AI at a basic level. Some team members use AI effectively, but adoption and impact are not yet consistent across the team.',
      2: 'Still Developing — Limited focus on enabling AI use within the team. Adoption is inconsistent or driven by individuals rather than manager support.',
      1: 'Needs Improving — Does not promote or support AI usage within the team. Little to no impact on team adoption or effectiveness with AI.',
    },
  },
  org: {
    label: 'Org Impact',
    summary: 'How much your AI use ties to departmental goals/OKRs and scales beyond you.',
    levels: {
      5: 'Role Model — Drives AI adoption at the department level aligned to OKRs. Establishes scalable practices, influences cross-team strategy, and delivers measurable impact against organizational goals.',
      4: 'Often Exceeds — Actively integrates AI into departmental workflows and OKRs. Contributes to broader initiatives and helps other teams adopt effective AI practices.',
      3: 'Fully Successful — Uses AI to support team or departmental OKRs. Impact is present but generally limited to their immediate scope rather than broadly scaled.',
      2: 'Still Developing — Limited connection between AI usage and departmental goals. Efforts are ad hoc and not clearly tied to OKRs or broader impact.',
      1: 'Needs Improving — Does not utilize AI in a way that supports departmental OKRs. No meaningful contribution to organizational AI adoption or outcomes.',
    },
  },
  development: {
    label: 'AI Development',
    summary: 'Depth of AI understanding, experimentation, and applying new techniques.',
    levels: {
      5: 'Role Model — Deep understanding of AI concepts and tools. Actively experiments with new models, techniques, or workflows and applies them effectively. Shares knowledge and influences how others use AI.',
      4: 'Often Exceeds — Strong working knowledge of AI tools and concepts. Regularly experiments and applies AI in meaningful ways. Comfortable adapting tools to different use cases.',
      3: 'Fully Successful — Solid baseline understanding. Uses AI tools effectively for common tasks and occasionally experiments. May rely on existing patterns rather than creating new ones.',
      2: 'Still Developing — Limited knowledge of AI concepts and tools. Some usage but minimal experimentation. Needs guidance to apply AI effectively.',
      1: 'Needs Improvement — Little to no understanding or usage of AI. Has not meaningfully engaged in experimentation or skill development.',
    },
  },
};

export const COMPETENCY_KEYS = Object.keys(AI_COMPETENCIES);

// Render one competency's full 1-5 rubric as text for an AI prompt.
export function rubricText(key) {
  const c = AI_COMPETENCIES[key];
  if (!c) return '';
  return [`${c.label} (${c.summary})`]
    .concat([5, 4, 3, 2, 1].map((n) => `  ${n}: ${c.levels[n]}`))
    .join('\n');
}
