const SKILLS = [
  { category: 'Foundations', name: 'AI Fundamentals', mastery: 0, freshness: 0 },
  { category: 'Foundations', name: 'Prompt Basics', mastery: 0, freshness: 0 },
  { category: 'Foundations', name: 'Customer Comms', mastery: 0, freshness: 0 },
  { category: 'Foundations', name: 'System Prompts', mastery: 0, freshness: 0 },
  { category: 'Application', name: 'Data Privacy', mastery: 0, freshness: 0 },
  { category: 'Application', name: 'Email Drafting', mastery: 0, freshness: 0 },
  { category: 'Application', name: 'Report Writing', mastery: 0, freshness: 0 },
  { category: 'Application', name: 'RAG & Grounding', mastery: 0, freshness: 0 },
  { category: 'Safety', name: 'Eval & Hallucinations', mastery: 0, freshness: 0 },
  { category: 'Safety', name: 'Bias & Fairness', mastery: 0, freshness: 0 },
  { category: 'Safety', name: 'AI Ethics', mastery: 0, freshness: 0 },
  { category: 'Safety', name: 'Compliance', mastery: 0, freshness: 0 },
  { category: 'Frontier', name: 'AI Agents', mastery: 0, freshness: 0 },
  { category: 'Frontier', name: 'Image & Voice', mastery: 0, freshness: 0 },
  { category: 'Frontier', name: 'Reasoning Models', mastery: 0, freshness: 0 },
  { category: 'Frontier', name: 'Multimodal', mastery: 0, freshness: 0 },
];

function findDoThisNowSkill() {
  const candidates = SKILLS
    .filter(s => s.mastery >= 40 && s.freshness > 60)
    .sort((a, b) => b.mastery - a.mastery || b.freshness - a.freshness);
  return candidates[0] || null;
}

export { SKILLS, findDoThisNowSkill };
