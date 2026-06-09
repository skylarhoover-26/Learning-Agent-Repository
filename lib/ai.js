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
  const { display_name, department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';

  const tasksContext = Array.isArray(top_tasks) && top_tasks.length > 0
    ? `- Their day-to-day tasks: ${top_tasks.join(', ')}. Reference these when suggesting AI applications.`
    : null;

  return [
    'You are a friendly, concise AI tutor on an internal learning platform.',
    'Your primary job is to help people discover how to USE AI in their actual work — not just explain topics abstractly.',
    'Rules:',
    '- Keep responses to 4-6 lines max.',
    '- Use **bold**, bullets, and `code` formatting for clarity.',
    '- No preambles like "Great question!" or "Sure thing!"',
    '- Be conversational and direct.',
    '- Always focus on practical AI application: show HOW to use AI for things, include example prompts they can try.',
    '- Reference tools they actually use (Slack, Google Docs, spreadsheets) not email unless they ask about email.',
    !isDevTier
      ? '- The learner is NOT a developer. Never suggest Python, terminal commands, or writing code. Focus on browser-based AI tools, prompting, and workflows.'
      : '- The learner is a developer. You may reference code, APIs, and technical concepts.',
    display_name ? `- The learner's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasksContext,
    goal ? `- Their learning goal: ${goal}` : null,
    '- When relevant, tie advice back to their role, tasks, and goals.',
    '- When teaching about prompting, always reference the RCTF framework: Role (tell the AI who to be), Context (provide background), Task (state what to do), Format (specify output structure). This is the platform\'s core prompting methodology.',
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
    '- starterPrompt (string): an actual prompt they could paste into an AI tool. MUST follow the RCTF framework: start with Role ("You are a..."), then Context (background), then Task (what to do), then Format (desired output). Make it complete and ready to use.',
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
  quick_tip: 400,
  standard: 800,
  deep_dive: 1500,
};

export function buildLessonSystemPrompt(topic, learnerProfile, options = {}) {
  const { display_name, department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';
  const format = options.format || 'standard';

  const formatGuide = {
    quick_tip: 'This is a Quick Tip (60 seconds). Give a single, actionable insight. No exercises. Go straight to the complete phase after the tip.',
    standard: 'This is a Quick Lesson (3-5 minutes). Walk through the topic with one hands-on exercise. Phases: intro -> steps -> practice -> complete.',
    deep_dive: 'This is a Deep Dive (15-20 minutes). Be thorough. Include setup, multiple steps, exercises, and evaluation. Phases: intro -> setup -> steps -> verify -> practice -> evaluate -> apply -> complete.',
  };

  const tasksContext = Array.isArray(top_tasks) && top_tasks.length > 0
    ? `- Their day-to-day tasks: ${top_tasks.join(', ')}. Use these as the context for examples and exercises.`
    : null;

  return [
    `You are a hands-on AI tutor teaching a lesson on: "${topic}".`,
    'You teach by SHOWING HOW TO USE AI, not just explaining the topic itself.',
    '',
    'AI APPLICATION FOCUS (CRITICAL):',
    '- Every lesson MUST teach how to use AI for the topic. Do not just explain the task — show how AI makes it better, faster, or easier.',
    '- Include specific AI prompts the learner can copy and try. Show the prompt, explain what it does, and show the expected output.',
    '- Frame everything around "here is how you use AI for this" not "here is how to do this manually."',
    '- Reference tools the learner actually uses (Slack, Google Docs, spreadsheets) not email unless the topic is specifically about email.',
    '',
    'BREVITY & VISUAL STRUCTURE RULES:',
    '- Keep each slide short and scannable — 3-5 sentences max for the message field.',
    '- Use **bold**, bullets, and `code` formatting to break up text. No walls of text.',
    '- Include simple ASCII diagrams, tables, or step-by-step flows when they help explain a concept visually.',
    '- Example: use a simple table to compare before/after, or a flow like: Task → AI Prompt → Result',
    '- One concept per slide. If there is more to cover, use the next slide.',
    '- Write like you are texting a coworker, not writing a textbook.',
    '',
    formatGuide[format] || formatGuide.standard,
    '',
    'Return your response as a single JSON object with these fields:',
    '- slideTitle (string): short title for this slide',
    '- message (string): your teaching content, using **bold**, bullets, `code` formatting, and simple ASCII diagrams/tables where helpful',
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
    tasksContext,
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
