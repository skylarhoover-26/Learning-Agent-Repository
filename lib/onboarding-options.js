// Shared role/experience options used by both onboarding and the My Role editor,
// so the two stay in sync.

// Descriptions are ordered by how OFTEN you use AI, so the choice is obvious:
// never → tried a few times → most days → building with it → coding with it.
export const TIERS = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱', description: "New to AI. I haven't really used it yet." },
  { id: 'practitioner', label: 'Practitioner', emoji: '🚀', description: "I've tried AI a few times, but not as part of my regular work." },
  { id: 'power_user', label: 'Power User', emoji: '⚡', description: 'I use AI most days to get real work done.' },
  { id: 'builder', label: 'Builder', emoji: '🏗️', description: 'I build workflows and automations with AI (no code needed).' },
  { id: 'developer', label: 'Developer', emoji: '🛠️', description: 'I write code with AI and build AI-powered tools.' },
];

export const GOALS = [
  'Confidently use AI for everyday tasks',
  'Integrate AI into my daily workflow',
  'Master advanced prompting & workflows',
  'Build agents and automations',
  'Use AI for coding and apps',
  "Explore what's possible",
];
