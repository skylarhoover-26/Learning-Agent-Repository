// Sources for the daily AI-news scan. Parsed by lib/parse-feed.js (RSS + Atom),
// then each headline is categorised by lib/news-relevance.js — being in this list
// only gets a source scanned, it does NOT get its items shown.
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

  // No Microsoft or Meta source. Their old AI blogs are retired (410/404), and
  // the live replacements — microsoft.com/research and engineering.fb.com — turned
  // out to publish almost nothing this audience can use: ads-ranking papers,
  // kernel schedulers, Rust crypto verification, weather models, AI-glasses
  // batteries. Both were dropped on 2026-07-30 after reviewing a day of their
  // actual output. A source that's alive isn't the same as a source that's useful.
  // If Microsoft/Meta coverage matters, find a PRODUCT feed (Copilot or Workspace
  // release notes), not an engineering or research blog.

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
