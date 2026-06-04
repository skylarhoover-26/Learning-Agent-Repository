import { WebClient } from '@slack/web-api'
import crypto from 'crypto'
import { handleDM, handleMention } from '../../lib/bot'

export const config = { api: { bodyParser: false } }

// ── Verify Slack request signature ────────────────────────────────────────────
async function verifySlackSignature(req, rawBody) {
  const timestamp = req.headers['x-slack-request-timestamp']
  const signature = req.headers['x-slack-signature']

  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false

  const sigBase = `v0:${timestamp}:${rawBody}`
  const hmac = crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(sigBase)
    .digest('hex')
  const expected = `v0=${hmac}`

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const body = JSON.parse(rawBody)

  // Slack URL verification challenge
  if (body.type === 'url_verification') {
    return res.status(200).json({ challenge: body.challenge })
  }

  // Verify signature
  const valid = await verifySlackSignature(req, rawBody)
  if (!valid) return res.status(401).end('Unauthorized')

  // Acknowledge immediately (Slack requires < 3s response)
  res.status(200).end()

  // Process event asynchronously
  const event = body.event
  if (!event) return

  const client = new WebClient(process.env.SLACK_BOT_TOKEN)

  // Skip bot messages
  if (event.bot_id || event.subtype === 'bot_message') return

  try {
    // Get Slack user info
    const userInfo = await client.users.info({ user: event.user }).catch(() => null)
    const userName = userInfo?.user?.real_name || userInfo?.user?.name || 'there'
    const userEmail = userInfo?.user?.profile?.email || ''

    if (event.type === 'message' && event.channel_type === 'im') {
      // Direct message — full learning experience
      await handleDM(client, event, event.user, userName, userEmail)
    } else if (event.type === 'app_mention') {
      // Channel mention — quick answer mode
      await handleMention(client, event, event.user, userName)
    }
  } catch (err) {
    console.error('Event handler error:', err)
  }
}
