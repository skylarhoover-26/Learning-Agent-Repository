import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-20250514'

// ── Curriculum Generation ─────────────────────────────────────────────────────

export async function generateCurriculum(profile) {
  const { name, role, experience_level, learning_goal } = profile

  const prompt = `You are an AI learning curriculum designer. Create a personalized 5-module curriculum.

Learner: ${name}
Role: ${role}
Experience: ${experience_level}
Goal: ${learning_goal}

Respond ONLY with valid JSON, no other text:
{
  "greeting": "Warm 2-sentence welcome referencing their role and goal",
  "modules": [
    {"title": "Module title", "description": "One sentence tailored to their role", "duration": "X mins"},
    {"title": "Module title", "description": "One sentence tailored to their role", "duration": "X mins"},
    {"title": "Module title", "description": "One sentence tailored to their role", "duration": "X mins"},
    {"title": "Module title", "description": "One sentence tailored to their role", "duration": "X mins"},
    {"title": "Module title", "description": "One sentence tailored to their role", "duration": "X mins"}
  ]
}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: 'You are an AI curriculum designer. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

// ── Module Content + Branching ────────────────────────────────────────────────

export async function generateModuleContent(module, profile) {
  const { name, role, experience_level } = profile

  const prompt = `You are an adaptive AI learning tutor. Create an engaging lesson with a branching scenario.

Learner: ${name}, Role: ${role}, Experience: ${experience_level}
Module: "${module.title}" — ${module.description}

Respond ONLY with valid JSON:
{
  "lesson": "2-3 sentence explanation tailored to their role, conversational tone",
  "scenario": "A realistic workplace scenario from ${role} that tests this concept. 2-3 sentences.",
  "options": [
    {"label": "A", "text": "First choice ~10 words", "outcome": "correct"},
    {"label": "B", "text": "Second choice ~10 words", "outcome": "good"},
    {"label": "C", "text": "Third choice ~10 words", "outcome": "learning"},
    {"label": "D", "text": "I'm not sure — explain my options", "outcome": "help"}
  ]
}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: 'You are an adaptive AI learning tutor. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = response.content[0].text.replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

// ── Branch Response ───────────────────────────────────────────────────────────

export async function generateBranchResponse(choice, option, moduleName, profile) {
  const prompt = `A learner in ${profile.role} chose "${choice}" (outcome: ${option.outcome}) for module "${moduleName}".

Write 2-3 sentences: acknowledge their choice, explain why it's ${
    option.outcome === 'correct' ? 'excellent' :
    option.outcome === 'good' ? 'a solid approach' :
    option.outcome === 'learning' ? 'understandable but there is a better way' :
    'a great instinct to ask — here is what each option leads to'
  }, and give one practical takeaway they can use tomorrow. Be warm, specific, and concise.`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: 'You are a warm, encouraging AI learning tutor. Be concise and practical.',
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].text
}

// ── Companion (free-form Q&A) ─────────────────────────────────────────────────

export async function companionResponse(question, profile, conversationHistory = []) {
  const systemPrompt = `You are an expert AI learning companion for ${profile.name}, who works in ${profile.role}.
You help them understand AI tools, techniques, and trends. You have broad knowledge of AI developments up to your training cutoff.
Keep responses conversational, practical, and under 150 words. Use plain text only — no markdown formatting since this is Slack.
End with a brief follow-up question or suggestion when relevant.`

  const messages = [
    ...conversationHistory.slice(-6),
    { role: 'user', content: question }
  ]

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: systemPrompt,
    messages
  })

  return response.content[0].text
}

// ── Quick Channel Answer ──────────────────────────────────────────────────────

export async function quickAnswer(question, userName, userRole) {
  const prompt = `${userName} (${userRole}) asked in a Slack channel: "${question}"

Give a helpful, concise answer in 2-3 sentences. Plain text only, no markdown. Be practical and specific to their role.`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: 'You are a helpful AI expert. Respond concisely in plain text suitable for Slack.',
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].text
}
