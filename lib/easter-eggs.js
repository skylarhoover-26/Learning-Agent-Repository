// The easter egg key — the single source of truth for every hidden capybara.
//
// An easter egg nobody can find on purpose is an easter egg nobody can QA,
// support, or turn off. So every one gets an entry here the moment it ships,
// with the exact steps to reproduce it. /admin/easter-eggs renders this list.
//
// SEEING a capybara does not collect it — you have to click it. Each first click
// pays 5 XP and writes a `capy_find` XP event (egg id in meta), so the count is
// durable, cross-device, and readable by the leaderboard and the admin tools.
// Collect every live one and you earn the capybara_collector badge, which is the
// only thing that unlocks the Capybara sidekick.
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
    id: 'tour-complete',
    name: 'The capybara in reading glasses',
    capy: 'scholar',
    where: 'Pop-up, bottom right, after finishing the guided tour',
    trigger: 'Finish the guided tour (Tour in the sidebar) all the way to the last step. Closing it early does not count.',
    rarity: 'earned',
    status: 'live',
    tryHref: '/',
    tryLabel: 'Run the tour from the sidebar',
    note: 'The only capybara that introduces itself. Since collecting now needs a deliberate click, somebody has to say so — this is that somebody, and clicking it is both the explanation and the first find.',
  },
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
    id: 'notifications-clear',
    name: 'Sleeping capybara, all caught up',
    capy: 'sleeping',
    where: 'Notification bell → empty',
    trigger: 'Open the bell in the top bar with nothing waiting in it.',
    rarity: 'empty',
    status: 'live',
    note: 'Replaces the admin-only version below. Everyone has an empty bell at some point, which is what the collection needs.',
  },
  {
    id: 'feedback-queue-clear',
    name: 'Sleeping capybara, queue clear',
    capy: 'sleeping',
    where: 'Admin → Feedback',
    trigger: 'Open a Feedback tab with zero items in it.',
    rarity: 'empty',
    status: 'live',
    collectable: false,
    tryHref: '/admin/feedback',
    tryLabel: 'Open Feedback',
    note: 'Decorative only — NOT part of the collection. Most people never open Admin, and an admin-only egg in the roster would make the sidekick permanently unobtainable for them.',
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
    collectable: false,
    note: 'Decorative only — NOT part of the collection. Exactly one person in the company can be #1 at a time, so requiring it would lock the sidekick for everybody else. It stays as a reward for holding the top spot, it just does not count toward the total.',
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
    where: 'Slack daily-pick DM — greeting thumbnail',
    trigger: 'Roughly one weekday in five. Seeded per person and per day, so it is not the same people every time.',
    rarity: 'rare',
    status: 'live',
    collectable: false,
    note: 'Decorative only — NOT part of the collection. Collecting needs a click in the app that writes to the XP ledger, and nothing tapped in a Slack message can do that. Served as a PNG from /brand/, which is already in the middleware exclusion list so Slack can fetch it without a session; no blob upload needed. Only the message composition changed — the send path, its allowlist and the day-claim guard were not touched.',
  },
];

export function eggsByStatus(status) {
  return EASTER_EGGS.filter((e) => e.status === status);
}

// The collection: collect all of these and you earn the capybara_collector
// badge, which is the only way to unlock the Capybara sidekick.
//
// Derived rather than hand-listed, so placing a new egg automatically raises the
// bar and retiring one automatically lowers it — a hardcoded roster would drift
// and either lock the sidekick forever or hand it out early.
//
// Two filters, and the second one matters more than it looks. `status === 'live'`
// is obvious: a planned egg is uncollectable. `collectable !== false` excludes
// eggs that SOME people can never reach — an admin-only surface, or a spot only
// one person in the company can occupy. Any of those in the roster makes the
// sidekick permanently unobtainable for everyone else, which is a silent, total
// failure of the reward. Decorative-only eggs still get an entry and still show
// in the key; they just don't count toward the total.
export const FINDABLE_EGG_IDS = EASTER_EGGS
  .filter((e) => e.status === 'live' && e.collectable !== false)
  .map((e) => e.id);

export const FINDABLE_EGG_COUNT = FINDABLE_EGG_IDS.length;

// Progress against the roster, from any iterable of collected egg ids. Takes the
// ids rather than a learner so it works on the server too — the leaderboard and
// the admin roll-up both call this with ids read from other people's ledgers.
export function collectionProgress(found) {
  const set = found instanceof Set ? found : new Set(found || []);
  const collected = FINDABLE_EGG_IDS.filter((id) => set.has(id));
  return {
    found: collected.length,
    total: FINDABLE_EGG_IDS.length,
    remaining: FINDABLE_EGG_IDS.filter((id) => !set.has(id)),
    complete: FINDABLE_EGG_IDS.length > 0 && collected.length === FINDABLE_EGG_IDS.length,
  };
}
