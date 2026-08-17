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
  // Gemini's PRODUCT feed, added 2026-08-17. Google DeepMind above is the research
  // blog; this is where Gemini feature and model changes land, which is what an
  // ordinary employee using Gemini actually needs. 20 dated items on test.
  { name: 'Google Gemini', url: 'https://blog.google/products/gemini/rss/' },
  // Anthropic STILL publishes no RSS. Re-tested 2026-08-17: /news/rss.xml,
  // /blog/rss.xml, /rss.xml, /feed.xml, /index.xml, /engineering/rss.xml,
  // anthropic.com/rss, docs.anthropic.com/rss.xml and
  // docs.claude.com/en/release-notes/rss.xml all 404. docs.claude.com/rss.xml
  // returns 200 but parses to zero items, which is the failure mode this file
  // warns about.
  //
  // This is the biggest gap in the list, because Claude is the most-used tool in
  // the org: Claude, Claude Code and Claude Cowork are three of the eleven
  // catalog tools and none of them has a first-party source. Their news arrives
  // secondhand via The Verge / VentureBeat / MIT TR below, which is why a
  // Claude-only user rarely sees anything in "Changes your work".
  //
  // REJECTED alternatives, all of which do return items:
  //   status.anthropic.com/history.rss — outage notices ("Degraded performance
  //     for Claude Opus 5"). Real, but an ops feed, not "what changed for your
  //     work", and it would put incidents in a learning surface.
  //   github.com/anthropics/claude-code/releases.atom — titles are bare version
  //     numbers ("v2.1.234"). Same for the Python SDK and for n8n's releases.
  //     Nothing a non-engineer can read, and the categoriser has nothing to go on.

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
  // Tools in the catalog, added 2026-08-17. Every tool on /my-tools ought to have
  // a source, otherwise the feed structurally cannot produce a "changes your
  // work" item about the tools people actually chose. All three verified live
  // against lib/parse-feed.js on that date, item counts noted.
  { name: 'n8n blog', url: 'https://n8n.io/blog/rss/' },              // 15 dated items
  { name: 'Zapier blog', url: 'https://zapier.com/blog/feeds/latest/' }, // 25 dated items
  // GitHub Copilot's home. The ai-and-ml feed rather than the general changelog:
  // the changelog is mostly platform plumbing (OAuth redirect URIs and the like),
  // this one carries the Copilot and agent-workflow posts.
  { name: 'GitHub (AI)', url: 'https://github.blog/ai-and-ml/feed/' }, // 10 dated items
  //
  // STILL UNCOVERED, no feed exists: Vapi (vapi.ai/blog/rss.xml and
  // docs.vapi.ai/changelog/rss.xml both 404), ElevenLabs (blog/rss.xml,
  // blog/feed.xml, docs/changelog/rss.xml all 404), and LangSmith —
  // blog.langchain.dev/rss/ and changelog.langchain.com/feed both return 200 and
  // parse to ZERO items, so they are useless and would look healthy while
  // contributing nothing. Re-check these before assuming they are still dead.
  //
  // NOT added: openai.com/news/rss.xml. It returns 1132 items — the full archive —
  // and would crowd the 200-item findings cap on its own. The OpenAI blog feed
  // above already covers the same announcements.

  // Research
  { name: 'arXiv (cs.CL)', url: 'http://export.arxiv.org/rss/cs.CL' },
  { name: 'arXiv (cs.AI)', url: 'http://export.arxiv.org/rss/cs.AI' },

  // Community & safety
  { name: 'Hacker News (AI)', url: 'https://hnrss.org/newest?q=AI+OR+LLM&points=50' },
];

export { FEEDS };
