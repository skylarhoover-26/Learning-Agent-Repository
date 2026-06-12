// Detects when a chat message is a "what is / how does / explain X" question,
// and extracts the topic so chat can offer to launch a lesson on it.

const LEADING_ARTICLES = /^(?:an?|the)\s+/i;
const PRONOUN_TOPICS = /^(it|this|that|these|those|you|i|we|they|he|she|him|her|them|us)$/i;
// Topics that begin with a pronoun ("I reset my password") are personal/task
// questions, not concepts worth a lesson.
const LEADING_PRONOUN = /^(i|you|we|they|he|she|it)\s+/i;

const PATTERNS = [
  // what is / what's / what are <topic>
  /^what(?:'s| is| are| was| were)\s+(.+?)\??$/i,
  // what does <topic> mean
  /^what does\s+(.+?)\s+mean\??$/i,
  // explain <topic> / can you explain <topic> / explain what <topic> is
  /^(?:can you |could you |please )?explain\s+(?:what\s+)?(.+?)(?:\s+(?:is|are|means?))?\??$/i,
  // tell me about <topic> / what do you know about <topic>
  /^(?:tell me about|what do you know about|i want to learn (?:more )?about|i'd like to learn about)\s+(.+?)\??$/i,
  // how does/do <topic> work
  /^how (?:do|does|can)\s+(.+?)\s+work\??$/i,
  // how does/do <topic> (general)
  /^how (?:do|does)\s+(.+?)\??$/i,
];

export function detectLessonTopic(text) {
  if (!text) return null;
  const t = text.trim();
  // Skip very long messages — those are usually statements/pastes, not questions.
  if (t.length > 120) return null;

  for (const re of PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      let topic = m[1].trim().replace(/[?.!,]+$/, '').replace(LEADING_ARTICLES, '').trim();
      if (topic.length < 3) return null;
      if (PRONOUN_TOPICS.test(topic)) return null;
      if (LEADING_PRONOUN.test(topic)) return null;
      // Keep it lesson-sized.
      if (topic.split(/\s+/).length > 10) return null;
      return topic;
    }
  }
  return null;
}
