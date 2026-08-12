// The four AI-impact questions (Personal / Team / Org / AI Development).
//
// These are a SELF-REPORT, and everything downstream says so. Each question used
// to pair the pick with a written example, and an AI weighed that example against
// the rubric to produce a separate "measured" level. The boxes are gone: people
// hit four essay fields every time they recalibrated and re-typed evidence they
// had already given, which is a lot of friction for a screen most people meet
// twice. Your pick is now the score.
//
// That trade is only honest if the ladder is complete. The options run 1-5
// against the company rubric in lib/scoring-store.js (1 Needs Improving →
// 5 Role Model), so the top option really is the top rung — previously 5 was
// unreachable because it was the level you could only earn with evidence, and
// self-claims stopped at 4.
//
// Keep each option a plain description of what someone actually does. A person
// picking honestly should recognise themselves in exactly one of them.

export const IMPACT_QUESTIONS = [
  {
    dimension: 'personal',
    question: 'Which of these best describes how AI affects your day-to-day output?',
    options: [
      { value: 'A', label: "I haven't really used AI in a meaningful way yet", self: 1 },
      { value: 'B', label: "I've tried a few things, but it hasn't changed how I work", self: 2 },
      { value: 'C', label: "I use AI for specific tasks and it's saving me real time or improving quality", self: 3 },
      { value: 'D', label: 'AI has genuinely changed what I can produce — my work is noticeably better or faster', self: 4 },
      { value: 'E', label: "I've rebuilt how I work around AI — whole parts of my job run differently now", self: 5 },
    ],
  },
  {
    dimension: 'team',
    question: "Which best describes what's happening on your team with AI?",
    options: [
      { value: 'A', label: "People are mostly figuring it out on their own — there's no shared approach", self: 1 },
      { value: 'B', label: "A few of us use AI, but we don't really talk about it or share what's working", self: 2 },
      { value: 'C', label: "I sometimes share what I've learned and help colleagues try things out", self: 3 },
      { value: 'D', label: "I actively coach my team on AI — it's something I intentionally bring into our work", self: 4 },
      { value: 'E', label: 'The way my team works with AI is something I set up, and it stuck', self: 5 },
    ],
  },
  {
    dimension: 'org',
    question: 'Can you connect your AI usage to any team goals or broader business outcomes?',
    options: [
      { value: 'A', label: "Not really — I use AI, but I haven't thought about it in terms of goals", self: 1 },
      { value: 'B', label: "Loosely — some of what I do with AI relates to our goals, but I can't point to clear results", self: 2 },
      { value: 'C', label: 'Yes — I can point to specific ways AI has helped us move faster or deliver better', self: 3 },
      { value: 'D', label: "Definitely — I've built or shared AI practices that others now use, and I can show the impact", self: 4 },
      { value: 'E', label: 'Work I led has changed how teams beyond mine use AI, with results leadership can point to', self: 5 },
    ],
  },
  {
    dimension: 'development',
    question: 'When it comes to understanding and experimenting with AI — which feels most like you?',
    options: [
      { value: 'A', label: "I know the basics, but I'm still learning what's out there", self: 1 },
      { value: 'B', label: "I use a handful of tools comfortably — I'm consistent but not experimenting much", self: 2 },
      { value: 'C', label: 'I actively try new things and can adapt AI tools to different situations', self: 3 },
      { value: 'D', label: 'I go deep — I understand how models work, I experiment with new techniques, and others come to me for guidance', self: 4 },
      { value: 'E', label: 'I set the direction others follow — I teach this and people across the company learn it from me', self: 5 },
    ],
  },
];
