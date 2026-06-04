import { WebClient } from '@slack/web-api'
import crypto from 'crypto'
import { handleDM } from '../../lib/bot'

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

async function verifySlackSignature(req, rawBody) {
  const timestamp = req.headers['x-slack-request-timestamp']
  const signature = req.headers['x-slack-signature']
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false
  const sigBase = `v0:${timestamp}:${rawBody}`
  const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(sigBase).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(`v0=${hmac}`), Buffer.from(signature))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const valid = await verifySlackSignature(req, rawBody)
  if (!valid) return res.status(401).end('Unauthorized')

  const payload = JSON.parse(new URLSearchParams(rawBody).get('payload'))
  res.status(200).end()

  const client = new WebClient(process.env.SLACK_BOT_TOKEN)
  const action = payload.actions?.[0]
  if (!action) return

  const slackUserId = payload.user.id
  const userName = payload.user.name
  const channelId = payload.channel?.id || payload.container?.channel_id
  const buttonValue = action.value

  // Simulate a DM message with the button value
  const fakeEvent = {
    text: buttonValue,
    channel: channelId,
    user: slackUserId
  }

  const userInfo = await client.users.info({ user: slackUserId }).catch(() => null)
  const userEmail = userInfo?.user?.profile?.email || ''
  const realName = userInfo?.user?.real_name || userName

  await handleDM(client, fakeEvent, slackUserId, realName, userEmail)
}
