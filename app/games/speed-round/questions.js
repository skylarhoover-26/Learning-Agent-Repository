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

  // --- AI Ethics & Bias ---
  {
    q: 'What is "algorithmic bias"?',
    options: [
      'When an algorithm runs too slowly on certain hardware',
      'Systematic unfair outcomes caused by biased training data',
      'A preference for one programming language over another',
      'When users give biased feedback to an AI system',
    ],
    correct: 1,
    explanation: 'Algorithmic bias occurs when AI produces systematically unfair outcomes because the training data reflects historical biases or underrepresents certain groups.',
  },
  {
    q: 'What is a key risk of using AI for resume screening?',
    options: [
      'It reads resumes too quickly to be accurate',
      'It can only process PDF format',
      'It may reproduce historical hiring biases present in past data',
      'It always favors candidates from top universities',
    ],
    correct: 2,
    explanation: 'AI resume screeners trained on historical hiring data can replicate past biases, such as favoring certain demographics that were historically over-hired.',
  },
  {
    q: 'What is the best practice before publishing AI-generated content?',
    options: [
      'Run it through a second AI for confirmation',
      'Publish immediately to save time',
      'Have a human review it for bias, accuracy, and tone',
      'Add a disclaimer that AI wrote it and skip review',
    ],
    correct: 2,
    explanation: 'AI content should always be reviewed by a human for potential bias, factual accuracy, and appropriate tone before publishing.',
  },

  // --- Advanced Prompting ---
  {
    q: 'What is "chain-of-thought" prompting?',
    options: [
      'Sending multiple prompts in rapid succession',
      'Asking the AI to show its reasoning step by step',
      'Linking several AI models together in a pipeline',
      'Copying the AI\'s previous response into the next prompt',
    ],
    correct: 1,
    explanation: 'Chain-of-thought prompting asks the AI to work through a problem step by step, which often produces more accurate and well-reasoned responses.',
  },
  {
    q: 'Which technique is most effective for getting AI to handle complex analysis?',
    options: [
      'Asking the question in a single long sentence',
      'Breaking the task into numbered sub-tasks',
      'Using technical jargon to sound more precise',
      'Repeating the same prompt until the AI gets it right',
    ],
    correct: 1,
    explanation: 'Breaking complex tasks into numbered sub-tasks helps the AI address each part methodically, improving accuracy and completeness.',
  },
  {
    q: 'What is a "system prompt"?',
    options: [
      'The first message a user types in a new conversation',
      'An error message generated by the AI platform',
      'Instructions that set the AI\'s behavior for an entire conversation',
      'A prompt that restarts the AI model',
    ],
    correct: 2,
    explanation: 'A system prompt is a set of instructions given to the AI that defines its role, tone, and behavioral guidelines for the whole conversation.',
  },

  // --- AI in Business ---
  {
    q: 'Where do knowledge workers typically see the biggest time savings from AI?',
    options: [
      'Final proofreading of polished documents',
      'Creating first drafts of documents and communications',
      'Attending meetings on their behalf',
      'Replacing all manual data entry permanently',
    ],
    correct: 1,
    explanation: 'AI delivers the most immediate time savings by generating first drafts of documents, emails, and reports that humans then refine.',
  },
  {
    q: 'What is the best first step when automating a workflow with AI?',
    options: [
      'Buy the most expensive AI tool available',
      'Map the manual process first to identify what can be automated',
      'Automate everything at once for maximum efficiency',
      'Let AI decide which steps to automate',
    ],
    correct: 1,
    explanation: 'Before automating with AI, you should map the manual process to understand each step, identify bottlenecks, and decide which parts benefit most from automation.',
  },
  {
    q: 'What is an "AI agent"?',
    options: [
      'A human who sells AI software to businesses',
      'An AI that can plan and execute multi-step tasks autonomously',
      'A chatbot that only answers frequently asked questions',
      'A security program that monitors AI usage',
    ],
    correct: 1,
    explanation: 'An AI agent is an AI system that can plan, make decisions, and carry out multi-step tasks on its own, often using tools and APIs to complete objectives.',
  },

  // --- Data Privacy ---
  {
    q: 'What GDPR consideration applies before using customer data in AI prompts?',
    options: [
      'You only need consent if the customer is in the EU',
      'GDPR does not apply to AI tools',
      'You must have a lawful basis and practice data minimization',
      'You just need to anonymize the customer\'s first name',
    ],
    correct: 2,
    explanation: 'Under GDPR, processing personal data in AI prompts requires a lawful basis (like consent or legitimate interest) and data minimization — only including what is strictly necessary.',
  },
  {
    q: 'What does "data minimization" mean when using AI?',
    options: [
      'Compressing files before uploading them to AI',
      'Using the smallest possible AI model',
      'Only including the minimum data needed in your prompt',
      'Deleting all AI conversations after 24 hours',
    ],
    correct: 2,
    explanation: 'Data minimization means only sharing the minimum amount of data necessary for the AI to complete the task, reducing privacy risk.',
  },
  {
    q: 'Is it safe to paste customer Social Security Numbers into an enterprise AI tool?',
    options: [
      'Yes, enterprise tools are fully encrypted',
      'Yes, as long as you delete the conversation afterward',
      'No, you should avoid including unnecessary PII in any AI prompt',
      'Only if the customer gave verbal consent',
    ],
    correct: 2,
    explanation: 'Even with enterprise AI tools, you should avoid including sensitive PII like SSNs. Follow the principle of data minimization and only share what is truly needed.',
  },

  // --- AI Limitations ---
  {
    q: 'Which task is AI LEAST reliable at?',
    options: [
      'Summarizing a long article you provide',
      'Translating common phrases between languages',
      'Providing real-time current events information',
      'Generating a list of brainstorming ideas',
    ],
    correct: 2,
    explanation: 'AI models are trained on data up to a cutoff date and cannot access real-time information unless specifically connected to live data sources.',
  },
  {
    q: 'Why do AI models sometimes "refuse" to answer a question?',
    options: [
      'They run out of processing power mid-response',
      'Safety guardrails are designed to prevent harmful content',
      'The question was too easy and the AI skips it',
      'The user has reached a daily question limit',
    ],
    correct: 1,
    explanation: 'AI models have built-in safety guardrails that cause them to decline requests that could produce harmful, dangerous, or unethical content.',
  },
  {
    q: 'What is a "knowledge cutoff" in AI?',
    options: [
      'A limit on how many questions you can ask per session',
      'The maximum number of words an AI can generate',
      'The date after which the model has no training data',
      'A feature that stops the AI from sharing confidential info',
    ],
    correct: 2,
    explanation: 'A knowledge cutoff is the date beyond which the AI has no training data, meaning it may not know about events or information published after that point.',
  },
];

export default ALL_QUESTIONS;
