import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { getDashboardData, getOrgStats } from '../../lib/supabase'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { view } = req.query

  // Org-wide stats (for L&D / manager view — add role check here as needed)
  if (view === 'org') {
    const stats = await getOrgStats()
    return res.status(200).json(stats)
  }

  // Individual learner dashboard
  // In production: look up slackUserId from Okta ID via user_profiles table
  // For now, match by email
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('slack_user_id')
    .eq('email', session.user.email)
    .single()

  if (!profile) {
    return res.status(200).json({ profile: { onboarding_complete: false } })
  }

  const data = await getDashboardData(profile.slack_user_id)
  return res.status(200).json(data)
}
