const ALL_CONTENT = [
  // --- Customer service emails (3 AI, 2 human) ---
  {
    id: 1,
    text: 'Thank you for reaching out to us regarding your recent experience. We sincerely apologize for any inconvenience caused and want to assure you that your satisfaction is our top priority. Our team is actively working to resolve this matter and will follow up within 24-48 business hours.',
    source: 'ai',
    category: 'Customer email',
    explanation: 'Notice the generic phrasing and lack of specific details. "Your satisfaction is our top priority" and "any inconvenience caused" are formulaic phrases AI defaults to. A human would reference the actual issue.',
  },
  {
    id: 2,
    text: 'We understand how frustrating this situation must be, and we truly value your feedback. Rest assured, we have escalated your concern to the appropriate department. A dedicated representative will be in touch shortly to ensure a swift and satisfactory resolution.',
    source: 'ai',
    category: 'Customer email',
    explanation: 'This reads like a template because it is. "Truly value your feedback," "escalated to the appropriate department," and "swift and satisfactory resolution" are all AI-typical hedging language with zero specifics.',
  },
  {
    id: 3,
    text: 'Hey Mike - so sorry about the double charge. That was totally our mistake. I just processed your refund ($47.99) and it should hit your account in 2-3 days. Also flagged the bug that caused it so it doesn\'t happen again. Let me know if you don\'t see it by Friday!',
    source: 'human',
    category: 'Customer email',
    explanation: 'This has real human markers: a casual greeting, the exact dollar amount, a specific timeline, and the writer taking personal ownership. AI rarely includes this level of concrete detail unprompted.',
  },
  {
    id: 4,
    text: 'We appreciate your patience and understanding as we work to enhance our services. Your experience is important to us, and we are committed to providing the highest level of support. Please do not hesitate to reach out if you have any further questions or concerns.',
    source: 'ai',
    category: 'Customer email',
    explanation: 'Every sentence is a corporate cliche. "Patience and understanding," "highest level of support," "do not hesitate to reach out" -- this is AI filling space without saying anything specific or useful.',
  },
  {
    id: 5,
    text: 'Hi Sarah, I looked into this and honestly I\'m not sure what happened with your order. The tracking says delivered but I can see from the photo it went to the wrong building. I\'m sending a replacement today via express -- you should have it by Tuesday. Sorry for the hassle.',
    source: 'human',
    category: 'Customer email',
    explanation: 'The honest admission of uncertainty ("I\'m not sure what happened"), reference to a specific photo, and a concrete solution with a named delivery day are distinctly human touches.',
  },

  // --- Product descriptions (2 AI, 2 human) ---
  {
    id: 6,
    text: 'Introducing our revolutionary all-in-one project management solution, designed to seamlessly streamline your workflow and boost productivity. With intuitive features and cutting-edge technology, it empowers teams of all sizes to collaborate effortlessly and achieve their goals faster than ever before.',
    source: 'ai',
    category: 'Product description',
    explanation: '"Revolutionary," "seamlessly streamline," "cutting-edge technology," "effortlessly" -- this is a greatest-hits collection of AI marketing buzzwords. It describes everything and nothing at the same time.',
  },
  {
    id: 7,
    text: 'We built this because our team kept losing track of who was doing what. It\'s a simple board where you drag tasks between columns, tag people, and set deadlines. No gantt charts, no 50-page setup guides. Just the stuff you actually need to ship projects without the chaos.',
    source: 'human',
    category: 'Product description',
    explanation: 'The personal motivation ("we built this because"), specific feature callouts (drag tasks, tag people), and deliberate anti-features ("no gantt charts") show a human with opinions and a story.',
  },
  {
    id: 8,
    text: 'Experience the future of home automation with our comprehensive smart home ecosystem. Our platform leverages advanced AI algorithms to learn your preferences and automatically optimize your living environment for maximum comfort, convenience, and energy efficiency.',
    source: 'ai',
    category: 'Product description',
    explanation: '"Experience the future," "comprehensive ecosystem," and "leverages advanced AI algorithms" are vague superlatives. A human writer would describe what the product actually does in plain terms.',
  },
  {
    id: 9,
    text: 'This thermostat learns your schedule in about a week. It figured out I leave at 8:15 and drops the heat to 62 while I\'m gone, then warms things up before I get home around 6. Cut my gas bill by about $30/month last winter, which honestly surprised me.',
    source: 'human',
    category: 'Product description',
    explanation: 'Specific times, exact temperatures, a real dollar savings figure, and the candid "honestly surprised me" all signal a human sharing genuine experience rather than AI generating marketing copy.',
  },

  // --- Meeting summaries (2 AI, 2 human) ---
  {
    id: 10,
    text: 'The team discussed the current project timeline and identified several key areas requiring attention. Action items were assigned to relevant stakeholders, and a follow-up meeting was scheduled for next week. All participants agreed on the importance of maintaining open communication and meeting established deadlines.',
    source: 'ai',
    category: 'Meeting summary',
    explanation: 'This summary says a meeting happened but tells you nothing about what was actually discussed. "Key areas," "relevant stakeholders," and "open communication" are placeholder phrases that could apply to any meeting ever.',
  },
  {
    id: 11,
    text: 'We spent most of the hour arguing about whether to delay the launch by 2 weeks. Dev says the payment bug is a blocker, but Marcus thinks we can ship with a workaround and hotfix later. No decision yet -- Priya is going to pull the error logs and we\'ll reconvene Thursday morning.',
    source: 'human',
    category: 'Meeting summary',
    explanation: 'Real names, a specific disagreement, a concrete bug, and an unresolved decision are all hallmarks of human meeting notes. AI summaries almost always wrap things up neatly with "all agreed."',
  },
  {
    id: 12,
    text: 'The quarterly review meeting was productive and insightful. The team analyzed key performance metrics, celebrated notable achievements, and identified strategic opportunities for growth. Cross-functional collaboration was emphasized as a critical driver of success moving forward.',
    source: 'ai',
    category: 'Meeting summary',
    explanation: '"Productive and insightful," "strategic opportunities for growth," and "cross-functional collaboration" are corporate buzzword bingo. A human would mention the actual numbers and who needs to do what.',
  },
  {
    id: 13,
    text: 'Q2 revenue came in at $2.1M, about 6% under target. The main miss was enterprise deals -- we closed 3 out of 8 in pipeline. Jen is restructuring the demo flow and wants everyone to shadow at least one enterprise call this month. Next review is Aug 12.',
    source: 'human',
    category: 'Meeting summary',
    explanation: 'Exact figures ($2.1M, 6%, 3 out of 8), a named person with a specific action, and a concrete date make this unmistakably human. AI-generated summaries rarely commit to numbers this precise.',
  },

  // --- Social media posts (2 AI, 1 human) ---
  {
    id: 14,
    text: 'Thrilled to announce the launch of our latest innovation! This game-changing solution is set to transform the way businesses operate. We can\'t wait for you to experience the difference. Stay tuned for more exciting updates!',
    source: 'ai',
    category: 'Social media post',
    explanation: '"Thrilled to announce," "game-changing," "transform the way businesses operate" -- this post is pure hype with zero substance. It never says what the product actually is or does.',
  },
  {
    id: 15,
    text: 'Exciting times ahead! We are proud to unveil our next-generation platform that empowers organizations to unlock their full potential. Join thousands of forward-thinking leaders who are already making the switch. The future starts now.',
    source: 'ai',
    category: 'Social media post',
    explanation: '"Unlock their full potential," "forward-thinking leaders," and "the future starts now" are generic motivational phrases AI assembles without any product-specific information.',
  },
  {
    id: 16,
    text: 'Finally shipped the thing we\'ve been working on for 6 months. It\'s a dashboard that shows your team\'s actual response times (not the ones your ticketing system pretends you have). Free trial on our site. Roast us in the comments.',
    source: 'human',
    category: 'Social media post',
    explanation: 'The self-aware humor ("roast us"), specific timeline ("6 months"), the parenthetical jab at ticketing systems, and casual tone are distinctly human. AI would never invite criticism.',
  },

  // --- Performance review excerpts (1 AI, 2 human) ---
  {
    id: 17,
    text: 'This team member consistently demonstrates exceptional dedication and a strong commitment to excellence. They exhibit outstanding communication skills and actively contribute to a positive team environment. Their attention to detail and ability to meet deadlines make them a valuable asset to the organization.',
    source: 'ai',
    category: 'Performance review',
    explanation: 'Every phrase is interchangeable praise that could apply to anyone. "Exceptional dedication," "commitment to excellence," "valuable asset" -- a real manager would cite a specific project or accomplishment.',
  },
  {
    id: 18,
    text: 'Tomas really stepped up during the Apex migration. When we lost the primary data feed on day 2, he stayed late three nights in a row to build the fallback pipeline. The flip side: he still struggles with pushing back on unrealistic timelines. We talked about this and he\'s going to start flagging risks earlier in sprint planning.',
    source: 'human',
    category: 'Performance review',
    explanation: 'A specific project (Apex migration), concrete behavior (stayed late, built a pipeline), balanced feedback with a real weakness, and a forward-looking action plan are all signs of a thoughtful human review.',
  },
  {
    id: 19,
    text: 'Dana closed the Meridian account almost entirely on her own after the original AE left mid-cycle. Impressive hustle. Her pipeline notes are still a mess though and she lost a follow-up with Brenton Corp because of it. We agreed she\'d start using the CRM templates starting this quarter.',
    source: 'human',
    category: 'Performance review',
    explanation: 'Named accounts, a specific situation (AE leaving mid-cycle), honest criticism about pipeline notes, and a concrete improvement plan reveal a human manager writing from real experience.',
  },

  // --- Bonus items to reach 22 total ---
  {
    id: 20,
    text: 'We are delighted to inform you that your request has been successfully processed. Should you require any additional assistance, our dedicated support team is available around the clock to ensure your complete satisfaction. Thank you for choosing us as your trusted partner.',
    source: 'ai',
    category: 'Customer email',
    explanation: '"Delighted to inform you," "complete satisfaction," and "trusted partner" are classic AI filler. The email confirms something was done but gives no details about what, when, or how.',
  },
  {
    id: 21,
    text: 'Quick update on ticket #4892 -- the CSV export issue was a timezone bug on our end. Pushed a fix about an hour ago. Can you try exporting again and let me know if the timestamps look right? If it\'s still off I\'ll hop on a call with you tomorrow.',
    source: 'human',
    category: 'Customer email',
    explanation: 'A specific ticket number, a diagnosed root cause, a shipped fix with a timeline, and an offer to call if it is not resolved are all concrete, human behaviors AI rarely replicates on its own.',
  },
  {
    id: 22,
    text: 'Leverage the power of our enterprise-grade analytics platform to gain actionable insights from your data. Our solution integrates seamlessly with your existing tech stack, providing real-time visibility into key metrics that drive business growth and operational efficiency.',
    source: 'ai',
    category: 'Product description',
    explanation: '"Enterprise-grade," "actionable insights," "seamlessly integrates," and "drive business growth" are marketing buzzwords stacked on top of each other. Not a single specific feature is named.',
  },
];

export default ALL_CONTENT;
