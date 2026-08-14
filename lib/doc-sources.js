// Which sites a lesson may be grounded in, and therefore cite.
//
// Grounding used to search the open web. The first grounded lesson came back
// citing rapiddevelopers.com — a third-party consultancy blog. Two problems with
// that: nobody here has any relationship with it, so we can't vouch for what it
// says, and a lesson that teaches from someone's marketing content inherits their
// mistakes and their agenda. Official documentation is the thing we actually want
// a lesson to agree with.
//
// So: vendor docs and official help centres, plus the vendors' OWN community
// forums and issue trackers. Community threads earn their place — the real answer
// to "why did my n8n AI node time out at 5 minutes" is often in the forum or the
// repo before it reaches the docs — but only on the vendor's own property, where
// the vendor moderates and the vendor's engineers answer.
//
// Passed to the web_search tool as `allowed_domains`, so the restriction happens
// at SEARCH time (the model can only read these) and is then re-checked on the way
// out in extractSources. Belt and braces: the search config and the citation
// filter read this same list, so they cannot disagree.
//
// Adding a domain: it must be run BY the vendor of a tool in lib/ai-tools.js (or a
// major model provider). If it's a blog, a tutorial site, an aggregator or a
// consultancy, the answer is no — however good the article is.

const DOC_DOMAINS = [
  // --- n8n (automation) ---
  'docs.n8n.io',
  'community.n8n.io',       // vendor-run forum; often ahead of the docs
  'n8n.io',                 // release notes / blog on the product site

  // --- LangSmith / LangChain (specialist: eval + tracing) ---
  'docs.smith.langchain.com',
  'docs.langchain.com',
  'python.langchain.com',
  'js.langchain.com',
  'changelog.langchain.com',
  'forum.langchain.com',

  // --- Anthropic (Claude, Claude Code, Claude Cowork) ---
  'docs.anthropic.com',
  'docs.claude.com',
  'support.anthropic.com',
  'claude.com',

  // --- OpenAI (ChatGPT) ---
  'platform.openai.com',
  'help.openai.com',
  'cookbook.openai.com',

  // --- Google (Gemini) ---
  'ai.google.dev',
  'cloud.google.com',
  'support.google.com',     // Gemini/Workspace help centre

  // --- Zapier (automation) ---
  'help.zapier.com',
  'docs.zapier.com',

  // --- Vapi (voice) ---
  'docs.vapi.ai',

  // --- ElevenLabs (voice) ---
  'elevenlabs.io',

  // --- Microsoft / GitHub Copilot ---
  'docs.github.com',
  'learn.microsoft.com',

  // Shared platform — allowed at search time, then narrowed by path below so we
  // only ever cite a VENDOR'S own repo, not any repo on GitHub.
  'github.com',
];

// Paths that are acceptable on shared platforms. Anything on these hosts that
// isn't listed here is dropped, so "github.com" doesn't quietly become "the whole
// of GitHub".
const PATH_RULES = {
  'github.com': [
    /^\/n8n-io\//i,
    /^\/langchain-ai\//i,
    /^\/anthropics\//i,
    /^\/openai\//i,
    /^\/elevenlabs\//i,
    /^\/microsoft\//i,
    /^\/features\/copilot/i,
    /^\/copilot/i,
  ],
};

// The list handed to the web_search tool. Domains only — no paths, which the API
// doesn't accept.
export function allowedSearchDomains() {
  return [...DOC_DOMAINS];
}

// Is this URL something we're willing to teach from and cite?
export function isApprovedSource(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  // Exact host, or a subdomain of an allowed host (docs.foo.com under foo.com).
  const matched = DOC_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
  if (!matched) return false;

  const rules = PATH_RULES[matched] || PATH_RULES[host];
  if (rules) return rules.some((re) => re.test(parsed.pathname));
  return true;
}
