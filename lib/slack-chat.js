// The Slack coach "brain" wrapper. Given an inbound DM, it either answers with
// an instant personalized snapshot (leaderboard / skills — no LLM round-trip) or
// routes the message through the app's shared AI chat brain (generateChatReply),
// then adds a deep-link back into the app for anything actionable.
//
// One brain, two front doors: the conversational replies come from the same
// generateChatReply the in-app chat uses, so Slack and the web app stay
// consistent. Server-only.

import { generateChatReply } from './ai';
import {
  getLearnerSnapshot,
  detectSnapshotIntent,
  buildLeaderboardBlocks,
  buildSkillsBlocks,
} from './slack-personalize';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

// Returns { blocks, text, meta }. `text` is the notification/fallback string
// Slack shows where blocks can't render. `meta` is logged with the outbound
// message (source, lessonTopic) for the admin view. `history` is prior turns
// ({role, content}[]) for multi-turn memory.
export async function generateSlackReply({ text, email, history = [] }) {
  const snapshot = await getLearnerSnapshot(email);

  const intent = detectSnapshotIntent(text);
  if (intent === 'leaderboard') {
    return { blocks: buildLeaderboardBlocks(snapshot), text: "Here's your leaderboard standing.", meta: { source: 'leaderboard' } };
  }
  if (intent === 'skills') {
    return { blocks: buildSkillsBlocks(snapshot), text: 'Here is your knowledge heatmap.', meta: { source: 'skills' } };
  }

  try {
    const messages = [...history, { role: 'user', content: text }];
    const { reply, lessonTopic } = await generateChatReply(messages, snapshot.profile);
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: reply } }];
    // If the model surfaced a concrete lesson topic, nudge back into the app to
    // actually take it — Slack answers the question, the app does the activity.
    if (lessonTopic) {
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: `Start a lesson: ${lessonTopic}`.slice(0, 75) },
          url: `${APP_URL}/lesson?topic=${encodeURIComponent(lessonTopic)}`,
          action_id: 'open_lesson',
        }],
      });
    }
    return { blocks, text: reply, meta: { source: 'chat', lessonTopic: lessonTopic || null } };
  } catch (error) {
    console.error('generateSlackReply chat failed:', error);
    const fallback = `I hit a snag answering that. You can always jump into the app to keep learning: ${APP_URL}`;
    return {
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `I hit a snag answering that. You can always <${APP_URL}|jump into the app> to keep learning.` } }],
      text: fallback,
      meta: { source: 'chat', error: 'generate_failed' },
    };
  }
}
