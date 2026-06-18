// Level titles — the same for everyone, so "Level 7" is always the same name
// for every learner. Pure module (no deps) so it's safe on server or client.
//
// Tone rules: fun, a little silly, humble. NEVER ego-inflating words like
// "expert", "master", "guru", "pro", "genius". These are about being a curious
// learner, not a finished one. Every level 1–100 gets its own unique name.

const LEVEL_TITLES = [
  'AI Curious',            // 1
  'Prompt Sprout',         // 2
  'Button Pusher',         // 3
  'Chat Dabbler',          // 4
  'Prompt Tinkerer',       // 5
  'Idea Doodler',          // 6
  'Context Wrangler',      // 7
  'Token Nibbler',         // 8
  'Loop Explorer',         // 9
  'Workflow Whittler',     // 10
  'Prompt Whisperer',      // 11
  'Robot Wrangler',        // 12
  'Sidekick Summoner',     // 13
  'Automation Dabbler',    // 14
  'Pipeline Plumber',      // 15
  'Model Mingler',         // 16
  'Prompt Doodler',        // 17
  'Workflow Juggler',      // 18
  'Agent Herder',          // 19
  'Neural Navigator',      // 20
  'Prompt Picasso',        // 21
  'Context Cartographer',  // 22
  'Hallucination Hunter',  // 23
  'Token Tamer',           // 24
  'Flow Conductor',        // 25
  'Automation Alchemist',  // 26
  'Prompt Philosopher',    // 27
  'Circuit Cruiser',       // 28
  'Vector Voyager',        // 29
  'AI Trailblazer',        // 30
  'Chatbot Charmer',       // 31
  'Syntax Sorcerer',       // 32
  'Pixel Prowler',         // 33
  'Daydream Debugger',     // 34
  'Widget Whittler',       // 35
  'Banter Botanist',       // 36
  'Cosmic Coder',          // 37
  'Prompt Pilot',          // 38
  'Gizmo Gadgeteer',       // 39
  'Algorithm Acrobat',     // 40
  'Meme Machinist',        // 41
  'Quirk Engineer',        // 42
  'Doodle Dynamo',         // 43
  'Sprocket Sprinter',     // 44
  'Nebula Navigator',      // 45
  'Bot Botanist',          // 46
  'Riddle Wrangler',       // 47
  'Spark Sculptor',        // 48
  'Lightbulb Llama',       // 49
  'Idea Igniter',          // 50
  'Prompt Pioneer',        // 51
  'Token Troubadour',      // 52
  'Circuit Whisperer',     // 53
  'Whimsy Wrangler',       // 54
  'Pixel Pilgrim',         // 55
  'Cosmic Cartographer',   // 56
  'Gadget Gardener',       // 57
  'Synapse Surfer',        // 58
  'Cloud Cowpoke',         // 59
  'Quantum Quokka',        // 60
  'Dapper Debugger',       // 61
  'Prompt Provocateur',    // 62
  'Robo Rancher',          // 63
  'Galaxy Gardener',       // 64
  'Doohickey Dreamer',     // 65
  'Glitch Gallivanter',    // 66
  'Marvel Mechanic',       // 67
  'Stardust Scripter',     // 68
  'Whirligig Wrangler',    // 69
  'Aurora Architect',      // 70
  'Bumblebot Buddy',       // 71
  'Comet Coder',           // 72
  'Tinker Titan',          // 73
  'Pixel Paladin',         // 74
  'Moonbeam Mechanic',     // 75
  'Prompt Prankster',      // 76
  'Zephyr Zookeeper',      // 77
  'Cosmic Cowboy',         // 78
  'Doodlebug Daredevil',   // 79
  'Llama Wrangler',        // 80
  'Quasar Captain',        // 81
  'Nimbus Nomad',          // 82
  'Wizard of Whims',       // 83
  'Gigabyte Goofball',     // 84
  'Stardust Sherpa',       // 85
  'Bot Whisperer Deluxe',  // 86
  'Cosmic Custodian',      // 87
  'Pixel Pathfinder',      // 88
  'Meme Magnate',          // 89
  'Galactic Gadabout',     // 90
  'Prompt Pendragon',      // 91
  'Nebula Knight',         // 92
  'Twinkle Technician',    // 93
  'Cosmic Cup-Holder',     // 94
  'Astro Apprentice',      // 95
  'Doodle Daydreamer',     // 96
  'Starlight Strategist',  // 97
  'Quantum Quester',       // 98
  'Cosmic Curiosity',      // 99
  'AI Folk Hero',          // 100
];

// Levels beyond 100 (basically unreachable — tens of millions of XP) cycle
// through a small set of legendary, still-silly names. No numerals.
const BEYOND_TITLES = [
  'AI Living Legend',
  'AI Mythic Marvel',
  'AI Cosmic Legend',
  'AI Starborn Dreamer',
  'AI Legendary Tinkerer',
  'AI Whimsical Wonder',
];

// Returns the title for a level.
export function getLevelTitle(level) {
  const lvl = Math.max(1, Math.floor(level || 1));
  if (lvl <= LEVEL_TITLES.length) return LEVEL_TITLES[lvl - 1];
  return BEYOND_TITLES[(lvl - LEVEL_TITLES.length - 1) % BEYOND_TITLES.length];
}

export { LEVEL_TITLES };
