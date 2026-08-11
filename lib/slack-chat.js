// The Slack coach "brain" wrapper. Given an inbound DM, it either answers with
// an instant personalized snapshot (leaderboard / skills / today's pick — no LLM
// round-trip) or routes the message through the app's shared AI chat brain
// (generateChatReply), then adds a deep-link back into the app for anything
// actionable.
//
// One brain, two front doors: the conversational replies come from the same
// generateChatReply the in-app chat uses, so Slack and the web app stay
// consistent. What Slack adds on top is TODAY'S PICK — the bot used to have no
// idea what the lesson it DM'd you that morning was about, so questions about it
// were answered from thin air. Server-only.

import { generateChatReply } from './ai';
import {
  getLearnerSnapshot,
  detectSnapshotIntent,
  buildLeaderboardBlocks,
  buildSkillsBlocks,
} from './slack-personalize';
import { loadPickContext, formatPickContext, buildPickBlocks } from './slack-pick-context';
import { isSlackLessonEnabled } from './slack-lesson-config';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

// Returns { blocks, text, meta }. `text` is the notification/fallback string
// Slack shows where blocks can't render. `meta` is logged with the outbound
// message (source, lessonTopic) for the admin view. `history` is prior turns
// ({role, content}[]) for multi-turn memory. `session` is an in-progress Slack
// lesson, when there is one, so "I'm stuck" can be answered about the right step.
export async function generateSlackReply({ text, email, history = [], session = null }) {
  const snapshot = await getLearnerSnapshot(email);
  const profile = { ...(snapshot.profile || {}), email };

  const intent = detectSnapshotIntent(text);
  if (intent === 'leaderboard') {
    return { blocks: buildLeaderboardBlocks(snapshot), text: "Here's your leaderboard standing.", meta: { source: 'leaderboard' } };
  }
  if (intent === 'skills') {
    return { blocks: buildSkillsBlocks(snapshot), text: 'Here is your knowledge heatmap.', meta: { source: 'skills' } };
  }

  // Today's pick is loaded for BOTH branches below: the direct "what's today's
  // topic" answer renders it as blocks, and everything else feeds it to the model
  // as context. One read either way.
  const pickContext = email ? await loadPickContext(profile) : null;

  if (intent === 'pick') {
    const slackLessonEnabled = await isSlackLessonEnabled().catch(() => false);
    const blocks = buildPickBlocks(pickContext, APP_URL, { slackLessonEnabled });
    if (blocks) {
      const topic = pickContext?.pick?.topic || pickContext?.pick?.title || 'your next lesson';
      return {
        blocks,
        text: `Today's pick is ${topic}.`,
        meta: { source: 'daily_pick_answer', lessonTopic: pickContext?.pick?.topic || null },
      };
    }
    // No pick resolved (rare) — fall through to the model rather than dead-ending.
  }

  try {
    const messages = [...history, { role: 'user', content: text }];
    const extraContext = pickContext ? formatPickContext(pickContext, session) : null;
    const { reply, lessonTopic } = await generateChatReply(messages, profile, {
      extraContext: extraContext || '',
    });
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
    return {
      blocks,
      text: reply,
      meta: {
        source: 'chat',
        lessonTopic: lessonTopic || null,
        // Recorded so the admin monitor shows whether a reply was grounded in
        // today's pick or answered without it.
        pickContext: Boolean(extraContext),
      },
    };
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
