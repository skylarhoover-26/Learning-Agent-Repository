// Generic lesson topics, used in two places that both need them:
//
//   1. The lesson picker, if personalized generation FAILS — six real topics beat
//      an empty grid.
//   2. generateSuggestedTopics, to top the list back up to six after topics the
//      learner has already completed are filtered out.
//
// Kept in lib (not in the page) so the server-side top-up and the client-side
// fallback can't drift into two different lists.
//
// Deliberately broad and role-neutral: these only appear when we have nothing
// better, so they must make sense for anyone in any department.
export const FALLBACK_TOPICS = [
  { emoji: '🎯', label: 'Prompt Basics', topic: 'How to write clear, specific prompts that get useful results' },
  { emoji: '🧵', label: 'AI for Slack', topic: 'Using AI to draft, summarize, and respond to Slack messages and threads faster' },
  { emoji: '📊', label: 'Data Summaries', topic: 'Turning raw data and notes into executive-ready summaries' },
  { emoji: '🤖', label: 'What Are AI Agents?', topic: 'Understanding AI agents and how they can automate multi-step workflows' },
  { emoji: '✅', label: 'Verifying AI Output', topic: 'How to fact-check and validate AI-generated content before using it' },
  { emoji: '💬', label: 'Better Conversations', topic: 'How to have productive back-and-forth conversations with AI assistants' },
];
