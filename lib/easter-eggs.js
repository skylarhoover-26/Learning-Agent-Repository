// The easter egg key — the single source of truth for every hidden capybara.
//
// An easter egg nobody can find on purpose is an easter egg nobody can QA,
// support, or turn off. So every one gets an entry here the moment it ships,
// with the exact steps to reproduce it. /admin/easter-eggs renders this list.
//
// Adding one: add the entry, set `status: 'live'` only once it is actually
// placed and deployed, and keep `trigger` literal enough that someone else can
// follow it without reading the code.
//
// Deliberately NOT placed anywhere: the calibration gate and the
// assessment/quiz flow. Those are the two surfaces where a learner is being
// measured, and a cartoon undercuts them.

export const EGG_RARITY = {
  earned: {
    label: 'Earned',
    hint: 'Only appears when the learner hits the milestone. Most people see it once.',
  },
  empty: {
    label: 'Empty state',
    hint: 'Appears when a surface has nothing to show yet.',
  },
  error: {
    label: 'Failure state',
    hint: 'Appears when something has gone wrong.',
  },
  rare: {
    label: 'Random',
    hint: 'Rolls a chance on load, so it stays a surprise.',
  },
  hidden: {
    label: 'Hidden input',
    hint: 'Requires a deliberate secret action. Nobody finds it by accident.',
  },
};

export const EASTER_EGGS = [
  {
    id: 'levelup-badge-holder',
    name: 'Capybara holds your new badge',
    capy: 'graduate',
    where: 'Level Up modal — top-left corner of the card',
    trigger:
      'Level up into a level that unlocks a badge or an avatar item. To see it without earning the XP, open /admin/levelup-preview and play the "LV 5 · badge + unlock" preset.',
    rarity: 'earned',
    status: 'live',
    tryHref: '/admin/levelup-preview',
    tryLabel: 'Play it in Level Up Preview',
    note: 'Wears the mortarboard and holds the badge when a badge was earned; plain and pleased when only an avatar item unlocked. A level that unlocks nothing shows the "what\'s next" teaser and gets no capybara — celebrating nothing is worse than no easter egg.',
  },
  {
    id: 'streak-hot-spring',
    name: 'Hot spring capybara',
    capy: 'hotspring',
    where: 'Streak card',
    trigger: 'Reach a 7-day streak.',
    rarity: 'earned',
    status: 'planned',
  },
  {
    id: 'streak-crown',
    name: 'Crowned capybara',
    capy: 'crown',
    where: 'Streak card',
    trigger: 'Reach a 30-day streak.',
    rarity: 'earned',
    status: 'planned',
  },
  {
    id: 'library-empty',
    name: 'Sleeping capybara, empty library',
    capy: 'sleeping',
    where: 'Library',
    trigger: 'Open the Library with no saved lessons.',
    rarity: 'empty',
    status: 'planned',
  },
  {
    id: 'feedback-queue-clear',
    name: 'Sleeping capybara, queue clear',
    capy: 'sleeping',
    where: 'Admin → Feedback',
    trigger: 'Open a Feedback tab with zero items in it.',
    rarity: 'empty',
    status: 'planned',
    note: 'Admin-only, so it is a safe place to try the art on real users of one.',
  },
  {
    id: 'game-perfect-score',
    name: 'Sunglasses capybara',
    capy: 'shades',
    where: 'Games results screen',
    trigger: 'Finish any game with a 100% score.',
    rarity: 'earned',
    status: 'planned',
  },
  {
    id: 'leaderboard-top',
    name: 'Trophy capybara',
    capy: 'trophy',
    where: 'Leaderboard podium',
    trigger: 'Sit in first place on the podium.',
    rarity: 'earned',
    status: 'planned',
  },
  {
    id: 'emblem-click',
    name: 'Capybara drifts past',
    capy: 'boba',
    where: 'Header bar (AILC emblem)',
    trigger: 'Click the emblem in the top bar 5 times in a row.',
    rarity: 'hidden',
    status: 'planned',
    note: 'Floats across the bottom of the viewport once, then leaves. No state, no persistence.',
  },
  {
    id: 'error-boundary',
    name: 'Unplugged capybara',
    capy: 'unplugged',
    where: '404 page and error boundary',
    trigger: 'Hit a bad URL, or trip a client-side render error.',
    rarity: 'error',
    status: 'planned',
    note: 'Also the friendliest cover we have for the React #185-class failures.',
  },
  {
    id: 'lesson-gen-wait',
    name: 'Capybara at a laptop, working',
    capy: 'laptop',
    where: 'Lesson generation loading state',
    trigger: 'Occasionally replaces the book loader while a lesson generates.',
    rarity: 'rare',
    status: 'planned',
    note: 'Lesson gen is the longest wait in the app, which makes it the best place to spend a smile.',
  },
  {
    id: 'slack-coach',
    name: 'Headset capybara',
    capy: 'headset',
    where: 'Slack coaching DM',
    trigger: 'Occasionally attached to a daily-pick message.',
    rarity: 'rare',
    status: 'planned',
    note: 'Not every day. A mascot on every message stops being an easter egg.',
  },
];

export function eggsByStatus(status) {
  return EASTER_EGGS.filter((e) => e.status === status);
}
