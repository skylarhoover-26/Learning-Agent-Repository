# AI Learning Companion — Slack Bot

An org-wide AI literacy learning tool built on Slack, powered by Claude. Employees DM the bot for personalized learning, mention it in channels for quick answers, and track progress via a web dashboard.

## Features

- Conversational onboarding that builds a personalized learner profile
- Claude-generated curriculum (5 modules, tailored to each user's role and goals)
- Choose-your-own-adventure branching scenarios
- Always-on companion for free-form AI questions (in DMs)
- Channel mention support for quick answers
- Progress dashboard with Okta SSO
- Three-tier visibility: learner / manager / L&D-executive
- Privacy boundary: progress tracked, individual questions private

## Tech Stack

- **Next.js** — frontend + API routes
- **Claude API** (Anthropic) — AI engine, server-side only
- **Slack API** — bot interactions
- **Supabase** — progress and profile storage
- **Okta + NextAuth** — SSO authentication
- **Vercel** — hosting

## Quick Start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete step-by-step setup guide.

## Project Structure

```
ai-learning-bot/
├── pages/
│   ├── index.js              # Learner dashboard (web)
│   ├── _app.js               # NextAuth session wrapper
│   └── api/
│       ├── slack-events.js   # Slack event webhook
│       ├── slack-interactions.js  # Slack button interactions
│       ├── dashboard.js      # Dashboard data API
│       └── auth/
│           └── [...nextauth].js   # Okta SSO
├── lib/
│   ├── bot.js                # Core bot logic (DM + mention handlers)
│   ├── claude.js             # Claude API calls
│   └── supabase.js           # Database helpers
├── supabase-schema.sql       # Run this in Supabase SQL editor
├── .env.example              # Environment variables template
└── DEPLOYMENT.md             # Step-by-step deployment guide
```

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Add all variables to Vercel for production.

## Commands Users Can Send

| Command | What it does |
|---------|-------------|
| (first DM) | Starts onboarding |
| `continue` | Resumes current module |
| `dashboard` | Shows progress summary |
| `curriculum` | Shows full learning path |
| `@bot [question]` | Quick answer in any channel |
| (any message) | Companion mode — free-form AI Q&A |
