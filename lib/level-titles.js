// Level titles — the same for everyone, so "Level 7" is always the same name
// for every learner. Pure module (no deps) so it's safe on server or client.
//
// Tone rules: fun, a little silly, humble. NEVER ego-inflating words like
// "expert", "master", "guru", "pro", "genius". These are about being a curious
// learner, not a finished one.

const LEVEL_TITLES = [
  'AI Curious',          // 1
  'Prompt Sprout',       // 2
  'Button Pusher',       // 3
  'Chat Dabbler',        // 4
  'Prompt Tinkerer',     // 5
  'Idea Doodler',        // 6
  'Context Wrangler',    // 7
  'Token Nibbler',       // 8
  'Loop Explorer',       // 9
  'Workflow Whittler',   // 10
  'Prompt Whisperer',    // 11
  'Robot Wrangler',      // 12
  'Sidekick Summoner',   // 13
  'Automation Dabbler',  // 14
  'Pipeline Plumber',    // 15
  'Model Mingler',       // 16
  'Prompt Doodler',      // 17
  'Workflow Juggler',    // 18
  'Agent Herder',        // 19
  'Neural Navigator',    // 20
  'Prompt Picasso',      // 21
  'Context Cartographer',// 22
  'Hallucination Hunter',// 23
  'Token Tamer',         // 24
  'Flow Conductor',      // 25
  'Automation Alchemist',// 26
  'Prompt Philosopher',  // 27
  'Circuit Cruiser',     // 28
  'Vector Voyager',      // 29
  'AI Trailblazer',      // 30
];

function toRoman(num) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
    [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = num;
  let out = '';
  for (const [v, sym] of map) {
    while (n >= v) { out += sym; n -= v; }
  }
  return out;
}

// Returns the title for a level. Beyond the named list, the final title gains a
// prestige numeral ("AI Trailblazer II", "III", ...) — these are deep, grindy
// levels, so the numeral reads as a flex.
export function getLevelTitle(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  if (lvl <= LEVEL_TITLES.length) return LEVEL_TITLES[lvl - 1];
  const prestige = lvl - LEVEL_TITLES.length + 1; // 31 -> II, 32 -> III, ...
  return `${LEVEL_TITLES[LEVEL_TITLES.length - 1]} ${toRoman(prestige)}`;
}

export { LEVEL_TITLES };
