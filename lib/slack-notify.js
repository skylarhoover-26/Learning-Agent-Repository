// Slack delivery helpers for outbound notifications (server-only).
// Uses the existing SLACK_BOT_TOKEN. Resolves a learner's Slack user by email,
// then sends them a direct message.

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

export async function lookupSlackUserByEmail(email) {
  if (!BOT_TOKEN || !email) return null;
  try {
    const res = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${BOT_TOKEN}` } }
    );
    const data = await res.json();
    return data.ok ? data.user.id : null;
  } catch (error) {
    console.error('Slack lookupByEmail failed:', error);
    return null;
  }
}

export async function sendSlackDirectMessage(email, text) {
  if (!BOT_TOKEN) return { ok: false, error: 'no_token' };
  const userId = await lookupSlackUserByEmail(email);
  if (!userId) return { ok: false, error: 'user_not_found' };
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
    return data.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (error) {
    console.error('Slack postMessage failed:', error);
    return { ok: false, error: 'send_failed' };
  }
}
