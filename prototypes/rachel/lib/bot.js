import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile,
  saveCurriculum,
  getCurriculum,
  getModuleProgress,
  completeModule,
  incrementCompanionCount,
  getDashboardData
} from './supabase'

import {
  generateCurriculum,
  generateModuleContent,
  generateBranchResponse,
  companionResponse,
  quickAnswer
} from './claude'

// ── In-memory session state (conversation context within a session) ────────────
// For production scale, replace with Redis or Supabase
const sessions = new Map()

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { step: null, data: {}, history: [] })
  return sessions.get(userId)
}

// ── Onboarding Flow ───────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    key: 'role',
    question: 'What best describes your role?',
    options: [
      'Marketing & Communications',
      'Sales & Customer Success',
      'Operations & Admin',
      'Engineering & Product',
      'People & HR',
      'Finance & Legal',
      'Leadership & Strategy',
      'Other'
    ]
  },
  {
    key: 'experience_level',
    question: 'How would you describe your current experience with AI tools?',
    options: [
      'Complete beginner — I\'ve barely used AI',
      'Curious explorer — I\'ve tried a few things',
      'Regular user — I use AI tools several times a week',
      'Power user — AI is core to how I work'
    ]
  },
  {
    key: 'learning_goal',
    question: 'What\'s your biggest goal for this learning journey?',
    options: [
      'Understand what AI can actually do',
      'Save time on daily tasks using AI',
      'Learn to write better prompts',
      'Stay current as AI keeps evolving',
      'Help my team adopt AI effectively'
    ]
  }
]

export async function handleDM(client, event, slackUserId, userName, userEmail) {
  const text = event.text?.trim() || ''
  const channelId = event.channel

  // Get or create user
  const user = await getOrCreateUser(slackUserId, userName, userEmail)
  const session = getSession(slackUserId)

  // ── New user: start onboarding ────────────────────────────────────────────
  if (!user.onboarding_complete) {
    return handleOnboarding(client, channelId, slackUserId, user, session, text)
  }

  // ── Existing user: handle commands or learning ────────────────────────────
  const lower = text.toLowerCase()

  if (lower === '/dashboard' || lower === 'dashboard' || lower === 'my progress') {
    return sendDashboard(client, channelId, slackUserId)
  }

  if (lower === '/curriculum' || lower === 'my curriculum' || lower === 'curriculum') {
    return sendCurriculumOverview(client, channelId, slackUserId)
  }

  if (lower === '/continue' || lower === 'continue' || lower === 'next module') {
    return continuelearning(client, channelId, slackUserId)
  }

  // ── Module branch choice (A/B/C/D) ───────────────────────────────────────
  if (session.step === 'awaiting_branch' && ['a', 'b', 'c', 'd'].includes(lower)) {
    return handleBranchChoice(client, channelId, slackUserId, session, lower)
  }

  // ── Default: companion mode ───────────────────────────────────────────────
  return handleCompanion(client, channelId, slackUserId, text, session)
}

// ── Onboarding Handler ────────────────────────────────────────────────────────

async function handleOnboarding(client, channelId, slackUserId, user, session, text) {
  // First message — welcome
  if (!session.step) {
    session.step = 'onboarding_0'
    await client.chat.postMessage({
      channel: channelId,
      text: `👋 Welcome to the AI Learning Companion, ${user.name}!\n\nI'll build you a personalized learning curriculum based on your role and goals. It only takes a minute to get set up.\n\nLet's start: ${ONBOARDING_STEPS[0].question}`,
      blocks: buildOptionsBlocks(ONBOARDING_STEPS[0].question, ONBOARDING_STEPS[0].options)
    })
    return
  }

  // Process onboarding step answers
  const stepIndex = parseInt(session.step.split('_')[1])
  const currentStep = ONBOARDING_STEPS[stepIndex]

  // Find matching option (button value or typed text)
  const matched = currentStep.options.find(
    o => o.toLowerCase() === text.toLowerCase() || text === o
  )
  const answer = matched || text

  session.data[currentStep.key] = answer

  const nextIndex = stepIndex + 1

  if (nextIndex < ONBOARDING_STEPS.length) {
    session.step = `onboarding_${nextIndex}`
    const next = ONBOARDING_STEPS[nextIndex]
    await client.chat.postMessage({
      channel: channelId,
      blocks: buildOptionsBlocks(next.question, next.options)
    })
  } else {
    // All onboarding done — generate curriculum
    session.step = 'generating'
    await client.chat.postMessage({ channel: channelId, text: '✨ Building your personalized curriculum...' })

    await updateUserProfile(slackUserId, {
      role: session.data.role,
      experience_level: session.data.experience_level,
      learning_goal: session.data.learning_goal,
      onboarding_complete: true
    })

    const profile = await getUserProfile(slackUserId)

    try {
      const result = await generateCurriculum(profile)
      await saveCurriculum(slackUserId, result.modules)

      const moduleList = result.modules
        .map((m, i) => `${i + 1}. *${m.title}* — ${m.description} _(${m.duration})_`)
        .join('\n')

      await client.chat.postMessage({
        channel: channelId,
        text: `${result.greeting}\n\nHere's your learning path:\n\n${moduleList}\n\nReady to start? Type *continue* to begin Module 1, or ask me anything about AI anytime.`
      })
    } catch (e) {
      await client.chat.postMessage({
        channel: channelId,
        text: `Your curriculum is ready! Type *continue* to start learning, or ask me any AI question anytime.`
      })
    }

    session.step = 'ready'
  }
}

// ── Learning Flow ─────────────────────────────────────────────────────────────

async function continuelearning(client, channelId, slackUserId) {
  const progress = await getModuleProgress(slackUserId)
  const curriculum = await getCurriculum(slackUserId)

  if (!curriculum || !progress.length) {
    await client.chat.postMessage({ channel: channelId, text: 'Your curriculum is still being set up. Try again in a moment!' })
    return
  }

  const currentModule = progress.find(p => p.status === 'in_progress')

  if (!currentModule) {
    const allDone = progress.every(p => p.status === 'complete')
    if (allDone) {
      await client.chat.postMessage({
        channel: channelId,
        text: '🎉 You\'ve completed your entire curriculum! You\'re building real AI confidence. Keep asking me questions anytime — type *dashboard* to see your progress.'
      })
    } else {
      await client.chat.postMessage({ channel: channelId, text: 'No active module found. Type *dashboard* to check your progress.' })
    }
    return
  }

  const moduleData = curriculum.modules[currentModule.module_index]
  const session = getSession(slackUserId)

  await client.chat.postMessage({
    channel: channelId,
    text: `📚 *Module ${currentModule.module_index + 1}: ${moduleData.title}*\n\n_${moduleData.description}_\n\nLoading your lesson...`
  })

  try {
    const profile = await getUserProfile(slackUserId)
    const content = await generateModuleContent(moduleData, profile)

    session.step = 'awaiting_branch'
    session.data.currentModuleIndex = currentModule.module_index
    session.data.currentOptions = content.options

    await client.chat.postMessage({
      channel: channelId,
      text: `${content.lesson}\n\n*Scenario:* ${content.scenario}\n\nHow do you respond?\n\n*A.* ${content.options[0].text}\n*B.* ${content.options[1].text}\n*C.* ${content.options[2].text}\n*D.* ${content.options[3].text}\n\nReply with A, B, C, or D.`
    })
  } catch (e) {
    await client.chat.postMessage({
      channel: channelId,
      text: `Let\'s dive into *${moduleData.title}*. What aspect would you like to explore? Or type A, B, C, D to make a choice once the scenario loads.`
    })
  }
}

async function handleBranchChoice(client, channelId, slackUserId, session, choice) {
  const optionIndex = ['a', 'b', 'c', 'd'].indexOf(choice)
  const option = session.data.currentOptions?.[optionIndex]
  const moduleIndex = session.data.currentModuleIndex
  const curriculum = await getCurriculum(slackUserId)
  const moduleData = curriculum?.modules?.[moduleIndex]

  if (!option || !moduleData) {
    await client.chat.postMessage({ channel: channelId, text: 'Please type continue to load a module first.' })
    return
  }

  await client.chat.postMessage({ channel: channelId, text: '...' })

  try {
    const profile = await getUserProfile(slackUserId)
    const feedback = await generateBranchResponse(option.text, option, moduleData.title, profile)
    await completeModule(slackUserId, moduleIndex, option.text)

    const progress = await getModuleProgress(slackUserId)
    const nextModule = progress.find(p => p.status === 'in_progress')
    const allDone = progress.every(p => p.status === 'complete' || p.module_index > moduleIndex + 1)

    session.step = 'ready'

    let followUp = nextModule
      ? `\n\n✅ *Module ${moduleIndex + 1} complete!* Type *continue* when you\'re ready for Module ${moduleIndex + 2}.`
      : `\n\n🎉 *You\'ve completed all your modules!* Type *dashboard* to see your full progress.`

    await client.chat.postMessage({
      channel: channelId,
      text: feedback + followUp
    })
  } catch (e) {
    await client.chat.postMessage({ channel: channelId, text: 'Great choice! Type *continue* to move to the next module.' })
    session.step = 'ready'
  }
}

// ── Companion Mode ────────────────────────────────────────────────────────────

async function handleCompanion(client, channelId, slackUserId, text, session) {
  if (!text) return

  await incrementCompanionCount(slackUserId).catch(() => {})

  try {
    const profile = await getUserProfile(slackUserId)
    const reply = await companionResponse(text, profile, session.history)

    session.history.push({ role: 'user', content: text })
    session.history.push({ role: 'assistant', content: reply })
    if (session.history.length > 12) session.history = session.history.slice(-12)

    await client.chat.postMessage({ channel: channelId, text: reply })
  } catch (e) {
    await client.chat.postMessage({
      channel: channelId,
      text: 'I had a moment of trouble. Could you try asking again?'
    })
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function sendDashboard(client, channelId, slackUserId) {
  const { profile, progress, completed, total, pct, totalQuestions } = await getDashboardData(slackUserId)

  const bar = buildProgressBar(pct)
  const moduleLines = progress.map(p => {
    const icon = p.status === 'complete' ? '✅' : p.status === 'in_progress' ? '▶️' : '🔒'
    return `${icon} ${p.module_title}`
  }).join('\n')

  await client.chat.postMessage({
    channel: channelId,
    text: `📊 *Your Learning Dashboard*\n\n*${profile.name}* — ${profile.role}\n\n*Progress:* ${bar} ${pct}%\n*Modules complete:* ${completed}/${total}\n*Questions asked:* ${totalQuestions}\n\n*Your curriculum:*\n${moduleLines}\n\n_Note: Your individual questions are private. Only your module progress is visible to your manager and L&D team._`
  })
}

async function sendCurriculumOverview(client, channelId, slackUserId) {
  const curriculum = await getCurriculum(slackUserId)
  const progress = await getModuleProgress(slackUserId)

  if (!curriculum) {
    await client.chat.postMessage({ channel: channelId, text: 'Your curriculum hasn\'t been generated yet. Say hi to get started!' })
    return
  }

  const lines = curriculum.modules.map((m, i) => {
    const p = progress.find(p => p.module_index === i)
    const icon = p?.status === 'complete' ? '✅' : p?.status === 'in_progress' ? '▶️' : '🔒'
    return `${icon} *${m.title}* — ${m.description} _(${m.duration})_`
  }).join('\n')

  await client.chat.postMessage({
    channel: channelId,
    text: `📚 *Your Curriculum*\n\n${lines}\n\nType *continue* to pick up where you left off.`
  })
}

// ── Channel Mention Handler ───────────────────────────────────────────────────

export async function handleMention(client, event, slackUserId, userName) {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()
  const channelId = event.channel

  if (!text) {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      text: `Hi ${userName}! Ask me any AI question here, or DM me for your personalized learning curriculum.`
    })
    return
  }

  const profile = await getUserProfile(slackUserId)
  const role = profile?.role || 'professional'

  try {
    const answer = await quickAnswer(text, userName, role)
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      text: `${answer}\n\n_DM me for your personalized AI learning curriculum._`
    })
  } catch (e) {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      text: 'I had trouble with that one — could you try again?'
    })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOptionsBlocks(question, options) {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: question }
    },
    {
      type: 'actions',
      elements: options.map(opt => ({
        type: 'button',
        text: { type: 'plain_text', text: opt, emoji: false },
        value: opt,
        action_id: `option_${opt.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`
      }))
    }
  ]
}

function buildProgressBar(pct) {
  const filled = Math.round(pct / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}
