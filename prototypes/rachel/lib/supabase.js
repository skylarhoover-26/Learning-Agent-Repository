import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getOrCreateUser(slackUserId, name, email) {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .single()

  if (existing) return existing

  const { data } = await supabase
    .from('user_profiles')
    .insert({ slack_user_id: slackUserId, name, email })
    .select()
    .single()

  return data
}

export async function updateUserProfile(slackUserId, updates) {
  const { data } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slack_user_id', slackUserId)
    .select()
    .single()
  return data
}

export async function getUserProfile(slackUserId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .single()
  return data
}

// ── Curriculum ────────────────────────────────────────────────────────────────

export async function saveCurriculum(slackUserId, modules) {
  const { data } = await supabase
    .from('curricula')
    .upsert({ slack_user_id: slackUserId, modules })
    .select()
    .single()

  // Initialize module progress rows
  const progressRows = modules.map((m, i) => ({
    slack_user_id: slackUserId,
    module_index: i,
    module_title: m.title,
    status: i === 0 ? 'in_progress' : 'locked'
  }))

  await supabase
    .from('module_progress')
    .upsert(progressRows, { onConflict: 'slack_user_id,module_index' })

  return data
}

export async function getCurriculum(slackUserId) {
  const { data } = await supabase
    .from('curricula')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .single()
  return data
}

// ── Module Progress ───────────────────────────────────────────────────────────

export async function getModuleProgress(slackUserId) {
  const { data } = await supabase
    .from('module_progress')
    .select('*')
    .eq('slack_user_id', slackUserId)
    .order('module_index')
  return data || []
}

export async function completeModule(slackUserId, moduleIndex, branchChoice) {
  await supabase
    .from('module_progress')
    .update({
      status: 'complete',
      branch_choice: branchChoice,
      completed_at: new Date().toISOString()
    })
    .eq('slack_user_id', slackUserId)
    .eq('module_index', moduleIndex)

  // Unlock next module
  await supabase
    .from('module_progress')
    .update({ status: 'in_progress' })
    .eq('slack_user_id', slackUserId)
    .eq('module_index', moduleIndex + 1)
    .eq('status', 'locked')
}

// ── Companion Sessions ────────────────────────────────────────────────────────

export async function incrementCompanionCount(slackUserId) {
  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('companion_sessions')
    .upsert(
      { slack_user_id: slackUserId, date: today, question_count: 1, last_active: new Date().toISOString() },
      {
        onConflict: 'slack_user_id,date',
        ignoreDuplicates: false
      }
    )

  await supabase.rpc('increment_question_count', { p_user_id: slackUserId, p_date: today })
}

// ── Dashboard Data ────────────────────────────────────────────────────────────

export async function getDashboardData(slackUserId) {
  const [profile, curriculum, progress, sessions] = await Promise.all([
    getUserProfile(slackUserId),
    getCurriculum(slackUserId),
    getModuleProgress(slackUserId),
    supabase.from('companion_sessions').select('question_count').eq('slack_user_id', slackUserId)
  ])

  const totalQuestions = (sessions.data || []).reduce((sum, s) => sum + s.question_count, 0)
  const completed = progress.filter(p => p.status === 'complete').length
  const total = progress.length || 5
  const pct = Math.round((completed / total) * 100)

  return { profile, curriculum, progress, completed, total, pct, totalQuestions }
}

// ── Org-wide (Manager / Executive) ───────────────────────────────────────────

export async function getOrgStats() {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('slack_user_id, name, role, onboarding_complete')

  const { data: progress } = await supabase
    .from('module_progress')
    .select('slack_user_id, status')

  const byUser = {}
  for (const p of progress || []) {
    if (!byUser[p.slack_user_id]) byUser[p.slack_user_id] = { complete: 0, total: 0 }
    byUser[p.slack_user_id].total++
    if (p.status === 'complete') byUser[p.slack_user_id].complete++
  }

  return (profiles || []).map(u => ({
    ...u,
    modulesComplete: byUser[u.slack_user_id]?.complete || 0,
    modulesTotal: byUser[u.slack_user_id]?.total || 5,
    pct: Math.round(((byUser[u.slack_user_id]?.complete || 0) / (byUser[u.slack_user_id]?.total || 5)) * 100)
  }))
}
