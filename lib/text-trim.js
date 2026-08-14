// Trimming long generated copy without leaving it mid-word.
//
// Its own module because BOTH the Slack copy builder and the model wrapper need
// it, and lib/daily-message-ai.js imports the Anthropic SDK — importing the helper
// from there would drag the SDK into anything that only wanted to trim a string.

// Feedback #213: "the sentence is being cut off for some reason". This was a plain
// why.slice(0, 260) — a hard character chop with no ellipsis, so a why that ran long
// arrived mid-word ("...before it reaches a custo") and looked broken in the DM.
//
// Cap by SENTENCE instead: keep whole sentences while they fit. Only if the very
// first sentence is already over the limit do we cut inside it, and then at a word
// boundary with an ellipsis, so the reader can see it was trimmed rather than
// wondering whether the bot crashed.
export function capSentences(text, limit) {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= limit) return trimmed;

  const sentences = trimmed.match(/[^.!?]+[.!?]*/g) || [trimmed];
  let out = '';
  for (const s of sentences) {
    const next = (out + s).trimEnd();
    if (next.length > limit) break;
    out = out + s;
  }
  out = out.trim();
  if (out) return out;

  // One very long sentence: cut at the last space before the limit.
  const hard = trimmed.slice(0, limit - 1);
  const lastSpace = hard.lastIndexOf(' ');
  return `${(lastSpace > 40 ? hard.slice(0, lastSpace) : hard).trimEnd()}…`;
}

