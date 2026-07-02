// The four AI-impact self-assessment questions (Personal / Team / Org / AI
// Development). Extracted so both the unified calibration flow and any results
// view can share the same source. Option "D" on the first three questions has a
// null score and triggers a short free-text follow-up that /api/scoring rates.

export const IMPACT_QUESTIONS = [
  {
    dimension: 'personal',
    question: 'Which of these best describes how AI affects your day-to-day output?',
    options: [
      { label: "I haven't really used AI in a meaningful way yet", value: 'A', score: 1 },
      { label: "I've tried a few things, but it hasn't changed how I work", value: 'B', score: 2 },
      { label: 'I use AI for specific tasks and it\'s saving me real time or improving quality', value: 'C', score: 3 },
      { label: 'AI has genuinely changed what I can produce — my work is noticeably better or faster', value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: 'Can you give me a quick example of how AI has changed what you produce or deliver?',
      scoringDimension: 'personal',
    },
  },
  {
    dimension: 'team',
    question: 'Which best describes what\'s happening on your team with AI?',
    options: [
      { label: "People are mostly figuring it out on their own — there's no shared approach", value: 'A', score: 1 },
      { label: "A few of us use AI, but we don't really talk about it or share what's working", value: 'B', score: 2 },
      { label: 'I sometimes share what I\'ve learned and help colleagues try things out', value: 'C', score: 3 },
      { label: 'I actively coach my team on AI — it\'s something I intentionally bring into our work', value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: "What's a recent example of you helping someone on your team use AI more effectively?",
      scoringDimension: 'team',
    },
  },
  {
    dimension: 'org',
    question: 'Can you connect your AI usage to any team goals or broader business outcomes?',
    options: [
      { label: "Not really — I use AI, but I haven't thought about it in terms of goals", value: 'A', score: 1 },
      { label: "Loosely — some of what I do with AI relates to our goals, but I can't point to clear results", value: 'B', score: 2 },
      { label: "Yes — I can point to specific ways AI has helped us move faster or deliver better", value: 'C', score: 3 },
      { label: "Definitely — I've built or shared AI practices that others now use, and I can show the impact", value: 'D', score: null },
    ],
    followUp: {
      trigger: 'D',
      question: "What's an example of AI helping you connect to team goals or broader business outcomes?",
      scoringDimension: 'org',
    },
  },
  {
    dimension: 'development',
    question: 'When it comes to understanding and experimenting with AI — which feels most like you?',
    options: [
      { label: "I know the basics, but I'm still learning what's out there", value: 'A', score: 2 },
      { label: "I use a handful of tools comfortably — I'm consistent but not experimenting much", value: 'B', score: 3 },
      { label: 'I actively try new things and can adapt AI tools to different situations', value: 'C', score: 4 },
      { label: 'I go deep — I understand how models work, I experiment with new techniques, and others come to me for guidance', value: 'D', score: 5 },
    ],
  },
];
