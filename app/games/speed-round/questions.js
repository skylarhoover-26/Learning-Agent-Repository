const ALL_QUESTIONS = [
  {
    q: 'What does "LLM" stand for?',
    options: ['Large Learning Machine', 'Large Language Model', 'Linear Logic Module', 'Layered Language Matrix'],
    correct: 1,
    explanation: 'LLM stands for Large Language Model — a type of AI trained on massive text datasets.',
  },
  {
    q: 'Which is the BEST way to get a more useful AI response?',
    options: ['Type in ALL CAPS', 'Be vague so the AI can be creative', 'Provide specific context and constraints', 'Ask the shortest possible question'],
    correct: 2,
    explanation: 'Providing specific context and constraints helps the AI understand exactly what you need.',
  },
  {
    q: 'What is an "AI hallucination"?',
    options: ['When the AI sees images', 'When the AI generates confident but incorrect information', 'When the AI crashes', 'When the AI refuses to answer'],
    correct: 1,
    explanation: 'A hallucination is when an AI produces plausible-sounding but factually wrong information.',
  },
  {
    q: 'When should you NOT rely on AI output without verification?',
    options: ['Brainstorming ideas', 'Drafting creative content', 'Citing specific facts, statistics, or dates', 'Summarizing your own notes'],
    correct: 2,
    explanation: 'AI can fabricate facts and statistics. Always verify specific claims from independent sources.',
  },
  {
    q: 'What is "prompt engineering"?',
    options: ['Building AI hardware', 'Writing code for AI models', 'Crafting effective instructions for AI tools', 'Training neural networks'],
    correct: 2,
    explanation: 'Prompt engineering is the practice of writing clear, structured instructions to get better AI outputs.',
  },
  {
    q: 'Which task is AI generally BEST at?',
    options: ['Making final business decisions', 'Drafting and summarizing text', 'Predicting the stock market', 'Replacing human judgment entirely'],
    correct: 1,
    explanation: 'AI excels at text drafting and summarization. It should assist, not replace, human decision-making.',
  },
  {
    q: 'What happens when you give AI a "role" in your prompt (e.g., "You are an expert editor")?',
    options: ['Nothing, it ignores it', 'It changes the AI model being used', 'It helps frame the tone, depth, and perspective of the response', 'It makes the response less accurate'],
    correct: 2,
    explanation: 'Assigning a role sets context for the style and expertise level of the response.',
  },
  {
    q: 'What is a "token" in the context of AI?',
    options: ['A payment method', 'A unit of text (roughly a word or word-piece) the model processes', 'A security credential', 'A type of AI model'],
    correct: 1,
    explanation: 'Tokens are chunks of text (roughly 3/4 of a word on average) that LLMs process.',
  },
  {
    q: 'Which of these is a GOOD use of AI at work?',
    options: ['Automating performance reviews without review', 'Drafting a first version of an email for you to edit', 'Sharing confidential data with a public AI tool', 'Blindly copying AI output into a client proposal'],
    correct: 1,
    explanation: 'AI is great for first drafts you then review. Always edit and verify before sharing.',
  },
  {
    q: 'What should you do if an AI response seems wrong?',
    options: ['Trust it — AI is usually right', 'Ask the AI to confirm its own answer', 'Verify with a reliable external source', 'Ignore it and move on'],
    correct: 2,
    explanation: 'Always check suspicious AI claims against trusted external sources. AI cannot reliably self-verify.',
  },
  {
    q: 'What is "context window" in AI?',
    options: ['The screen where you see AI responses', 'The maximum amount of text an AI can consider at once', 'A setting that controls creativity', 'The time limit for a conversation'],
    correct: 1,
    explanation: 'The context window is the total text (prompt + response) the model can handle in one go.',
  },
  {
    q: 'Which prompt technique gives the AI an example of what you want?',
    options: ['Zero-shot prompting', 'Few-shot prompting', 'Chain-of-thought prompting', 'Temperature tuning'],
    correct: 1,
    explanation: 'Few-shot prompting includes examples in the prompt so the AI can mimic the pattern.',
  },
  {
    q: 'What is a key risk of using AI-generated content without review?',
    options: ['It costs too much', 'It may contain inaccuracies, bias, or inappropriate content', 'It will always be too long', 'It will be flagged by search engines'],
    correct: 1,
    explanation: 'Unreviewed AI content can include factual errors, biases, or tone issues. Always review.',
  },
  {
    q: 'Why is iterating on a prompt (asking follow-ups) effective?',
    options: ['It costs less tokens', 'It confuses the AI into trying harder', 'It lets you refine and improve the output step by step', 'It resets the conversation memory'],
    correct: 2,
    explanation: 'Iterating lets you guide the AI closer to what you need by building on prior responses.',
  },
  {
    q: 'What type of data should you NEVER paste into a public AI tool?',
    options: ['Public company news', 'A generic email template', 'Customer PII, passwords, or confidential business data', 'A Wikipedia article'],
    correct: 2,
    explanation: 'Never share personal data, credentials, or confidential info with public AI tools.',
  },
];

export default ALL_QUESTIONS;
