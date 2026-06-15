// Single source of truth for the Claude model ids used across the app. When a
// model is deprecated, update it here only.
//
// - sonnet: balanced quality for learner-facing generation (chat, lessons,
//   discover, quick-win, modules, games, the Slack bot).
// - haiku: fast/cheap for behind-the-scenes work (curriculum scanning &
//   proposals, daily-lesson generation, scoring).
export const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};
