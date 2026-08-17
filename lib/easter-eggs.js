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
    where: 'Home → Current Streak card',
    trigger: 'Hold a 7-day streak. Sits in the card\'s bottom-right corner.',
    rarity: 'earned',
    status: 'live',
  },
  {
    id: 'streak-crown',
    name: 'Crowned capybara',
    capy: 'crown',
    where: 'Home → Current Streak card',
    trigger: 'Hold a 30-day streak. Replaces the hot spring one from day 30 on.',
    rarity: 'earned',
    status: 'live',
  },
  {
    id: 'library-empty',
    name: 'Sleeping capybara, nothing matched',
    capy: 'sleeping',
    where: 'Library → no results',
    trigger: 'Filter or search the Library until nothing matches.',
    rarity: 'empty',
    status: 'live',
    note: 'Originally specced as "the Library with no saved lessons" — the Library is a use-case catalog, so that state does not exist. The no-results state is the real dead end.',
  },
  {
    id: 'feedback-queue-clear',
    name: 'Sleeping capybara, queue clear',
    capy: 'sleeping',
    where: 'Admin → Feedback',
    trigger: 'Open a Feedback tab with zero items in it.',
    rarity: 'empty',
    status: 'live',
    tryHref: '/admin/feedback',
    tryLabel: 'Open Feedback',
    note: 'Admin-only, so it is a safe place to try the art on real users of one.',
  },
  {
    id: 'game-perfect-score',
    name: 'Sunglasses capybara',
    capy: 'shades',
    where: 'XP toast, after any game',
    trigger: 'Finish any of the 12 games with a 100% score.',
    rarity: 'earned',
    status: 'live',
    note: 'Flagged in lib/game-store.js, the one path every game already funnels through, so all 12 are covered without touching a single game page. If the perfect run also levels you up, the Level Up modal takes over instead — one celebration per action.',
  },
  {
    id: 'leaderboard-top',
    name: 'Trophy capybara',
    capy: 'trophy',
    where: 'Leaderboard → your own #1 pedestal',
    trigger: 'Be in first place with XP on the board. Shows on YOUR spot only, not on whoever happens to be #1.',
    rarity: 'earned',
    status: 'live',
  },
  {
    id: 'bookworm-badge',
    name: 'Reading capybara',
    capy: 'book',
    where: 'Achievements → Bookworm badge',
    trigger: 'Earn the Bookworm badge by completing 10 lessons.',
    rarity: 'earned',
    status: 'live',
    tryHref: '/achievements',
    tryLabel: 'Open Achievements',
    note: 'Only on the earned card. The locked version is greyscaled, and a grey capybara is just a smudge.',
  },
  {
    id: 'todays-pick-orange',
    name: 'Capybara with an orange on its head',
    capy: 'orange',
    where: "Home → Today's Pick card",
    trigger: 'Roughly one content day in five. Seeded off the day, so it holds still all day and rotates at 8 AM PT.',
    rarity: 'rare',
    status: 'live',
  },
  {
    id: 'emblem-click',
    name: 'Capybara drifts past',
    capy: 'boba',
    where: 'Top bar (AILC emblem)',
    trigger: 'Click the AI Learning Coach emblem 5 times quickly (within ~1.2s of each other).',
    rarity: 'hidden',
    status: 'live',
    note: 'Drifts across the bottom of the viewport once, then leaves. Navigation is not blocked — the emblem still goes home, which is its actual job.',
  },
  {
    id: 'error-boundary',
    name: 'Unplugged capybara',
    capy: 'unplugged',
    where: '404 page and error boundary',
    trigger: 'Hit a bad URL, or trip a client-side render error.',
    rarity: 'error',
    status: 'live',
    note: 'There was no 404 page at all before this. On the error boundary the wrapper is inline-styled, so the capybara still shows if the failure took the stylesheet with it.',
  },
  {
    id: 'lesson-gen-wait',
    name: 'Capybara at a laptop, working',
    capy: 'laptop',
    where: 'Lesson generation loading state',
    trigger: 'Roughly 1 in 4 lesson generations, replacing the book loader.',
    rarity: 'rare',
    status: 'live',
    note: 'Opt-in per call site, so it never appears on plumbing waits like "Checking admin access...". Lesson gen is the longest wait in the app, which makes it the best place to spend a smile.',
  },
  {
    id: 'slack-coach',
    name: 'Headset capybara',
    capy: 'headset',
    where: 'Slack coaching DM',
    trigger: 'Occasionally attached to a daily-pick message.',
    rarity: 'rare',
    status: 'planned',
    note: 'NOT a UI placement: Slack cannot render inline SVG, so this needs a PNG export hosted in blob storage and a change to the daily-pick send path — which has a fail-closed allowlist and a known n8n double-send trap. Deliberately left for its own pass.',
  },
];

export function eggsByStatus(status) {
  return EASTER_EGGS.filter((e) => e.status === status);
}
