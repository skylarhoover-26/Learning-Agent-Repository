// Pulling a JSON value out of a model response.
//
// WHY THIS EXISTS. Every generator in lib/ai.js asks the model for JSON and then
// does the same two-step: JSON.parse the whole reply, and if that throws, fall
// back to `text.match(/\{[\s\S]*\}/)`. That regex is GREEDY — it runs from the
// first "{" to the LAST "}" in the reply — so the moment a model emits anything
// besides one lone object, the fallback hands JSON.parse a string containing two
// objects glued together and the parse fails a second time.
//
// That is not hypothetical. On 2026-08-27 three of twelve production lesson-plan
// generations failed this exact way (feedback #232), each after burning all three
// server attempts — 133s, 184s and 204s — because retrying changes what the model
// SAYS but not how we read it. The audit entries all carried the signature error:
//
//   Unexpected non-whitespace character after JSON at position 231 (line 2 column 1)
//
// "position N, line 2 column 1" is the greedy regex admitting it: line 1 held a
// complete, valid object N characters long, and there was more JSON after it.
//
// WHAT THIS DOES INSTEAD. Scan for balanced, top-level JSON values — brace-aware
// and string-aware, so braces inside a string never confuse the depth count — and
// return them as separate candidates. A caller can then ask for the candidate it
// actually wants instead of hoping the first "{" and the last "}" belong together.
//
// Three shapes all become parseable:
//   1. One object, possibly wrapped in prose or ``` fences  → the only candidate.
//   2. Prose that happens to contain braces, then the object → the candidate that
//      satisfies the caller's `want` test wins.
//   3. Newline-separated fragments (JSONL) covering one object between them →
//      merged, in order, and re-tested.
//
// PURE MODULE — no imports, no I/O. Safe from client or server code.

// Strip the code fence a model adds despite being told not to.
function stripFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

// Every balanced top-level value of the given kind, in the order it appears.
//
// Depth counting only outside of strings: a lesson plan is full of prose that
// contains braces (prompt templates, "{{ $json.body }}", JSON taught as an
// example), and counting those would end a candidate in the wrong place.
function scanBalanced(text, open, close) {
  const out = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') { inString = true; continue; }
    if (ch === open) {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === close && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out;
}

function tryParse(candidate) {
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false, value: null };
  }
}

// Merge JSONL-style fragments into one object. Later fragments win on a key
// collision, which matches how a model that splits its answer across lines tends
// to write it: earlier lines are preamble, the real content comes after.
function mergeObjects(objects) {
  return objects.reduce((acc, o) => Object.assign(acc, o), {});
}

/**
 * Parse a JSON object out of a model reply.
 *
 * @param {string} raw   The reply text.
 * @param {object} [opts]
 * @param {(value: object) => boolean} [opts.want]
 *   "Is this the object I asked for?" Used to pick between candidates when the
 *   model emitted more than one. Defaults to "any object". Pass a real test
 *   (e.g. `p => p.objectives && p.steps`) whenever you know the shape — that is
 *   what lets a preamble object be skipped rather than returned as the answer.
 * @returns {object|null} The parsed object, or null when nothing matched.
 */
export function parseJsonObject(raw, { want } = {}) {
  const text = stripFences(raw);
  if (!text) return null;
  const matches = typeof want === 'function' ? want : () => true;

  // The happy path: the whole reply is the object, exactly as asked.
  const whole = tryParse(text);
  if (whole.ok && whole.value && typeof whole.value === 'object' && !Array.isArray(whole.value)) {
    if (matches(whole.value)) return whole.value;
  }

  const parsed = scanBalanced(text, '{', '}')
    .map(tryParse)
    .filter((r) => r.ok && r.value && typeof r.value === 'object' && !Array.isArray(r.value))
    .map((r) => r.value);

  if (!parsed.length) return null;

  const hit = parsed.find(matches);
  if (hit) return hit;

  // No single candidate is the answer, but together they may be — the JSONL
  // case, where the model wrote {"headline": ...} on one line and the rest of
  // the object on the next.
  if (parsed.length > 1) {
    const merged = mergeObjects(parsed);
    if (matches(merged)) return merged;
  }

  // Nothing satisfied the caller. Hand back the first object anyway ONLY when no
  // test was given; with a test, a wrong-shaped object is worse than null because
  // the caller would treat it as a real answer.
  return typeof want === 'function' ? null : parsed[0];
}

/**
 * Parse a JSON array out of a model reply. Same scan, different bracket.
 * Returns null when nothing parses (never a partial array).
 */
export function parseJsonArray(raw, { want } = {}) {
  const text = stripFences(raw);
  if (!text) return null;
  const matches = typeof want === 'function' ? want : () => true;

  const whole = tryParse(text);
  if (whole.ok && Array.isArray(whole.value) && matches(whole.value)) return whole.value;

  const parsed = scanBalanced(text, '[', ']')
    .map(tryParse)
    .filter((r) => r.ok && Array.isArray(r.value))
    .map((r) => r.value);

  if (!parsed.length) return null;
  return parsed.find(matches) || (typeof want === 'function' ? null : parsed[0]);
}

/**
 * A short, single-line, log-safe excerpt of a model reply.
 *
 * Feedback #232 sat unexplained through several rounds of timing fixes because
 * the failure was recorded as a parse-error message and nothing else — we could
 * infer the shape from the character offset but never actually see what the model
 * said. Every parse failure should carry one of these.
 */
export function describeRaw(raw, limit = 300) {
  const text = String(raw || '');
  const head = text.slice(0, limit).replace(/\s+/g, ' ').trim();
  return `len=${text.length} head="${head}${text.length > limit ? '…' : ''}"`;
}
