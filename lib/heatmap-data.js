const SKILLS = [
  { category: 'Foundations', name: 'AI Fundamentals', mastery: 82, freshness: 3 },
  { category: 'Foundations', name: 'Prompt Basics', mastery: 75, freshness: 8 },
  { category: 'Foundations', name: 'Customer Comms', mastery: 68, freshness: 45 },
  { category: 'Foundations', name: 'System Prompts', mastery: 30, freshness: 90 },
  { category: 'Application', name: 'Data Privacy', mastery: 55, freshness: 12 },
  { category: 'Application', name: 'Email Drafting', mastery: 88, freshness: 2 },
  { category: 'Application', name: 'Report Writing', mastery: 45, freshness: 30 },
  { category: 'Application', name: 'RAG & Grounding', mastery: 50, freshness: 120 },
  { category: 'Safety', name: 'Eval & Hallucinations', mastery: 60, freshness: 5 },
  { category: 'Safety', name: 'Bias & Fairness', mastery: 15, freshness: 180 },
  { category: 'Safety', name: 'AI Ethics', mastery: 35, freshness: 60 },
  { category: 'Safety', name: 'Compliance', mastery: 50, freshness: 25 },
  { category: 'Frontier', name: 'AI Agents', mastery: 10, freshness: 200 },
  { category: 'Frontier', name: 'Image & Voice', mastery: 25, freshness: 90 },
  { category: 'Frontier', name: 'Reasoning Models', mastery: 5, freshness: 300 },
  { category: 'Frontier', name: 'Multimodal', mastery: 8, freshness: 250 },
];

function findDoThisNowSkill() {
  const candidates = SKILLS
    .filter(s => s.mastery >= 40 && s.freshness > 60)
    .sort((a, b) => b.mastery - a.mastery || b.freshness - a.freshness);
  return candidates[0] || null;
}

export { SKILLS, findDoThisNowSkill };
