const ROUNDS = [
  {
    id: 1,
    context:
      'A colleague asked: "When was the first iPhone released and what were its key features?"',
    sentences: [
      'The first iPhone was announced by Steve Jobs on January 9, 2007.',
      'It was released to the public on June 29, 2007.',
      'The original iPhone featured a 3.5-inch touchscreen display.',
      'It ran on the iOS operating system from day one, which was called "iPhone OS" at launch.',
      'The first iPhone included a built-in App Store where users could download third-party apps.',
      'It was available exclusively on AT&T (then Cingular) in the United States.',
      'The base model came with 4GB of storage and was priced at $499.',
    ],
    hallucinations: [4],
    explanations: {
      4: 'The App Store did not launch with the original iPhone. It was introduced later with iPhone OS 2.0 in July 2008. The original iPhone only ran Apple\'s built-in apps.',
    },
  },
  {
    id: 2,
    context:
      'You asked an AI: "Explain how large language models work in simple terms."',
    sentences: [
      'Large language models (LLMs) are trained on massive amounts of text data from the internet.',
      'They learn patterns in language by predicting what word comes next in a sequence.',
      'The training process uses neural networks with billions of parameters.',
      'LLMs store a complete database of facts that they look up when answering questions.',
      'They can generate human-like text by building responses one token at a time.',
      'Popular examples include GPT-4, Claude, and Gemini.',
      'LLMs can sometimes produce confident-sounding but incorrect information.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'LLMs do NOT store a database of facts. They learn statistical patterns across language. This is why they can "hallucinate" - they generate plausible-sounding text based on patterns, not by looking up verified facts.',
    },
  },
  {
    id: 3,
    context:
      'A team member asked AI: "Give me a summary of best practices for running effective meetings."',
    sentences: [
      'Always send an agenda at least 24 hours before the meeting.',
      'Keep meetings to 30 minutes or less when possible - research shows attention drops sharply after that.',
      'Start every meeting with a 10-minute icebreaker to build team rapport, as recommended by Harvard Business Review.',
      'Assign a note-taker at the start to capture action items.',
      'End with clear next steps and owners for each action item.',
      'Send a follow-up summary within 24 hours of the meeting.',
      'Studies by Microsoft show that back-to-back meetings increase stress and reduce focus.',
    ],
    hallucinations: [2],
    explanations: {
      2: 'Harvard Business Review has not specifically recommended starting "every" meeting with a 10-minute icebreaker. While icebreakers can be useful in some contexts, a blanket 10-minute icebreaker for every meeting is not a widely cited best practice and would be counterproductive for short meetings.',
    },
  },
  {
    id: 4,
    context:
      'You asked: "What are the key differences between ChatGPT and Claude?"',
    sentences: [
      'ChatGPT is made by OpenAI, while Claude is made by Anthropic.',
      'Both are large language models that can generate text, answer questions, and help with tasks.',
      'Claude was specifically designed with a focus on being helpful, harmless, and honest.',
      'ChatGPT uses the GPT architecture, while Claude is built on a completely different transformer variant called RLHF-Net.',
      'Both models can make mistakes and produce hallucinations.',
      'ChatGPT launched publicly in November 2022 and quickly gained millions of users.',
      'Claude emphasizes longer context windows and careful, nuanced responses.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'There is no transformer variant called "RLHF-Net." RLHF (Reinforcement Learning from Human Feedback) is a training technique, not a model architecture. Both ChatGPT and Claude use transformer-based architectures. The AI fabricated a technical-sounding name.',
    },
  },
  {
    id: 5,
    context:
      'You asked AI to summarize a competitor\'s recent earnings report.',
    sentences: [
      'NovaTech reported its Q3 earnings on October 15, beating analyst expectations on revenue.',
      'The company saw strong growth in its cloud services division, which now accounts for 38% of total revenue.',
      'CEO Maria Chen highlighted the expansion into the Asia-Pacific market as a key growth driver.',
      'Total Q3 revenue came in at $4.7 billion, a 23% increase year-over-year.',
      'The company announced plans to invest $500 million in AI infrastructure over the next two years.',
      'Operating margins improved slightly to 18.2%, up from 17.6% in the prior quarter.',
      'NovaTech raised its full-year guidance, projecting annual revenue of $18.3 billion.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'This specific revenue figure of $4.7 billion was fabricated by the AI. When summarizing financial reports, AI models often generate plausible-sounding but completely invented numbers. Always verify financial figures directly from the original earnings report or SEC filings.',
    },
  },
  {
    id: 6,
    context:
      'A teammate shared what they learned about Claude\'s capabilities.',
    sentences: [
      'Claude can help write and debug code in many programming languages.',
      'It can summarize long documents and extract key points from text.',
      'Claude is able to browse the internet in real-time to look up current information.',
      'It can analyze data you paste into the conversation and identify patterns.',
      'Claude can help translate text between many common languages.',
      'It can generate different creative writing styles, from formal to casual.',
      'Claude can explain complex topics in simple terms, adjusting to the audience.',
    ],
    hallucinations: [2],
    explanations: {
      2: 'Claude cannot browse the internet in real-time. It is a language model that generates responses based on its training data up to a knowledge cutoff date. It does not have the ability to access websites, search engines, or live data during a conversation.',
    },
  },
  {
    id: 7,
    context:
      'AI generated a summary about how neural networks learn.',
    sentences: [
      'Neural networks learn by adjusting the weights of connections between artificial neurons.',
      'The training process uses an algorithm called backpropagation to calculate how to update weights.',
      'Gradient descent is used to minimize the difference between predicted and actual outputs.',
      'Neural networks store discrete memories of each training example in individual neurons, similar to a database.',
      'Deeper networks with more layers can learn increasingly abstract representations of data.',
      'Overfitting occurs when a network memorizes training data instead of learning general patterns.',
      'Regularization techniques like dropout help prevent overfitting during training.',
    ],
    hallucinations: [3],
    explanations: {
      3: 'Neural networks do NOT store discrete memories like a database. Instead, knowledge is distributed across millions of weight values. No single neuron "remembers" a specific training example. The network learns statistical patterns encoded in its weights, not individual data points.',
    },
  },
  {
    id: 8,
    context:
      'AI recommended improvements to your team\'s onboarding process.',
    sentences: [
      'New hires should receive a structured 90-day onboarding plan with clear milestones.',
      'Assigning a dedicated buddy or mentor helps new employees ramp up faster.',
      'A 2023 McKinsey study found that structured onboarding programs reduce first-year turnover by 82% and increase productivity by 54%.',
      'Regular check-ins during the first 90 days help identify and address challenges early.',
      'Pre-boarding activities like sending equipment and welcome materials before day one improve the experience.',
      'Cross-functional introductions help new hires understand how their role connects to the broader organization.',
      'Gathering feedback from new hires about the onboarding process helps improve it over time.',
    ],
    hallucinations: [2],
    explanations: {
      2: 'This McKinsey study with these specific statistics (82% turnover reduction, 54% productivity increase) does not exist. AI models frequently fabricate citations with plausible-sounding sources and precise statistics. Always verify any cited study, especially when it includes suspiciously specific numbers.',
    },
  },
];

export default ROUNDS;
