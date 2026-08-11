// Server-side personalization for the Slack bot. Turns an app email into the
// real per-user data the bot shows inline (leaderboard rank, XP, level) and
// builds the "quick pivot + deep link back to the app" messages the coach uses.
//
// Server-only: pulls the identity profile from blob and the leaderboard from
// its cached Supabase-backed source. Never throws — returns safe fallbacks so a
// data hiccup degrades to a link-to-app message instead of an error.

import { getUserData } from './blob-store';
import { getLeaderboard } from './leaderboard';
import { readStanding } from './progression-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

// Load the real, reliably-server-available slice of a learner's standing:
// XP, level, leaderboard rank, and now the streak too (progression-server reads
// the XP and lesson ledgers, which is what a streak is derived from — it used to
// be browser-only).
export async function getLearnerSnapshot(email) {
  const snapshot = {
    email,
    profile: null,
    rank: null,
    totalXp: 0,
    level: 1,
    totalPeople: 0,
    onBoard: false,
    streak: 0,
  };
  if (!email) return snapshot;
  try {
    const stored = await getUserData(email, 'profile');
    snapshot.profile = stored?.data || stored || null;
  } catch (error) {
    console.error('getLearnerSnapshot profile load failed:', error);
  }
  try {
    const { people } = await getLeaderboard();
    const id = email.toLowerCase();
    const idx = (people || []).findIndex((p) => p.learnerId === id);
    snapshot.totalPeople = people?.length || 0;
    if (idx >= 0) {
      snapshot.onBoard = true;
      snapshot.rank = idx + 1;
      snapshot.totalXp = people[idx].totalXp || 0;
      snapshot.level = people[idx].level || 1;
    }
  } catch (error) {
    console.error('getLearnerSnapshot leaderboard load failed:', error);
  }
  // Streak comes from the ledgers rather than the leaderboard (which only totals
  // XP). It used to be unavailable server-side at all, which is why the blocks
  // below apologised for it and sent people to the app. XP and level are still
  // taken from the leaderboard above so the number and the rank beside it always
  // come from the same snapshot.
  try {
    const standing = await readStanding(email);
    snapshot.streak = standing?.streak || 0;
  } catch (error) {
    console.error('getLearnerSnapshot standing load failed:', error);
  }
  return snapshot;
}

export function firstNameFromProfile(profile, fallback = 'there') {
  return (
    profile?.first_name ||
    profile?.display_name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    fallback
  );
}

// Lightweight intent routing for free-text DMs. Leaderboard / skills / today's-pick
// questions get an instant personalized snapshot (no LLM round-trip); everything
// else falls through to the AI coach. Kept deliberately narrow to avoid hijacking
// genuine questions.
export function detectSnapshotIntent(text) {
  const t = (text || '').toLowerCase();
  if (/\b(leaderboard|my rank|ranking|standings?|where do i (stand|rank)|what.?s my (rank|place)|xp|points|level)\b/.test(t)) {
    return 'leaderboard';
  }
  // Checked BEFORE 'skills' on purpose: "what should I learn today" is really a
  // question about today's pick, and the pick is a better answer than a pointer to
  // the heatmap. Everything here requires an explicit "today"/"pick" reference so
  // a general "what should I learn" still routes to skills.
  if (/\b(today'?s (topic|pick|lesson|learning)|my (daily )?pick|daily pick|what should i (learn|do|study) today|what.{0,24}(topic|lesson|pick).{0,24}today|what.{0,16}today.{0,24}(topic|lesson|pick))\b/.test(t)) {
    return 'pick';
  }
  if (/\b(heat ?map|my skills?|skill (breakdown|gaps?)|what should i learn|weak(est)? (skills?|areas?))\b/.test(t)) {
    return 'skills';
  }
  return null;
}

// Blocks: personalized leaderboard pivot — real rank/XP/level, then a button to
// the full leaderboard in the app.
export function buildLeaderboardBlocks(snapshot) {
  const name = firstNameFromProfile(snapshot.profile);
  const line = snapshot.onBoard
    ? `You're *#${snapshot.rank}* of ${snapshot.totalPeople} — *Level ${snapshot.level}* with *${snapshot.totalXp.toLocaleString()} XP*. 📈`
    : `You're not on the leaderboard yet — finish a lesson or game to get your first XP and claim a spot. 🚀`;
  // A 1-day streak isn't a streak worth naming, so it starts at 2.
  const streakLine = snapshot.streak >= 2
    ? `\n🔥 *${snapshot.streak}-day streak.* Keep it going today.`
    : '';
  return [
    { type: 'header', text: { type: 'plain_text', text: `🏆 ${name}, here's your standing` } },
    { type: 'section', text: { type: 'mrkdwn', text: `${line}${streakLine}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: 'Full leaderboard, podium and department view live in the app.' }] },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View full leaderboard' },
        url: `${APP_URL}/leaderboard`,
        action_id: 'open_leaderboard',
      }],
    },
  ];
}

// Blocks: skills / heatmap pivot. The real per-user heatmap needs client-side
// progression data to compute, so from Slack we give the standing we do have
// and send them to the full heatmap in the app rather than show stale numbers.
export function buildSkillsBlocks(snapshot) {
  const name = firstNameFromProfile(snapshot.profile);
  const dept = snapshot.profile?.department;
  const line = dept
    ? `Your knowledge heatmap tracks your AI skills across your ${dept} work — foundations, application, safety and frontier.`
    : 'Your knowledge heatmap tracks your AI skills across foundations, application, safety and frontier.';
  return [
    { type: 'header', text: { type: 'plain_text', text: `🧠 ${name}, your knowledge heatmap` } },
    { type: 'section', text: { type: 'mrkdwn', text: `${line}\n\nOpen it in the app for the live view of your strengths and gaps, with a lesson suggested for each gap.` } },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View full heatmap' },
        url: `${APP_URL}/heatmap`,
        action_id: 'open_heatmap',
      }],
    },
  ];
}

// Plain-text variants for slash commands (which reply with text, not blocks).
export function buildLeaderboardText(snapshot) {
  const name = firstNameFromProfile(snapshot.profile);
  const body = snapshot.onBoard
    ? `You're *#${snapshot.rank}* of ${snapshot.totalPeople} — Level ${snapshot.level}, ${snapshot.totalXp.toLocaleString()} XP. 📈`
    : `You're not on the leaderboard yet — finish a lesson or game to claim a spot. 🚀`;
  return `🏆 *${name}, here's your standing*\n\n${body}\n\n<${APP_URL}/leaderboard|View the full leaderboard →>`;
}
