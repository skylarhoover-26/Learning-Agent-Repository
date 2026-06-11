// Slack delivery helpers for outbound notifications (server-only).
// Uses the existing SLACK_BOT_TOKEN. Resolves a learner's Slack user by email,
// then sends them a direct message.

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Returns { id, error }. id is null on failure; error carries the Slack reason
// (e.g. "missing_scope", "users_not_found") so callers can surface it.
export async function lookupSlackUserByEmail(email) {
  if (!BOT_TOKEN) return { id: null, error: 'no_token' };
  if (!email) return { id: null, error: 'no_email' };
  try {
    const res = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${BOT_TOKEN}` } }
    );
    const data = await res.json();
    if (!data.ok) {
      console.error('Slack lookupByEmail error for', email, '→', data.error);
      return { id: null, error: data.error || 'lookup_failed' };
    }
    return { id: data.user.id, error: null };
  } catch (error) {
    console.error('Slack lookupByEmail failed:', error);
    return { id: null, error: 'lookup_exception' };
  }
}

export async function sendSlackDirectMessage(email, text) {
  if (!BOT_TOKEN) return { ok: false, error: 'no_token' };
  const { id: userId, error: lookupError } = await lookupSlackUserByEmail(email);
  if (!userId) return { ok: false, error: lookupError || 'user_not_found' };
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ channel: userId, text }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Slack postMessage error for', email, '→', data.error);
      return { ok: false, error: data.error };
    }
    return { ok: true };
  } catch (error) {
    console.error('Slack postMessage failed:', error);
    return { ok: false, error: 'send_failed' };
  }
}
