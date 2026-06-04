// modules.js — AI Learning Companion
// Module 2, 3 content + interactive games (Spot the Bad Prompt, Trivia, Weekly Challenge)
// Imported by bot.js and wired up via action handlers.
// ─────────────────────────────────────────────────────────────────────────────

const { QUICK_WINS } = require('./curriculum');

// ─── Spot the Bad Prompt — 5 rounds ──────────────────────────────────────────
// Each round: show a bad prompt and a good prompt, user picks which is good.
// "good" is always either 'a' or 'b' — randomized per round below.

const PROMPT_GAME_ROUNDS = [
  {
    question: 'Which of these prompts will get you a more useful response?',
    a: 'Summarize this.',
    b: 'Summarize the key decisions and action items from this meeting transcript in bullet points. Flag anything marked as a deadline.',
    good: 'b',
    explanation: '*Option B wins.* Vague prompts give vague answers. Telling the AI what to look for (decisions, action items, deadlines) and what format you want (bullets) gets you something usable.',
  },
  {
    question: 'Which prompt is more likely to produce a useful first draft?',
    a: 'Write an email to a client about the delay.',
    b: "Write a 3-paragraph email to a client explaining that their onboarding is delayed by 2 weeks due to data migration. Tone: professional but warm. Start with an apology, then explain what's happening, then give next steps.",
    good: 'b',
    explanation: '*Option B wins.* The more context you give — audience, reason, tone, structure — the less cleanup you have to do. AI isn\'t a mind reader; it only knows what you tell it.',
  },
  {
    question: 'Which prompt gives better output for a business case?',
    a: 'Help me write a business case for adding headcount.',
    b: 'Help me write a 1-page business case for adding 2 FTEs to our onboarding team. The audience is our CFO. Include: problem statement (current team handles 200 accounts each), business impact if we don\'t hire, and a simple ROI model using $75K/FTE.',
    good: 'b',
    explanation: '*Option B wins.* A business case to a CFO needs numbers. Giving the AI the audience, the data, and the structure you need means it can actually help you — not just give you a generic template.',
  },
  {
    question: 'You need to prep for a difficult conversation with a stakeholder. Which prompt is better?',
    a: 'How should I handle a tough conversation?',
    b: 'I need to tell a senior stakeholder that we\'re missing a Q3 deadline because of a dependency we didn\'t flag early enough. Help me plan how to open the conversation, what to say when they push back, and how to close with a clear path forward.',
    good: 'b',
    explanation: '*Option B wins.* The more specific the situation, the more specific the advice. A generic question gets generic advice. Give the AI the real scenario — it\'s confidential to your session.',
  },
  {
    question: 'Which is a better prompt for getting an AI to help with data analysis?',
    a: 'Analyze this data and tell me what\'s interesting.',
    b: 'I\'m looking at monthly churn data by customer segment. Help me identify which 2-3 segments have the highest churn rate over the last 6 months and suggest 3 hypotheses for why that might be happening, based on common SaaS churn drivers.',
    good: 'b',
    explanation: '*Option B wins.* "What\'s interesting" is wide open — you\'ll get a generic answer. Telling the AI what you\'re looking for (segments, timeframe, hypotheses) and what lens to use (SaaS churn drivers) gets you analysis you can actually use.',
  },
];

// ─── Trivia — 5 questions ─────────────────────────────────────────────────────

const TRIVIA_QUESTIONS = [
  {
    question: '🧠 *AI Trivia — Question 1:*\n\nWhat does "hallucination" mean when we talk about AI tools like Gemini or ChatGPT?',
    options: [
      { label: 'A', text: 'The AI gets confused and stops responding' },
      { label: 'B', text: 'The AI generates confident-sounding but incorrect or made-up information' },
      { label: 'C', text: 'The AI starts repeating itself in a loop' },
      { label: 'D', text: 'The AI refuses to answer a question' },
    ],
    correct: 'B',
    explanation: '✅ *Correct answer: B.*\nAI hallucination is when the model generates something that sounds completely plausible but is factually wrong — sometimes fabricating citations, names, or statistics. Always verify anything important.',
  },
  {
    question: '🧠 *AI Trivia — Question 2:*\n\nWhat is "prompt engineering"?',
    options: [
      { label: 'A', text: 'A job title for AI developers' },
      { label: 'B', text: 'The process of training an AI model' },
      { label: 'C', text: 'Crafting your input to get better, more useful output from AI' },
      { label: 'D', text: 'A way to fix bugs in AI software' },
    ],
    correct: 'C',
    explanation: '✅ *Correct answer: C.*\nPrompt engineering is the skill of giving AI clear, specific, well-structured inputs so it produces outputs that are actually useful. No coding required — it\'s more like knowing how to ask the right question.',
  },
  {
    question: '🧠 *AI Trivia — Question 3:*\n\nYou paste a client\'s full name, account number, and financial data into Gemini to help draft a report. What\'s the risk?',
    options: [
      { label: 'A', text: 'No risk — Gemini deletes inputs immediately' },
      { label: 'B', text: 'The AI might share the data with other users' },
      { label: 'C', text: 'The input may be stored, reviewed, or used for model training depending on your organization\'s settings' },
      { label: 'D', text: 'The AI will refuse to help with financial data' },
    ],
    correct: 'C',
    explanation: '✅ *Correct answer: C.*\nEven enterprise AI tools vary in how they handle input data. The safest approach: paraphrase or anonymize sensitive info before pasting it in. Never paste raw client account numbers, SSNs, or financial details.',
  },
  {
    question: '🧠 *AI Trivia — Question 4:*\n\nWhich of these is the AI MOST reliable for?',
    options: [
      { label: 'A', text: 'Calculating precise financial figures' },
      { label: 'B', text: 'Knowing what happened in the news yesterday' },
      { label: 'C', text: 'Drafting, structuring, and summarizing text' },
      { label: 'D', text: 'Making final decisions on complex business problems' },
    ],
    correct: 'C',
    explanation: '✅ *Correct answer: C.*\nAI shines at language tasks — drafting, rewriting, summarizing, structuring. It\'s unreliable for real-time info (it has a knowledge cutoff), precise math (always verify), and judgment calls that require context it doesn\'t have.',
  },
  {
    question: '🧠 *AI Trivia — Question 5:*\n\nWhat\'s the best way to improve an AI response that isn\'t quite right?',
    options: [
      { label: 'A', text: 'Start a completely new conversation and hope for better output' },
      { label: 'B', text: 'Follow up with more specific instructions in the same conversation' },
      { label: 'C', text: 'Switch to a different AI tool' },
      { label: 'D', text: 'Accept the output and edit it manually' },
    ],
    correct: 'B',
    explanation: '✅ *Correct answer: B.*\nAI conversations have memory within a session — you can refine, redirect, and improve. Try: "That\'s close, but make it shorter and more direct" or "Focus only on the part about X." Iteration is the skill.',
  },
];

// ─── Module 2: Try It Now ─────────────────────────────────────────────────────

async function sendModule2(client, userId, channelId, profile) {
  const { department = '', top_tasks = [] } = profile;
  const topTask = top_tasks[0] || 'your core work';

  // Look up quick win for this department + task, fall back to generic
  const deptWins = QUICK_WINS[department] || {};
  const win = deptWins[topTask] || {
    quickWin: `Use AI to draft a first version of your next "${topTask}" deliverable`,
    prompt: `I work in ${department}. Help me create a first draft for: ${topTask}. Ask me any clarifying questions you need before starting.`,
    what: 'a working first draft you can refine in minutes instead of starting from scratch',
  };

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Module 2: AI for Your Core Tasks* 🎯\n\nTime to actually use it. The fastest way to learn AI isn't reading about it — it's running a real task and seeing what happens.\n\nYou told me your #1 task is: *${topTask}*\n\nHere's your quick win for this week:`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎯 Your Quick Win:*\n${win.quickWin}\n\n*What you'll get:* ${win.what}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Copy this prompt into Gemini:*\n\`\`\`${win.prompt}\`\`\``,
        },
      },
      {
        type: 'actions',
        block_id: 'module2_gemini',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🚀 Open Gemini' },
            url: 'https://gemini.google.com',
            action_id: 'mod2__open_gemini',
          },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Tips for this session:*\n• Paste the prompt above — then add your specific details at the end\n• If the output isn't quite right, don't start over — follow up: _"Make it shorter"_ or _"Focus on the part about X"_\n• Remember: don't paste real client names, account numbers, or financial data — paraphrase instead\n\nCome back when you've tried it!`,
        },
      },
      {
        type: 'actions',
        block_id: 'module2_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "✅ I tried it!" }, action_id: 'mod2__tried', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Come back to this later' }, action_id: 'mod2__later' },
        ],
      },
    ],
  });
}

// ─── Module 3: Prompting That Works ──────────────────────────────────────────

async function sendModule3(client, userId, channelId, profile) {
  const { top_tasks = [] } = profile;
  const task2 = top_tasks[1] || top_tasks[0] || 'a key task';

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Module 3: Prompting That Works* ✍️\n\nGood prompts aren't magic — they follow a pattern. Once you know the formula, you can apply it to anything.\n\n*The CSTF framework:*\n• *C — Context:* Who are you, what's the situation?\n• *S — Specifics:* What exactly do you need?\n• *T — Tone/Audience:* Who is this for? What's the right register?\n• *F — Format:* Bullets? Paragraphs? Table? Short or long?\n\nThe more of these you include, the less editing you'll do after.`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Example: Applying CSTF to "${task2}"*\n\n❌ *Before:* _"Help me with ${task2}"_\n\n✅ *After:* _"I'm a [role] at a fintech company. Help me [specific outcome] for [audience]. Use [tone: professional/casual/direct]. Format as [bullets/paragraphs/table]."_\n\nThe best prompts feel like you're briefing a really smart colleague who just started today — they need the context you'd give anyone new.`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ready to test your prompt instincts?*\nPlay a quick game — I'll show you two prompts, you pick which one is better. Takes about 2 minutes.`,
        },
      },
      {
        type: 'actions',
        block_id: 'module3_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '🎮 Play: Spot the Bad Prompt' }, action_id: 'mod3__start_game', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Skip game, continue' }, action_id: 'mod3__skip_game' },
        ],
      },
    ],
  });
}

// ─── Game: Spot the Bad Prompt ────────────────────────────────────────────────

async function startPromptGame(client, userId, channelId) {
  // Initialize game state (caller sets it in bot.js)
  await sendPromptGameRound(client, channelId, 0, 0);
}

async function sendPromptGameRound(client, channelId, roundIndex, score) {
  const round = PROMPT_GAME_ROUNDS[roundIndex];
  const total = PROMPT_GAME_ROUNDS.length;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎮 Spot the Bad Prompt — Round ${roundIndex + 1} of ${total}*\n_(Score: ${score}/${roundIndex})_\n\n${round.question}`,
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Option A:*\n_"${round.a}"_` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Option B:*\n_"${round.b}"_` },
      },
      {
        type: 'actions',
        block_id: `pg_round_${roundIndex}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Option A is better' },
            action_id: `pg__${roundIndex}__a`,
            value: `${roundIndex}__a`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Option B is better' },
            action_id: `pg__${roundIndex}__b`,
            value: `${roundIndex}__b`,
          },
        ],
      },
    ],
  });
}

async function sendPromptGameResult(client, channelId, roundIndex, userAnswer, currentScore) {
  const round = PROMPT_GAME_ROUNDS[roundIndex];
  const correct = userAnswer === round.good;
  const newScore = correct ? currentScore + 1 : currentScore;
  const nextRound = roundIndex + 1;
  const isLast = nextRound >= PROMPT_GAME_ROUNDS.length;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${correct ? '✅ *Correct!*' : `❌ *Not quite — Option ${round.good.toUpperCase()} was the better prompt.*`}\n\n${round.explanation}`,
        },
      },
      {
        type: 'actions',
        block_id: `pg_next_${roundIndex}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: isLast ? `See my results (${newScore}/${PROMPT_GAME_ROUNDS.length})` : 'Next round →' },
            action_id: isLast ? `pg__finish__${newScore}` : `pg__next__${nextRound}__${newScore}`,
            value: `${nextRound}__${newScore}`,
            style: 'primary',
          },
        ],
      },
    ],
  });
}

async function sendPromptGameSummary(client, userId, channelId, score) {
  const total = PROMPT_GAME_ROUNDS.length;
  const pct = Math.round((score / total) * 100);

  let feedback;
  if (pct === 100) {
    feedback = "Perfect score! 🎉 You've got strong prompt instincts. Put them to work on your actual tasks.";
  } else if (pct >= 60) {
    feedback = `${score}/${total} — solid! You know what good prompts look like. Keep practicing on real tasks and it'll become automatic.`;
  } else {
    feedback = `${score}/${total} — good start. The pattern to remember: more context + specific ask + format = better output. Try rewriting one of the prompts you got wrong and see the difference.`;
  }

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎮 Game over — you scored ${score}/${total}!*\n\n${feedback}\n\nReady for your trivia challenge?`,
        },
      },
      {
        type: 'actions',
        block_id: 'pg_summary_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '🧠 Take AI Trivia' }, action_id: 'start_trivia', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Skip trivia, continue' }, action_id: 'skip_trivia' },
        ],
      },
    ],
  });
}

// ─── Game: AI Trivia ──────────────────────────────────────────────────────────

async function sendTriviaQuestion(client, channelId, questionIndex, score) {
  const q = TRIVIA_QUESTIONS[questionIndex];
  const total = TRIVIA_QUESTIONS.length;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Question ${questionIndex + 1} of ${total}* _(Score: ${score}/${questionIndex})_\n\n${q.question}`,
        },
      },
      {
        type: 'actions',
        block_id: `tq_round_${questionIndex}`,
        elements: q.options.map(opt => ({
          type: 'button',
          text: { type: 'plain_text', text: `${opt.label}. ${opt.text}` },
          action_id: `tq__${questionIndex}__${opt.label.toLowerCase()}`,
          value: `${questionIndex}__${opt.label}`,
        })),
      },
    ],
  });
}

async function sendTriviaResult(client, channelId, questionIndex, userAnswer, currentScore) {
  const q = TRIVIA_QUESTIONS[questionIndex];
  const correct = userAnswer.toUpperCase() === q.correct;
  const newScore = correct ? currentScore + 1 : currentScore;
  const nextIndex = questionIndex + 1;
  const isLast = nextIndex >= TRIVIA_QUESTIONS.length;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${correct ? '✅ *Correct!*' : `❌ *The right answer was ${q.correct}.*`}\n\n${q.explanation}`,
        },
      },
      {
        type: 'actions',
        block_id: `tq_next_${questionIndex}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: isLast ? `See my results (${newScore}/${TRIVIA_QUESTIONS.length})` : 'Next question →' },
            action_id: isLast ? `tq__finish__${newScore}` : `tq__next__${nextIndex}__${newScore}`,
            value: `${nextIndex}__${newScore}`,
            style: 'primary',
          },
        ],
      },
    ],
  });
}

async function sendTriviaSummary(client, userId, channelId, score) {
  const total = TRIVIA_QUESTIONS.length;
  const pct = Math.round((score / total) * 100);

  let feedback;
  if (pct === 100) {
    feedback = "You aced it! 🎉 You clearly know your AI fundamentals. Time to apply that knowledge.";
  } else if (pct >= 60) {
    feedback = `${score}/${total} — strong showing! A couple of areas to revisit, but you've got solid fundamentals.`;
  } else {
    feedback = `${score}/${total} — this is exactly why the training exists! Review the explanations above — each one has a practical tip you can use today.`;
  }

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🧠 Trivia complete — ${score}/${total}!*\n\n${feedback}\n\nLast step before you're done with Module 3: your weekly challenge.`,
        },
      },
      {
        type: 'actions',
        block_id: 'trivia_summary_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "🎯 See this week's challenge" }, action_id: 'show_challenge', style: 'primary' },
        ],
      },
    ],
  });
}

// ─── Weekly Challenge ─────────────────────────────────────────────────────────

async function sendWeeklyChallenge(client, userId, channelId, profile) {
  const { department = '', top_tasks = [] } = profile;
  const task = top_tasks[1] || top_tasks[0] || 'a core task';

  const deptWins = QUICK_WINS[department] || {};
  const win = deptWins[task];

  const challengePrompt = win
    ? win.prompt
    : `I work in ${department}. Help me work on: ${task}. Walk me through this step by step and ask for any context you need.`;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎯 This Week's Challenge*\n\nYou've learned the framework. Now build your reusable prompt.\n\n*Your task this week:*\nUse AI for *${task}* — but this time, write a prompt you'll actually save and reuse. The goal is a prompt template that works well enough that you'd share it with a teammate.\n\n*Starter prompt to customize:*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${challengePrompt}\`\`\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*After you try it:*\n• Did it work well? Save it somewhere you can reuse it\n• Did it miss something? Tweak and try again — that's the skill\n• Got a great result? Come back and tell me — that's worth capturing in your scores 📈`,
        },
      },
      {
        type: 'actions',
        block_id: 'module2_gemini2',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🚀 Open Gemini' },
            url: 'https://gemini.google.com',
            action_id: 'challenge__open_gemini',
          },
        ],
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: "Come back when you've had a chance to try it. I'll check in with you and update your scores." },
      },
      {
        type: 'actions',
        block_id: 'challenge_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: '✅ Done — I tried it and have something to share' }, action_id: 'challenge__done', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: "I'll do it this week" }, action_id: 'challenge__later' },
        ],
      },
    ],
  });
}

module.exports = {
  PROMPT_GAME_ROUNDS,
  TRIVIA_QUESTIONS,
  sendModule2,
  sendModule3,
  startPromptGame,
  sendPromptGameRound,
  sendPromptGameResult,
  sendPromptGameSummary,
  sendTriviaQuestion,
  sendTriviaResult,
  sendTriviaSummary,
  sendWeeklyChallenge,
};
