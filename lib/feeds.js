// Sources for the daily AI-news scan. Parsed by lib/parse-feed.js (RSS + Atom).
//
// Every URL here was verified live on 2026-07-30. Four previous entries were
// dead — Anthropic 404, Meta AI 404, Microsoft AI 410 Gone, Mistral 404 — and
// had been failing on every scan since whenever they broke.
//
// Before adding a feed, actually fetch it and confirm the parser returns items.
// A feed that 200s but yields nothing is worse than one that 404s: the scan's
// error list only reports non-200 responses, so an unparseable feed looks
// perfectly healthy while contributing nothing. That is exactly how The Verge
// (an Atom feed, against an RSS-only parser) went unnoticed.
const FEEDS = [
  // AI Labs
  { name: 'OpenAI blog', url: 'https://openai.com/blog/rss.xml' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Mistral AI', url: 'https://mistral.ai/rss.xml' },
  // Anthropic publishes no RSS — /news/rss.xml, /rss.xml, /feed.xml,
  // /index.xml and /engineering/rss.xml all 404 as of 2026-07-30. Their
  // announcements still come through The Verge / VentureBeat / MIT TR below.

  // Big tech (blogs.microsoft.com/ai and ai.meta.com/blog are both retired)
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/' },
  { name: 'Meta Engineering', url: 'https://engineering.fb.com/feed/' },

  // Industry & applied AI
  { name: 'MIT Tech Review (AI)', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { name: 'The Verge (AI)', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' }, // Atom
  { name: 'VentureBeat (AI)', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },

  // Research
  { name: 'arXiv (cs.CL)', url: 'http://export.arxiv.org/rss/cs.CL' },
  { name: 'arXiv (cs.AI)', url: 'http://export.arxiv.org/rss/cs.AI' },

  // Community & safety
  { name: 'Hacker News (AI)', url: 'https://hnrss.org/newest?q=AI+OR+LLM&points=50' },
];

export { FEEDS };
