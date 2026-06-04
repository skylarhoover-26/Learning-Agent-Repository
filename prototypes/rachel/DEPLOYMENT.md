# AI Learning Companion — Deployment Guide
## Complete step-by-step setup for your team

Estimated time: 2–3 hours for the full setup. No prior experience needed — just follow each step in order.

---

## What you'll set up

1. Anthropic API key (powers Claude)
2. Supabase database (stores progress)
3. Slack app (the bot your org will use)
4. Vercel deployment via drag and drop (hosts the app — no GitHub needed)
5. Okta integration (org SSO)

---

## Step 1 — Anthropic API Key

1. Go to https://console.anthropic.com and sign up or log in
2. Click **API Keys** in the left sidebar
3. Click **Create Key**, name it "AI Learning Bot"
4. Copy the key — you'll need it in Step 5
5. Add a payment method (usage is pay-per-use, very low cost for internal tools)

---

## Step 2 — Supabase Database

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**, give it a name like "ai-learning-bot"
3. Choose a region close to your org, set a strong database password
4. Wait ~2 minutes for the project to spin up
5. In the left sidebar, click **SQL Editor**
6. Open the file `supabase-schema.sql` from this project
7. Paste the entire contents into the SQL editor and click **Run**
8. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret key → this is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3 — Create the Slack App

1. Go to https://api.slack.com/apps and click **Create New App**
2. Choose **From scratch**, name it "AI Learning Companion", select your workspace
3. In the left sidebar, go to **OAuth & Permissions**
   - Under **Bot Token Scopes**, add these scopes:
     - `app_mentions:read`
     - `channels:history`
     - `chat:write`
     - `im:history`
     - `im:read`
     - `im:write`
     - `users:read`
     - `users:read.email`
4. Scroll up and click **Install to Workspace**, then **Allow**
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`) → this is your `SLACK_BOT_TOKEN`
6. Go to **Basic Information → App Credentials**
   - Copy **Signing Secret** → this is your `SLACK_SIGNING_SECRET`
7. Go to **Event Subscriptions**
   - Toggle **Enable Events** ON
   - Under **Subscribe to bot events**, add:
     - `app_mention`
     - `message.im`
   - You'll set the Request URL after deploying to Vercel in Step 5

---

## Step 4 — Prepare Your Project Folder

1. Download the `ai-learning-bot.zip` file you received
2. Unzip it — you should see a folder called `ai-learning-bot` with all the project files inside
3. Keep this folder handy — you'll drag it into Vercel in the next step

> **Important:** Do not rename or reorganize any files inside the folder. Vercel needs them exactly as they are.

---

## Step 5 — Deploy to Vercel (Drag and Drop)

1. Go to https://vercel.com and sign up for a free account (use any email — no GitHub needed)
2. From your dashboard, click **Add New → Project**
3. At the bottom of the page, look for the option **"Or drag and drop your project folder"**
   - If you don't see it, click **Browse** and select your `ai-learning-bot` folder instead
4. Drag your `ai-learning-bot` folder directly onto the Vercel upload area
5. Vercel will detect it as a Next.js project automatically
6. **Before clicking Deploy**, scroll down to **Environment Variables** and add all of these:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | From Step 1 |
| `SLACK_BOT_TOKEN` | From Step 3 |
| `SLACK_SIGNING_SECRET` | From Step 3 |
| `NEXT_PUBLIC_SUPABASE_URL` | From Step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | From Step 2 |
| `OKTA_CLIENT_ID` | From Step 6 below |
| `OKTA_CLIENT_SECRET` | From Step 6 below |
| `OKTA_ISSUER` | From Step 6 below |
| `NEXTAUTH_SECRET` | Go to https://generate-secret.vercel.app/32 and copy the result |
| `NEXTAUTH_URL` | Your Vercel URL, e.g. `https://ai-learning-bot.vercel.app` |

7. Click **Deploy** — Vercel will build and deploy automatically (takes about 1–2 minutes)
8. When it says **Congratulations**, copy your deployment URL — it will look like `https://ai-learning-bot-xyz.vercel.app`

> **Updating the app later:** To make changes, update the files in your folder and drag the folder into Vercel again. Each upload creates a new deployment automatically.

---

## Step 6 — Okta Integration

1. Log in to your Okta Admin Console
2. Go to **Applications → Create App Integration**
3. Choose **OIDC - OpenID Connect**, then **Web Application**
4. Name it "AI Learning Companion"
5. Set **Sign-in redirect URI** to: `https://your-vercel-url.vercel.app/api/auth/callback/okta`
6. Set **Sign-out redirect URI** to: `https://your-vercel-url.vercel.app`
7. Click **Save**
8. Copy:
   - **Client ID** → `OKTA_CLIENT_ID`
   - **Client Secret** → `OKTA_CLIENT_SECRET`
   - Your Okta domain → `OKTA_ISSUER` = `https://your-org.okta.com/oauth2/default`
9. Go back to Vercel, update those three environment variables, and trigger a redeploy

---

## Step 7 — Connect Slack to Vercel

1. Go back to your Slack app at https://api.slack.com/apps
2. Click **Event Subscriptions**
3. In the **Request URL** field, enter:
   `https://your-vercel-url.vercel.app/api/slack-events`
4. Wait for the green **Verified** checkmark
5. Click **Interactivity & Shortcuts** in the sidebar
6. Toggle **Interactivity** ON
7. Set the **Request URL** to:
   `https://your-vercel-url.vercel.app/api/slack-interactions`
8. Click **Save Changes**

---

## Step 8 — Test with Your Team

1. Open Slack and find the **AI Learning Companion** bot in Apps
2. Send it a DM — it should welcome you and start onboarding
3. Try mentioning it in a channel: `@AI Learning Companion what is prompt engineering?`
4. Visit your Vercel URL to see the web dashboard (sign in with Okta)

---

## Step 9 — Roll Out Org-Wide

1. In your Slack App settings, go to **Manage Distribution**
2. Enable distribution for your workspace
3. Share the bot with your org via a Slack announcement
4. Share the dashboard URL via your intranet or a pinned Slack message

---

## Ongoing Maintenance

**Cost estimate:**
- Vercel: Free tier (handles thousands of users)
- Supabase: Free tier (up to 500MB, plenty for progress data)
- Anthropic API: ~$0.01–0.03 per full learning session, ~$0.001 per companion question
- Slack: No additional cost

**Making changes:**
Update the files in your `ai-learning-bot` folder, then drag the folder into Vercel again at vercel.com/dashboard. Each upload deploys the latest version automatically.

**Monitoring:**
- Vercel dashboard shows request logs and errors
- Supabase dashboard shows database activity
- Anthropic console shows API usage and costs

---

## Troubleshooting

**Bot doesn't respond in Slack:**
→ Check that Event Subscriptions URL is verified in Slack app settings
→ Check Vercel logs for errors

**Curriculum generation fails:**
→ Check that `ANTHROPIC_API_KEY` is correctly set in Vercel environment variables
→ Verify API key is active at console.anthropic.com

**Dashboard shows "not started":**
→ User's email in Okta must match the email Slack returns — check `users:read.email` scope is approved

**Okta sign-in fails:**
→ Verify `NEXTAUTH_URL` matches your actual Vercel deployment URL exactly
→ Check redirect URIs in Okta match exactly

---

## Need Help?

- Anthropic API docs: https://docs.anthropic.com
- Slack API docs: https://api.slack.com/docs
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- NextAuth Okta guide: https://next-auth.js.org/providers/okta
