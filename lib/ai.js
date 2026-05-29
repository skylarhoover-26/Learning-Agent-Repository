import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

let client;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export function buildChatSystemPrompt(learnerProfile) {
  const { display_name, department, sub_team, tier, goal } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';

  return [
    'You are a friendly, concise AI tutor on an internal learning platform.',
    'Rules:',
    '- Keep responses to 4-6 lines max.',
    '- Use **bold**, bullets, and `code` formatting for clarity.',
    '- No preambles like "Great question!" or "Sure thing!"',
    '- Be conversational and direct.',
    !isDevTier
      ? '- The learner is NOT a developer. Never suggest Python, terminal commands, or writing code. Focus on browser-based AI tools, prompting, and workflows.'
      : '- The learner is a developer. You may reference code, APIs, and technical concepts.',
    display_name ? `- The learner's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    goal ? `- Their learning goal: ${goal}` : null,
    '- When relevant, tie advice back to their role and goals.',
  ].filter(Boolean).join('\n');
}

export async function generateChatReply(messages, learnerProfile) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildChatSystemPrompt(learnerProfile),
      messages,
    });
    return response.content[0].text;
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to generate a reply. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

export function buildDiscoverSystemPrompt(learnerProfile) {
  const { display_name, department, sub_team, tier, goal } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';

  return [
    'You are an AI opportunity finder for a corporate learning platform.',
    'The user will describe their work. Return exactly 4-6 AI opportunities as a JSON array.',
    '',
    'Each object in the array MUST have these fields:',
    '- title (string): short name of the opportunity',
    '- description (string): 1-2 sentence explanation of what to do',
    '- icon (string): a single relevant emoji',
    '- difficulty (string): one of "easy", "medium", or "advanced"',
    '- category (string): one of "writing", "analysis", "meetings", "decisions", "communication", "automation"',
    '- timeSaved (string): estimated time saved, e.g. "15 min/meeting"',
    '- whyItHelps (string): personalized reason tied to what the user described',
    '- starterPrompt (string): an actual prompt they could paste into an AI tool to try this right now',
    '',
    'Rules:',
    '- Return ONLY the JSON array. No markdown fences, no explanation.',
    '- Make opportunities specific to the user\'s described work, not generic.',
    '- Order from easiest to hardest.',
    !isDevTier
      ? '- The user is NOT a developer. Never suggest coding, APIs, or terminal tools. Focus on browser-based AI (ChatGPT, Claude, Copilot, etc.).'
      : '- The user is a developer. You may include technical/code-based opportunities.',
    display_name ? `- The user's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

export async function generateDiscoverOpportunities(workDescription, learnerProfile) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: buildDiscoverSystemPrompt(learnerProfile),
      messages: [
        { role: 'user', content: `Here is a description of my work:\n\n${workDescription}` },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  } catch (error) {
    console.error('Discover API error:', error);
    throw new Error('Failed to find opportunities. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

const FORMAT_TOKENS = {
  quick_tip: 500,
  standard: 1200,
  deep_dive: 2000,
};

export function buildLessonSystemPrompt(topic, learnerProfile, options = {}) {
  const { display_name, department, sub_team, tier, goal } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';
  const format = options.format || 'standard';

  const formatGuide = {
    quick_tip: 'This is a Quick Tip (60 seconds). Give a single, actionable insight. No exercises. Go straight to the complete phase after the tip.',
    standard: 'This is a Quick Lesson (3-5 minutes). Walk through the topic with one hands-on exercise. Phases: intro -> steps -> practice -> complete.',
    deep_dive: 'This is a Deep Dive (15-20 minutes). Be thorough. Include setup, multiple steps, exercises, and evaluation. Phases: intro -> setup -> steps -> verify -> practice -> evaluate -> apply -> complete.',
  };

  return [
    `You are a hands-on AI tutor teaching a lesson on: "${topic}".`,
    'You teach by SHOWING HOW, not lecturing. Give concrete examples the learner can try immediately.',
    '',
    formatGuide[format] || formatGuide.standard,
    '',
    'Return your response as a single JSON object with these fields:',
    '- slideTitle (string): short title for this slide',
    '- message (string): your teaching content, using **bold**, bullets, and `code` formatting',
    '- keyPoints (array of strings): 2-4 key takeaways from this slide',
    '- phase (string): one of "intro", "setup", "steps", "verify", "practice", "evaluate", "apply", "complete"',
    '- buttons (array of objects): each has { label (string), action (string) }. action is one of: "next", "try_exercise", "show_example", "complete"',
    '',
    'When phase is "complete", also include:',
    '- recap (object): { topic (string), keyPoints (array of strings), applyTip (string) }',
    '',
    'Rules:',
    '- Return ONLY the JSON object. No markdown fences, no explanation outside the JSON.',
    '- Progress through phases logically based on conversation history.',
    '- If the user says "next" or clicks a next button, advance to the next phase.',
    '- If the user attempts an exercise, evaluate their attempt and give feedback.',
    !isDevTier
      ? '- The learner is NOT a developer. Never use code, terminal commands, or technical jargon. Focus on prompting and browser-based tools.'
      : '- The learner is a developer. You may include code examples and technical details.',
    display_name ? `- The learner's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

export async function generateLessonResponse(topic, messages, learnerProfile, options = {}) {
  const format = options.format || 'standard';
  const maxTokens = FORMAT_TOKENS[format] || FORMAT_TOKENS.standard;

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: buildLessonSystemPrompt(topic, learnerProfile, options),
      messages,
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  } catch (error) {
    console.error('Lesson API error:', error);
    throw new Error('Failed to generate lesson content. Please try again.');
  }
}
