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

// Returns { ok, imageUrl, error }. imageUrl is the highest-res custom photo
// Slack has for this person, or null if they've never set one (Slack still
// returns a generated color-block image for those — is_custom_image tells the
// two apart, and we treat "no custom photo" as a failure so callers fall back
// to the cartoon avatar instead of showing a generic Slack placeholder).
export async function lookupSlackProfilePhoto(email) {
  if (!BOT_TOKEN) return { ok: false, imageUrl: null, error: 'no_token' };
  if (!email) return { ok: false, imageUrl: null, error: 'no_email' };
  try {
    const res = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${BOT_TOKEN}` } }
    );
    const data = await res.json();
    if (!data.ok) {
      console.error('Slack lookupByEmail error for', email, '→', data.error);
      return { ok: false, imageUrl: null, error: data.error || 'lookup_failed' };
    }
    const profile = data.user?.profile;
    if (!profile?.is_custom_image) {
      return { ok: false, imageUrl: null, error: 'no_custom_photo' };
    }
    const imageUrl = profile.image_512 || profile.image_192 || profile.image_original || null;
    if (!imageUrl) return { ok: false, imageUrl: null, error: 'no_image_url' };
    return { ok: true, imageUrl, error: null };
  } catch (error) {
    console.error('Slack profile photo lookup failed:', error);
    return { ok: false, imageUrl: null, error: 'lookup_exception' };
  }
}

// Who gets paged when a feedback item becomes Critical (dead-in-the-water).
const CRITICAL_ALERT_EMAILS = (process.env.FEEDBACK_CRITICAL_ALERT_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

// Fire-and-forget Slack DM to everyone on the alert list. Never throws — a
// notification failure should never break the feedback submission/triage
// request that triggered it.
export async function notifyCriticalFeedback(record) {
  if (!CRITICAL_ALERT_EMAILS.length) return;
  const text = [
    `🚨 *Critical feedback* — ${record.category || 'Uncategorized'}`,
    `From: ${record.name || record.email}`,
    record.page ? `Page: ${record.page}` : null,
    record.aiReason ? `Why: ${record.aiReason}` : null,
    '',
    record.text,
    '',
    'Review: https://learning-agent-pearl.vercel.app/admin/feedback',
  ].filter(Boolean).join('\n');
  await Promise.all(CRITICAL_ALERT_EMAILS.map(async (email) => {
    const result = await sendSlackDirectMessage(email, text);
    if (!result.ok) console.error('notifyCriticalFeedback failed for', email, '→', result.error);
  }));
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
