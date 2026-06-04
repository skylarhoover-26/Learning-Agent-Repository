import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetch('/api/dashboard')
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [session])

  if (status === 'loading') return <div style={styles.center}>Loading...</div>

  if (!session) return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.h1}>AI Learning Companion</h1>
        <p style={styles.muted}>Sign in with your org account to view your progress.</p>
        <button style={styles.btn} onClick={() => signIn('okta')}>Sign in with Okta</button>
      </div>
    </div>
  )

  if (loading) return <div style={styles.center}>Loading your dashboard...</div>

  if (!data?.profile?.onboarding_complete) return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.h1}>Welcome, {session.user.name}!</h1>
        <p style={styles.muted}>You haven't started your learning journey yet.</p>
        <p style={styles.muted}>Open Slack and DM the <strong>AI Learning Companion</strong> bot to get started.</p>
      </div>
    </div>
  )

  const { profile, progress, completed, total, pct, totalQuestions } = data

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>AI Learning Companion</h1>
          <p style={styles.muted}>Your personal learning dashboard</p>
        </div>
        <button style={styles.btnOutline} onClick={() => signOut()}>Sign out</button>
      </div>

      <div style={styles.profileRow}>
        <div style={styles.avatar}>{profile.name?.[0] || '?'}</div>
        <div>
          <div style={styles.name}>{profile.name}</div>
          <div style={styles.muted}>{profile.role}</div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Progress" value={`${pct}%`} sub={<ProgressBar pct={pct} />} />
        <StatCard label="Modules complete" value={`${completed}/${total}`} sub="Keep going!" />
        <StatCard label="Questions asked" value={totalQuestions} sub="Via companion" />
      </div>

      <h2 style={styles.h2}>Your curriculum</h2>
      <div style={styles.moduleList}>
        {(progress || []).map((p, i) => (
          <div key={i} style={styles.moduleItem}>
            <span style={styles.moduleIcon}>
              {p.status === 'complete' ? '✅' : p.status === 'in_progress' ? '▶️' : '🔒'}
            </span>
            <span style={styles.moduleTitle}>{p.module_title}</span>
            <span style={{ ...styles.tag, ...(p.status === 'complete' ? styles.tagDone : p.status === 'in_progress' ? styles.tagActive : styles.tagLocked) }}>
              {p.status === 'complete' ? 'Complete' : p.status === 'in_progress' ? 'In progress' : 'Locked'}
            </span>
          </div>
        ))}
      </div>

      <div style={styles.privacyNote}>
        🔒 Your module progress is visible to your manager and L&D team. Your individual questions and searches are private to you only.
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  )
}

function ProgressBar({ pct }) {
  return (
    <div style={styles.barWrap}>
      <div style={{ ...styles.barFill, width: `${pct}%` }} />
    </div>
  )
}

const styles = {
  page: { maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32, maxWidth: 400, textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: '#0f172a' },
  h2: { fontSize: 16, fontWeight: 500, margin: '24px 0 12px', color: '#0f172a' },
  muted: { fontSize: 14, color: '#64748b', margin: '0 0 16px' },
  btn: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#185FA5', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  btnOutline: { padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' },
  profileRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500 },
  name: { fontSize: 16, fontWeight: 500, color: '#0f172a' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#f8fafc', borderRadius: 8, padding: 14 },
  statLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 500, color: '#0f172a' },
  statSub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  barWrap: { height: 6, background: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, background: '#185FA5', borderRadius: 3, transition: 'width 0.4s' },
  moduleList: { display: 'flex', flexDirection: 'column', gap: 8 },
  moduleItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' },
  moduleIcon: { fontSize: 16, width: 20 },
  moduleTitle: { flex: 1, fontSize: 14, color: '#0f172a' },
  tag: { fontSize: 11, padding: '2px 8px', borderRadius: 20 },
  tagDone: { background: '#EAF3DE', color: '#3B6D11' },
  tagActive: { background: '#E6F1FB', color: '#185FA5' },
  tagLocked: { background: '#f1f5f9', color: '#94a3b8' },
  privacyNote: { marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b' }
}
