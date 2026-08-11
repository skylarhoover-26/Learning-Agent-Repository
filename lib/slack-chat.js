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
// The start-a-lesson action id, imported rather than duplicated so a rename can't
// leave this button pointing at a handler that no longer exists.
import { ACTION } from './slack-lesson';

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
    const slackLessonAvailable = pickContext?.pick?.topic
      ? await isSlackLessonEnabled().catch(() => false)
      : false;
    const extraContext = pickContext
      ? formatPickContext(pickContext, session, { slackLessonAvailable })
      : null;
    const { reply, lessonTopic } = await generateChatReply(messages, profile, {
      extraContext: extraContext || '',
    });
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: reply } }];

    // When the lesson they're asking about IS today's pick and Slack can run it, offer
    // to start it here rather than linking them away. Someone who just asked "can I
    // take it here instead?" should not be handed a link to somewhere else.
    const pickTopic = pickContext?.pick?.topic || null;
    // An explicit ask to start, or to stay in Slack. Deliberately narrow: gating this
    // on "the model didn't name a topic" instead would staple a Begin lesson button
    // onto every "thanks" and every unrelated question.
    const asksToStart = /\b(here instead|take it here|do it here|right here|in slack|start (the|my|today'?s) lesson|begin (the|my) lesson|let'?s (start|begin|go))\b/i.test(text);
    const wantsTodaysPick = slackLessonAvailable && pickTopic && (
      (lessonTopic && lessonTopic.toLowerCase() === pickTopic.toLowerCase())
      || asksToStart
    );

    if (wantsTodaysPick) {
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Begin lesson' },
          action_id: ACTION.START,
          value: JSON.stringify({ topic: pickTopic }).slice(0, 2000),
          style: 'primary',
        }],
      });
      blocks.push({
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Prefer the app? <${APP_URL}/daily|Open today's pick there instead>.`,
        }],
      });
    } else if (lessonTopic) {
      // A topic that isn't today's pick still lives in the app: only the pick is
      // pre-generated, so starting an arbitrary topic in Slack would mean a cold
      // 60-120s generate inside a DM.
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
