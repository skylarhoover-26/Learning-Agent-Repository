import { SKILLS } from '@/lib/heatmap-data';
import { GRAPH_NODES, GRAPH_EDGES, findRecommendedNext } from '@/lib/skill-graph-data';

function getFreshnessZone(days) {
  if (days <= 14) return 'fresh';
  if (days <= 60) return 'aging';
  return 'stale';
}

const DAILY_TIPS = [
  "Try the RCTF framework: Role, Context, Task, Format. It structures any prompt for better results.",
  "Before sending an AI-drafted email, read it out loud. If it doesn't sound like you, tweak the tone in your prompt.",
  "When AI gives a wrong answer, don't start over — say 'That's not quite right because...' and guide it.",
  "Use 'Think step by step' at the end of complex prompts. It triggers more thorough reasoning.",
  "Save your best prompts! Building a personal prompt library saves time and improves consistency.",
  "AI is great at first drafts but needs your expertise for final polish. Use it as a starting point, not the end.",
  "When summarizing long documents, tell AI what to focus on: 'Summarize with emphasis on action items and deadlines.'",
];

export async function GET() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

  const staleSkills = SKILLS.filter(s => getFreshnessZone(s.freshness) === 'stale');
  const agingSkills = SKILLS.filter(s => getFreshnessZone(s.freshness) === 'aging');
  const strongSkills = SKILLS.filter(s => s.mastery >= 70);
  const gapSkills = SKILLS.filter(s => s.mastery < 30);

  const avgMastery = Math.round(SKILLS.reduce((sum, s) => sum + s.mastery, 0) / SKILLS.length);

  const recommendedId = findRecommendedNext(GRAPH_NODES, GRAPH_EDGES);
  const recommendedSkill = GRAPH_NODES.find(n => n.id === recommendedId);

  const staleHighValue = SKILLS
    .filter(s => getFreshnessZone(s.freshness) === 'stale' && s.mastery >= 40)
    .sort((a, b) => b.mastery - a.mastery);

  const tipIndex = dayOfYear % DAILY_TIPS.length;

  const digest = {
    date: now.toISOString().split('T')[0],
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    summary: {
      totalSkills: SKILLS.length,
      avgMastery,
      strongCount: strongSkills.length,
      gapCount: gapSkills.length,
      staleCount: staleSkills.length,
      agingCount: agingSkills.length,
    },
    recommendedNext: recommendedSkill
      ? { name: recommendedSkill.name, mastery: recommendedSkill.mastery, category: recommendedSkill.category }
      : null,
    staleHighValue: staleHighValue.slice(0, 3).map(s => ({
      name: s.name, mastery: s.mastery, daysSinceStudy: s.freshness,
    })),
    dailyTip: DAILY_TIPS[tipIndex],
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app',
  };

  return Response.json(digest);
}
