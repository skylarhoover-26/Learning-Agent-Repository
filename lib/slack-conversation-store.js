// Server-only store for the two-way Slack coaching conversation log.
// Every inbound (user → bot) and outbound (bot → user) message is recorded so
// admins can monitor conversations at /admin/conversations. Also holds the
// event-dedup guard so a Slack retry never double-replies a user.
//
// Backed by Supabase (service-role). Every function catches its own errors and
// never throws into the request path — a logging failure must never break a
// reply or a scheduled send.

import { getSupabase } from './supabase';

// Record one Slack message. Fire-and-forget: returns { ok, error } but callers
// generally don't need to await the result for correctness.
export async function logSlackMessage({
  email = null,
  slackUserId = null,
  direction,
  channel = null,
  text = '',
  meta = {},
}) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'supabase_off' };
  if (direction !== 'inbound' && direction !== 'outbound') {
    return { ok: false, error: 'bad_direction' };
  }
  try {
    const { error } = await supabase.from('slack_conversations').insert({
      email: email ? email.toLowerCase() : null,
      slack_user_id: slackUserId,
      direction,
      channel,
      text: text || '',
      meta: meta || {},
    });
    if (error) {
      console.error('logSlackMessage insert error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    console.error('logSlackMessage failed:', error);
    return { ok: false, error: 'insert_exception' };
  }
}

// Returns true if this event_id has NOT been seen before (and reserves it), so
// the caller should proceed. Returns false if it was already processed (a Slack
// retry) or if Supabase is unavailable-for-dedup — in the false case the caller
// should skip to avoid a possible double-reply. Events without an id always
// proceed (true), since there's nothing to dedupe on.
export async function reserveSlackEvent(eventId) {
  if (!eventId) return true;
  const supabase = getSupabase();
  if (!supabase) return true; // no store to dedupe against; don't drop the message
  try {
    const { error } = await supabase
      .from('slack_processed_events')
      .insert({ event_id: eventId });
    if (error) {
      // 23505 = unique_violation → already processed → skip.
      if (error.code === '23505') return false;
      console.error('reserveSlackEvent insert error:', error.message);
      return true; // unknown error: prefer replying over silently dropping
    }
    return true;
  } catch (error) {
    console.error('reserveSlackEvent failed:', error);
    return true;
  }
}

// Prior conversation turns for one learner, oldest-first, mapped to the
// {role, content} shape the AI brain expects (inbound → user, outbound →
// assistant). Snapshot pivots (leaderboard/skills blocks) are excluded so they
// don't pollute the chat context. Used to give Slack DMs multi-turn memory.
export async function getConversationHistoryForEmail(email, limit = 8) {
  const supabase = getSupabase();
  if (!supabase || !email) return [];
  try {
    const { data, error } = await supabase
      .from('slack_conversations')
      .select('direction, text, meta, created_at')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('getConversationHistoryForEmail error:', error.message);
      return [];
    }
    return (data || [])
      .filter((row) => row.text && row.meta?.source !== 'leaderboard' && row.meta?.source !== 'skills')
      .reverse()
      .map((row) => ({
        role: row.direction === 'inbound' ? 'user' : 'assistant',
        content: row.text,
      }));
  } catch (error) {
    console.error('getConversationHistoryForEmail failed:', error);
    return [];
  }
}

// Newest-first list of logged messages for the admin monitoring view.
export async function listSlackConversations({ limit = 500 } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('slack_conversations')
      .select('id, email, slack_user_id, direction, channel, text, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('listSlackConversations error:', error.message);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('listSlackConversations failed:', error);
    return [];
  }
}
