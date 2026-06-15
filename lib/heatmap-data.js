// `level` (beginner | intermediate | advanced) drives tier-aware lesson
// recommendations so a beginner isn't steered to advanced topics like RAG.
const SKILL_DEFS = [
  { category: 'Foundations', name: 'AI Fundamentals', level: 'beginner', keywords: ['ai fundamentals', 'what ai', 'how ai works', 'language model', 'machine learning', 'llm'] },
  { category: 'Foundations', name: 'Prompt Basics', level: 'beginner', keywords: ['prompt', 'rctf', 'prompting', 'how to prompt', 'write a prompt'] },
  { category: 'Foundations', name: 'Customer Comms', level: 'beginner', keywords: ['customer', 'communication', 'comms', 'support', 'customer service', 'response'] },
  { category: 'Foundations', name: 'System Prompts', level: 'intermediate', keywords: ['system prompt', 'instruction', 'persona', 'role prompt'] },
  { category: 'Application', name: 'Data Privacy', level: 'beginner', keywords: ['privacy', 'pii', 'data privacy', 'sensitive data', 'anonymize', 'gdpr'] },
  { category: 'Application', name: 'Email Drafting', level: 'beginner', keywords: ['email', 'draft', 'writing email', 'outreach', 'follow-up'] },
  { category: 'Application', name: 'Report Writing', level: 'beginner', keywords: ['report', 'summary', 'summarize', 'document', 'writing report', 'qbr'] },
  { category: 'Application', name: 'RAG & Grounding', level: 'advanced', keywords: ['rag', 'grounding', 'retrieval', 'knowledge base', 'context window', 'embedding'] },
  { category: 'Safety', name: 'Eval & Hallucinations', level: 'intermediate', keywords: ['hallucination', 'eval', 'evaluation', 'verify', 'accuracy', 'fact check'] },
  { category: 'Safety', name: 'Bias & Fairness', level: 'intermediate', keywords: ['bias', 'fairness', 'discrimination', 'inclusive', 'equitable'] },
  { category: 'Safety', name: 'AI Ethics', level: 'intermediate', keywords: ['ethics', 'ethical', 'responsible ai', 'transparency', 'accountability'] },
  { category: 'Safety', name: 'Compliance', level: 'intermediate', keywords: ['compliance', 'regulation', 'legal', 'policy', 'audit', 'governance'] },
  { category: 'Frontier', name: 'AI Agents', level: 'advanced', keywords: ['agent', 'agents', 'tool use', 'autonomous', 'agentic', 'workflow automation'] },
  { category: 'Frontier', name: 'Image & Voice', level: 'intermediate', keywords: ['image', 'voice', 'vision', 'audio', 'text to speech', 'tts', 'image generation'] },
  { category: 'Frontier', name: 'Reasoning Models', level: 'advanced', keywords: ['reasoning', 'chain of thought', 'thinking', 'o1', 'o3', 'deep thinking'] },
  { category: 'Frontier', name: 'Multimodal', level: 'advanced', keywords: ['multimodal', 'multi-modal', 'video', 'pdf', 'document understanding'] },
];

const MODULE_TO_SKILLS = {
  1: ['AI Fundamentals'],
  2: ['Email Drafting', 'Report Writing'],
  3: ['Prompt Basics', 'System Prompts'],
  4: ['AI Agents', 'RAG & Grounding'],
  5: ['Eval & Hallucinations'],
};

const CALIBRATION_TO_SKILLS = {
  privacy: 'Data Privacy',
  prompting: 'Prompt Basics',
  comms: 'Customer Comms',
  eval: 'Eval & Hallucinations',
  agents: 'AI Agents',
  data: 'Report Writing',
};

function matchTopicToSkill(topic) {
  if (!topic) return null;
  const lower = topic.toLowerCase();
  let bestMatch = null;
  let bestCount = 0;

  for (const skill of SKILL_DEFS) {
    let count = 0;
    for (const kw of skill.keywords) {
      if (lower.includes(kw)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestMatch = skill.name;
    }
  }

  return bestMatch;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function computeSkills({ lessonHistory, moduleProgress, calibrationSkills }) {
  const skillData = {};
  for (const def of SKILL_DEFS) {
    skillData[def.name] = {
      category: def.category,
      name: def.name,
      lessonCount: 0,
      lastStudied: null,
      calibrationScore: null,
      moduleComplete: false,
    };
  }

  if (lessonHistory) {
    for (const lesson of lessonHistory) {
      const skillName = matchTopicToSkill(lesson.topic);
      if (skillName && skillData[skillName]) {
        skillData[skillName].lessonCount++;
        const completedAt = lesson.completed_at;
        if (!skillData[skillName].lastStudied || completedAt > skillData[skillName].lastStudied) {
          skillData[skillName].lastStudied = completedAt;
        }
      }
    }
  }

  if (moduleProgress) {
    for (const [num, skills] of Object.entries(MODULE_TO_SKILLS)) {
      const mod = moduleProgress[num];
      if (mod?.completed) {
        for (const skillName of skills) {
          if (skillData[skillName]) {
            skillData[skillName].moduleComplete = true;
            const completedAt = mod.completedAt;
            if (completedAt && (!skillData[skillName].lastStudied || completedAt > skillData[skillName].lastStudied)) {
              skillData[skillName].lastStudied = completedAt;
            }
          }
        }
      }
    }
  }

  if (calibrationSkills) {
    for (const [key, skillName] of Object.entries(CALIBRATION_TO_SKILLS)) {
      if (calibrationSkills[key] !== undefined && skillData[skillName]) {
        skillData[skillName].calibrationScore = calibrationSkills[key];
      }
    }
  }

  return SKILL_DEFS.map(def => {
    const data = skillData[def.name];
    let mastery = 0;

    const lessonMastery = Math.min(100, data.lessonCount * 15);
    const moduleMastery = data.moduleComplete ? 30 : 0;
    const calMastery = data.calibrationScore !== null ? Math.round(data.calibrationScore * 80) : 0;

    if (data.calibrationScore !== null && data.lessonCount > 0) {
      mastery = Math.min(100, Math.round(calMastery * 0.3 + lessonMastery * 0.4 + moduleMastery * 0.3));
    } else if (data.lessonCount > 0) {
      mastery = Math.min(100, lessonMastery + moduleMastery);
    } else if (data.calibrationScore !== null) {
      mastery = Math.min(100, calMastery);
    } else if (data.moduleComplete) {
      mastery = moduleMastery;
    }

    const freshness = data.lastStudied ? daysSince(data.lastStudied) : -1;

    return {
      category: def.category,
      name: def.name,
      level: def.level,
      mastery,
      freshness,
      hasActivity: data.lessonCount > 0 || data.moduleComplete || data.calibrationScore !== null,
    };
  });
}

const SKILLS = SKILL_DEFS.map(def => ({
  category: def.category,
  name: def.name,
  level: def.level,
  mastery: 0,
  freshness: 0,
}));

function findDoThisNowSkill() {
  return null;
}

export { SKILL_DEFS, SKILLS, findDoThisNowSkill };
