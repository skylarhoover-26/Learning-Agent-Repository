// The capybara poses, as data.
//
// Kept out of components/capybara.jsx so the admin key page and any placement
// can read the list without pulling in the drawing itself, and so adding a pose
// is a data edit plus one prop layer rather than a component rewrite.
//
// `prop` names a layer in the PROPS map in components/capybara.jsx; omit it for
// a pose that is only an expression change. `expression` is one of:
// default | happy | closed | worried.

export const CAPY_VARIANTS = {
  idle: {
    label: 'Capybara, unbothered',
    expression: 'default',
    note: 'The base animal. Nothing happening, and fine with it.',
  },
  happy: {
    label: 'Capybara, pleased',
    expression: 'happy',
    note: 'Same pose, eyes closed upward. For small wins.',
  },
  laptop: {
    label: 'Capybara at a laptop',
    expression: 'happy',
    prop: 'laptop',
    note: 'Doing the work. The prompting-is-not-scary pose.',
  },
  book: {
    label: 'Capybara reading',
    expression: 'default',
    prop: 'book',
    note: 'Studying. Pairs with lessons and the library.',
  },
  boba: {
    label: 'Capybara with boba',
    expression: 'happy',
    prop: 'boba',
    note: 'Taking a break. Good for idle and waiting states.',
  },
  sleeping: {
    label: 'Capybara asleep',
    expression: 'closed',
    prop: 'sleeping',
    note: 'Nothing here yet. The empty-state workhorse.',
  },
  orange: {
    label: 'Capybara with an orange on its head',
    expression: 'closed',
    prop: 'orange',
    note: 'The iconic one. Perfectly serene, fruit balanced on the skull.',
  },
  graduate: {
    label: 'Capybara graduating',
    expression: 'happy',
    prop: 'graduate',
    note: 'Finished something. Mortarboard and tassel.',
  },
  crown: {
    label: 'Capybara crowned',
    expression: 'happy',
    prop: 'crown',
    note: 'Top of the board, or a long streak held.',
  },
  shades: {
    label: 'Capybara in sunglasses',
    expression: 'default',
    prop: 'shades',
    note: 'Nailed it without breaking a sweat. For perfect scores.',
  },
  hotspring: {
    label: 'Capybara in a hot spring',
    expression: 'closed',
    prop: 'hotspring',
    note: 'The classic. Earned rest — streak milestones.',
  },
  unplugged: {
    label: 'Capybara holding a loose cable',
    expression: 'worried',
    prop: 'unplugged',
    note: 'Something broke. Softens 404s and error boundaries.',
  },
  trophy: {
    label: 'Capybara with a trophy',
    expression: 'happy',
    prop: 'trophy',
    note: 'Placed on the leaderboard.',
  },
  headset: {
    label: 'Capybara on a headset',
    expression: 'default',
    prop: 'headset',
    note: 'Coaching mode. For the Slack conversation surfaces.',
  },
};

export const CAPY_VARIANT_IDS = Object.keys(CAPY_VARIANTS);
