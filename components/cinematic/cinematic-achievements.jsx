'use client';

import Link from 'next/link';
import { useProgression } from '@/components/progression-provider';
import { getLevelTitle } from '@/lib/level-titles';
import { Award, Flame, Sparkles, Lock } from 'lucide-react';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const XP_SOURCE_LABELS = {
  first_login: 'Welcome bonus',
  lesson_complete: 'Lesson completed',
  quick_tip: 'Quick tip finished',
  quick_lesson: 'Quick lesson completed',
  deep_dive: 'Deep dive completed',
  game_complete: 'Game completed',
  quiz_correct: 'Quiz answered',
  streak_day: 'Daily streak',
  project_milestone: 'Project milestone',
  goal_set: 'Goal set',
  quest_complete: 'Quest completed',
  chat: 'Chatted with the coach',
  chat_message: 'Chatted with the coach',
  review_correct: 'Review answered',
  admin_grant: 'Granted by an admin',
  admin_correction: 'Balance adjusted',
};
function xpSourceLabel(source) {
  if (XP_SOURCE_LABELS[source]) return XP_SOURCE_LABELS[source];
  if (!source) return 'Experience earned';
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const BADGE_CATEGORIES = [
  {
    title: 'Learning milestones', tint: '#3B94FF', badges: [
      { id: 'first_lesson', name: 'First Steps', emoji: '🎓', description: 'Complete your first lesson', href: '/lesson' },
      { id: 'three_lessons', name: 'Getting Going', emoji: '📚', description: 'Complete 3 lessons', href: '/lesson' },
      { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓', description: 'Complete 10 lessons', href: '/lesson' },
    ],
  },
  {
    title: 'Streaks', tint: '#FF7A45', badges: [
      { id: 'three_day_streak', name: 'On Fire', emoji: '🔥', description: 'Learn 3 days in a row', href: '/lesson' },
      { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡', description: 'Learn 7 days in a row', href: '/lesson' },
    ],
  },
  {
    title: 'Quiz & mastery', tint: '#1AA06A', badges: [
      { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️', description: 'Answer your first quiz question', href: '/lesson' },
      { id: 'quiz_master', name: 'Quiz Master', emoji: '💯', description: 'Get 10 quiz answers correct', href: '/lesson' },
      { id: 'first_game', name: 'Game On', emoji: '🎮', description: 'Play your first learning game', href: '/games' },
      { id: 'five_games', name: 'High Scorer', emoji: '🕹️', description: 'Play 5 learning games', href: '/games' },
    ],
  },
  {
    title: 'Projects', tint: '#FFB706', badges: [
      { id: 'first_project', name: 'Goal Getter', emoji: '🎯', description: 'Add your first work project', href: '/projects' },
    ],
  },
  {
    title: 'Level up', tint: '#6AABFF', badges: [
      { id: 'level_5', name: 'Power Learner', emoji: '🚀', description: 'Reach Level 5', href: '/lesson' },
      { id: 'level_10', name: 'Double Digits', emoji: '🔟', description: 'Reach Level 10', href: '/lesson' },
      { id: 'level_25', name: 'Quarter Way', emoji: '🌟', description: 'Reach Level 25', href: '/lesson' },
      { id: 'level_50', name: 'Halfway Hero', emoji: '🏔️', description: 'Reach Level 50', href: '/lesson' },
    ],
  },
];

const TOTAL_BADGES = BADGE_CATEGORIES.reduce((n, c) => n + c.badges.length, 0);

function BadgeTile({ badge, earned, tint }) {
  return (
    <div className="cine-glass cine-lift rounded-2xl p-4 flex flex-col items-center text-center" style={{ opacity: earned ? 1 : 0.9 }} title={badge.description}>
      <div
        className="relative w-14 h-14 rounded-full grid place-items-center text-2xl mb-2"
        style={earned
          ? { background: `radial-gradient(circle at 35% 30%, #fff6, ${tint}), ${tint}`, boxShadow: `0 0 22px -4px ${tint}` }
          : { background: 'var(--glass)', border: '1px solid var(--line)' }}
      >
        {/* Always show the emoji (like the Library) — desaturated + a small lock
            corner when the badge is still locked, so the gallery has personality
            instead of a wall of padlocks. */}
        <span style={earned ? undefined : { filter: 'grayscale(1)', opacity: 0.55 }}>{badge.emoji}</span>
        {!earned && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center" style={{ background: 'var(--navbg)', border: '1px solid var(--line)' }}>
            <Lock className="w-2.5 h-2.5" style={{ color: 'var(--ink-dim)' }} />
          </span>
        )}
      </div>
      <p className="font-display font-bold text-sm leading-tight">{badge.name}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-dim)' }}>{badge.description}</p>
    </div>
  );
}

export default function CinematicAchievements() {
  const prog = useProgression();

  // Match prod: show a skeleton until progression data has hydrated, so badges
  // and XP don't flash empty/locked on first paint.
  if (!prog?.isLoaded) {
    return (
      <CinematicShell>
        <div className="cine-rise space-y-6">
          <div className="h-44 rounded-3xl cine-glass animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl cine-glass animate-pulse" />
            ))}
          </div>
        </div>
      </CinematicShell>
    );
  }

  const lp = prog?.levelProgress || { level: 1, percent: 0, xpToNext: 100 };
  const level = lp.level || prog?.level || 1;
  const title = getLevelTitle(level);
  const totalXp = prog?.totalXp ?? 0;
  const streak = prog?.streak ?? 0;
  const earnedIds = new Set((prog?.badgesEarned || []).map((b) => b.badge_id));
  const earnedCount = earnedIds.size;
  const recentXp = (prog?.xpEvents || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  return (
    <CinematicShell>
      {/* Tighter internal spacing than the shell's default (space-y-20) so the
          badge categories sit close together, like the heatmap. */}
      <div className="space-y-10 sm:space-y-12">
      {/* LEVEL HERO */}
      <section className="cine-rise cine-glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative w-24 h-24 rounded-3xl grid place-items-center font-display font-extrabold text-4xl shrink-0" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)', color: '#0A2443', boxShadow: '0 0 34px -6px var(--gold)' }}>
            {level}
            <span className="absolute -bottom-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>LV</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-extrabold text-3xl">{title}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>Level {level} · {totalXp.toLocaleString()} total XP</p>
            <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ background: 'var(--glass)' }}>
              <div className="h-full rounded-full" style={{ width: `${lp.percent || 0}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', boxShadow: '0 0 12px var(--accent)' }} />
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
              {lp.xpToNext ? `${lp.xpToNext} XP to Level ${level + 1}` : `You're at the top — keep going!`}
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-1 gap-3 sm:w-44 shrink-0">
            <div className="cine-glass rounded-xl px-3 py-2 flex items-center gap-2"><Award className="w-4 h-4" style={{ color: 'var(--gold)' }} /><span className="text-sm font-bold">{earnedCount}/{TOTAL_BADGES}</span><span className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>badges</span></div>
            <div className="cine-glass rounded-xl px-3 py-2 flex items-center gap-2"><Flame className="w-4 h-4" style={{ color: '#FF7A45' }} /><span className="text-sm font-bold">{streak}</span><span className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>streak</span></div>
            <div className="cine-glass rounded-xl px-3 py-2 flex items-center gap-2"><Sparkles className="w-4 h-4" style={{ color: 'var(--accent2)' }} /><span className="text-sm font-bold">{totalXp.toLocaleString()}</span><span className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>XP</span></div>
          </div>
        </div>
      </section>

      {/* BADGE GALLERY */}
      {BADGE_CATEGORIES.map((cat) => (
        <section key={cat.title} className="cine-rise">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.tint, boxShadow: `0 0 8px ${cat.tint}` }} />
            <h2 className="font-display font-bold">{cat.title}</h2>
            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
              {cat.badges.filter((b) => earnedIds.has(b.id)).length}/{cat.badges.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {cat.badges.map((b) => (
              <Link key={b.id} href={b.href || '/lesson'}>
                <BadgeTile badge={b} earned={earnedIds.has(b.id)} tint={cat.tint} />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* RECENT XP */}
      {recentXp.length > 0 && (
        <section className="cine-rise">
          <h2 className="font-display font-bold mb-3">Recent XP</h2>
          <div className="cine-glass rounded-2xl divide-y" style={{ borderColor: 'var(--line)' }}>
            {recentXp.map((e, i) => {
              // Admin grants/corrections carry a reason and attribution — surface
              // them so the XP history is auditable (matches prod).
              const isAdminEvent = e.source === 'admin_grant' || e.source === 'admin_correction';
              const reason = e.meta?.reason;
              const by = e.meta?.by;
              return (
                <div key={e.id || i} className="flex items-center justify-between px-4 py-3" style={{ borderColor: 'var(--line)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{xpSourceLabel(e.source)}</p>
                    {isAdminEvent && reason && (
                      <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>“{reason}”</p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                      {isAdminEvent && by ? `by ${by}` : ''}
                      {isAdminEvent && by && e.created_at ? ' · ' : ''}
                      {e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: (e.amount || 0) >= 0 ? 'var(--good)' : '#e0556b' }}>
                    {(e.amount || 0) >= 0 ? '+' : ''}{e.amount || 0} XP
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      </div>
      <div className="pb-6" />
    </CinematicShell>
  );
}
