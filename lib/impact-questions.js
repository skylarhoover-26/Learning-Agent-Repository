// The four AI-impact questions (Personal / Team / Org / AI Development). Each is
// a multiple-choice self-claim plus an optional short example. The MC pick gives
// the "self" level (1-5); the example is the evidence the AI weighs against the
// competency rubric (lib/ai-competencies.js) to synthesize the "measured" score
// and a short "why". Shared by the unified calibration flow and any results view.

export const IMPACT_QUESTIONS = [
  {
    dimension: 'personal',
    question: 'Which of these best describes how AI affects your day-to-day output?',
    example: 'Give a quick example of how AI has changed what you produce or deliver.',
    options: [
      { value: 'A', label: "I haven't really used AI in a meaningful way yet", self: 1 },
      { value: 'B', label: "I've tried a few things, but it hasn't changed how I work", self: 2 },
      { value: 'C', label: "I use AI for specific tasks and it's saving me real time or improving quality", self: 3 },
      { value: 'D', label: 'AI has genuinely changed what I can produce — my work is noticeably better or faster', self: 4 },
    ],
  },
  {
    dimension: 'team',
    question: "Which best describes what's happening on your team with AI?",
    example: "Give a recent example of you helping someone on your team use AI more effectively (or note if you don't have one yet).",
    options: [
      { value: 'A', label: "People are mostly figuring it out on their own — there's no shared approach", self: 1 },
      { value: 'B', label: "A few of us use AI, but we don't really talk about it or share what's working", self: 2 },
      { value: 'C', label: "I sometimes share what I've learned and help colleagues try things out", self: 3 },
      { value: 'D', label: "I actively coach my team on AI — it's something I intentionally bring into our work", self: 4 },
    ],
  },
  {
    dimension: 'org',
    question: 'Can you connect your AI usage to any team goals or broader business outcomes?',
    example: 'Give an example of AI helping you connect to team goals or broader business outcomes.',
    options: [
      { value: 'A', label: "Not really — I use AI, but I haven't thought about it in terms of goals", self: 1 },
      { value: 'B', label: "Loosely — some of what I do with AI relates to our goals, but I can't point to clear results", self: 2 },
      { value: 'C', label: 'Yes — I can point to specific ways AI has helped us move faster or deliver better', self: 3 },
      { value: 'D', label: "Definitely — I've built or shared AI practices that others now use, and I can show the impact", self: 4 },
    ],
  },
  {
    dimension: 'development',
    question: 'When it comes to understanding and experimenting with AI — which feels most like you?',
    example: "What's an example of you learning, experimenting with, or adapting AI tools and techniques?",
    options: [
      { value: 'A', label: "I know the basics, but I'm still learning what's out there", self: 1 },
      { value: 'B', label: "I use a handful of tools comfortably — I'm consistent but not experimenting much", self: 2 },
      { value: 'C', label: 'I actively try new things and can adapt AI tools to different situations', self: 3 },
      { value: 'D', label: 'I go deep — I understand how models work, I experiment with new techniques, and others come to me for guidance', self: 4 },
    ],
  },
];
