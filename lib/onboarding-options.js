// Shared role/experience options used by both onboarding and the My Role editor,
// so the two stay in sync.

export const TIERS = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱', description: "I'm new to AI — not sure where to start" },
  { id: 'practitioner', label: 'Practitioner', emoji: '🚀', description: "I've used Gemini or similar AI tools a few times" },
  { id: 'power_user', label: 'Power User', emoji: '⚡', description: 'I use AI regularly in my work' },
  { id: 'builder', label: 'Builder', emoji: '🏗️', description: 'I build workflows and automations with AI' },
  { id: 'developer', label: 'Developer', emoji: '🛠️', description: 'I write code with AI and build AI-powered tools' },
];

export const GOALS = [
  'Confidently use AI for everyday tasks',
  'Integrate AI into my daily workflow',
  'Master advanced prompting & workflows',
  'Build agents and automations',
  'Use AI for coding and apps',
  "Explore what's possible",
];
