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

// Reverse of lookupByEmail: resolve a Slack user id ("U...") to their email so
// an inbound DM can be mapped to an app identity. Returns { email, error };
// email is null on failure. Requires the users:read.email scope (same scope
// lookupByEmail uses, so if outbound DMs work this does too).
export async function lookupSlackEmailByUserId(userId) {
  if (!BOT_TOKEN) return { email: null, error: 'no_token' };
  if (!userId) return { email: null, error: 'no_user' };
  try {
    const res = await fetch(
      `https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${BOT_TOKEN}` } }
    );
    const data = await res.json();
    if (!data.ok) {
      console.error('Slack users.info error for', userId, '→', data.error);
      return { email: null, error: data.error || 'lookup_failed' };
    }
    const email = data.user?.profile?.email || null;
    return { email, error: email ? null : 'no_email_on_profile' };
  } catch (error) {
    console.error('Slack users.info failed:', error);
    return { email: null, error: 'lookup_exception' };
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

// Post to a channel we already have an id for (a DM channel from an inbound event,
// or one we opened earlier). sendSlackDirectMessage resolves a channel from an
// email; this is the lower-level version the lesson flow uses, since every button
// press already carries the channel it happened in. Returns { ok, error }.
export async function postSlackMessage(channel, text, blocks = null) {
  if (!BOT_TOKEN) return { ok: false, error: 'no_token' };
  if (!channel) return { ok: false, error: 'no_channel' };
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify(blocks?.length ? { channel, text, blocks } : { channel, text }),
    });
    const data = await res.json();
    if (!data.ok) {
      // response_metadata names the offending block when a block is malformed,
      // which is the difference between "silently nothing happened" and a fix.
      console.error('Slack postMessage error:', data.error, JSON.stringify(data.response_metadata || {}));
      return { ok: false, error: data.error };
    }
    return { ok: true, ts: data.ts };
  } catch (error) {
    console.error('Slack postMessage failed:', error);
    return { ok: false, error: 'send_failed' };
  }
}

// Open a modal. The trigger_id from an interaction is only valid for a few seconds,
// so callers must reach this with as little work in between as possible — and must
// handle a failure, because "expired_trigger_id" otherwise looks exactly like a
// button that does nothing. Returns { ok, error }.
export async function openSlackModal(triggerId, view) {
  if (!BOT_TOKEN) return { ok: false, error: 'no_token' };
  if (!triggerId) return { ok: false, error: 'no_trigger' };
  try {
    const res = await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ trigger_id: triggerId, view }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Slack views.open rejected:', data.error, JSON.stringify(data.response_metadata || {}));
      return { ok: false, error: data.error };
    }
    return { ok: true };
  } catch (error) {
    console.error('Slack views.open failed:', error);
    return { ok: false, error: 'open_failed' };
  }
}

// Who gets paged when a feedback item hits a top-of-ladder priority
// (Show stopper or Critical — someone, or everyone, dead in the water).
const CRITICAL_ALERT_EMAILS = (process.env.FEEDBACK_CRITICAL_ALERT_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

// Fire-and-forget Slack DM to everyone on the alert list. Never throws — a
// notification failure should never break the feedback submission/triage
// request that triggered it. The header reflects the actual priority so a
// Show stopper reads differently from a single-person Critical.
export async function notifyCriticalFeedback(record) {
  if (!CRITICAL_ALERT_EMAILS.length) return;
  const label = record.priority === 'Show stopper' ? 'SHOW STOPPER' : 'Critical';
  const text = [
    `🚨 *${label} feedback* — ${record.category || 'Uncategorized'}`,
    record.feature ? `Area: ${record.feature}` : null,
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

// Send a DM to the app user with this email. `blocks` is optional; when given,
// `text` stays required because Slack uses it for the notification preview and
// for clients that can't render blocks. Returns { ok, error }.
export async function sendSlackDirectMessage(email, text, blocks = null) {
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
      body: JSON.stringify(blocks?.length
        ? { channel: userId, text, blocks }
        : { channel: userId, text }),
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
