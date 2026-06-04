// bot.js — AI Learning Companion
//
// WHAT THIS FILE DOES:
// This is the main bot. It runs the full onboarding flow (Q1–Q6),
// scores answers, generates a personalized learning plan, delivers Module 1,
// and runs the 6-week check-in flow.
//
// HOW TO RUN IT (once credentials are ready):
//   1. Copy .env.example to .env and fill in your tokens
//   2. Enable Socket Mode in your Slack app settings
//   3. In Terminal: node bot.js
//
// DEPENDENCIES:
//   @slack/bolt, @anthropic-ai/sdk (both already in package.json)
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { App } = require('@slack/bolt');
const { scorePersonalImpact, scoreTeamImpact, scoreOrgImpact, scoreCheckinPersonal } = require('./scoring');
const {
  DEPARTMENTS,
  SUBTEAM_DEPTS,
  SUBTEAMS,
  HIGH_COMPLIANCE_DEPTS,
  getTaskList,
  getModulePlan,
} = require('./curriculum');
const {
  sendModule2,
  sendModule3,
  startPromptGame,
  sendPromptGameRound,
  sendPromptGameResult,
  sendPromptGameSummary,
  sendTriviaQuestion,
  sendTriviaResult,
  sendTriviaSummary,
  sendWeeklyChallenge,
} = require('./modules');

// ─── Slack App Setup ──────────────────────────────────────────────────────────
// Socket Mode: no public URL or ngrok needed for local testing.
// Requires an App-Level Token (xapp-...) from your Slack app's "Socket Mode" settings.

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// ─── In-Memory State & Profile Stores ────────────────────────────────────────
// Tracks where each user is in the conversation flow, and stores their profile data.
// NOTE: This resets whenever the bot restarts. Connect Supabase later for persistence.

const userState = new Map();   // userId → { step, channelId, ...flow data }
const userProfiles = new Map(); // userId → { department, scores, top_tasks, etc. }

function getState(userId) {
  return userState.get(userId) || { step: 'idle' };
}
function setState(userId, updates) {
  userState.set(userId, { ...getState(userId), ...updates });
}
function clearState(userId) {
  userState.set(userId, { step: 'idle' });
}
function getProfile(userId) {
  return userProfiles.get(userId) || {};
}
function updateProfile(userId, updates) {
  userProfiles.set(userId, { ...getProfile(userId), ...updates });
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function scoreLabel(score) {
  const map = { 1: 'Needs Improving', 2: 'Still Developing', 3: 'Fully Successful', 4: 'Often Exceeds', 5: 'Role Model' };
  return map[Math.round(score)] || '—';
}

function overallLevel(p, t, o, d) {
  const scores = [p, t, o, d].filter(n => n != null);
  if (!scores.length) return 'Low';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 4) return 'High';
  if (avg >= 2.5) return 'Medium';
  return 'Low';
}

function weeksSince(isoString) {
  if (!isoString) return 999;
  return Math.floor((Date.now() - new Date(isoString).getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function slugify(str) {
  return str.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

// ─── Block Builders ───────────────────────────────────────────────────────────
// These functions build the Slack Block Kit JSON for each message.

function deptButtons() {
  // 20 departments split into rows of 5 (Slack max per action row)
  const rows = [];
  for (let i = 0; i < DEPARTMENTS.length; i += 5) {
    rows.push({
      type: 'actions',
      block_id: `dept_row_${i}`,
      elements: DEPARTMENTS.slice(i, i + 5).map(dept => ({
        type: 'button',
        text: { type: 'plain_text', text: dept },
        action_id: `dept__${slugify(dept)}`,
        value: dept,
      })),
    });
  }
  return rows;
}

function subteamButtons(department) {
  const subteams = SUBTEAMS[department] || [];
  const rows = [];
  for (let i = 0; i < subteams.length; i += 5) {
    rows.push({
      type: 'actions',
      block_id: `subteam_row_${i}`,
      elements: subteams.slice(i, i + 5).map(st => ({
        type: 'button',
        text: { type: 'plain_text', text: st },
        action_id: `subteam__${slugify(st)}`,
        value: st,
      })),
    });
  }
  return rows;
}

function taskButtons(department, subteam, selectedTasks = []) {
  const tasks = getTaskList(department, subteam).slice(0, 8);
  const elements = tasks.map(task => ({
    type: 'button',
    text: { type: 'plain_text', text: selectedTasks.includes(task) ? `✓ ${task}` : task },
    action_id: `toggle_task__${slugify(task)}`,
    value: task,
    style: selectedTasks.includes(task) ? 'primary' : undefined,
  }));

  const rows = [];
  for (let i = 0; i < elements.length; i += 2) {
    rows.push({ type: 'actions', block_id: `task_row_${i}`, elements: elements.slice(i, i + 2) });
  }

  if (selectedTasks.length > 0) {
    const label = selectedTasks.length >= 3
      ? `Done — ${selectedTasks.length} selected`
      : `Done — ${selectedTasks.length} selected (pick up to 3)`;
    rows.push({
      type: 'actions',
      block_id: 'task_done_row',
      elements: [{ type: 'button', text: { type: 'plain_text', text: label }, action_id: 'tasks_confirmed', style: 'primary' }],
    });
  }
  return rows;
}

// ─── Message Senders: Onboarding Flow ────────────────────────────────────────

async function sendWelcome(client, userId, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👋 Hey <@${userId}>! I'm your AI Learning Companion.\n\nI'm here to help you grow with AI — not just learn about it, but actually use it to do better work and drive real impact.\n\nBefore I build your personalized learning plan, I'd like to understand where you are right now. This takes about 5 minutes, and your answers shape everything — so the more honest you are, the more useful your plan will be.\n\nReady to get started?`,
        },
      },
      {
        type: 'actions',
        block_id: 'welcome_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Let's go" }, action_id: 'welcome_go', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Remind me later' }, action_id: 'welcome_later' },
        ],
      },
    ],
  });
  setState(userId, { step: 'welcome_sent', channelId });
}

async function askDepartment(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Which team are you on? This helps me tailor your learning plan to work you actually do.' } },
      ...deptButtons(),
    ],
  });
}

async function askSubteam(client, channelId, department) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `Got it — which team within *${department}* are you on?` } },
      ...subteamButtons(department),
    ],
  });
}

async function askStartingPoint(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Before we dive in — how would you describe your relationship with AI tools right now?' } },
      {
        type: 'actions',
        block_id: 'sp_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Just getting started' }, action_id: 'sp__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: 'Curious & experimenting' }, action_id: 'sp__b', value: 'B' },
          { type: 'button', text: { type: 'plain_text', text: 'Regular user' }, action_id: 'sp__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'Power user' }, action_id: 'sp__d', value: 'D' },
        ],
      },
    ],
  });
}

async function askTasks(client, channelId, department, subteam, selectedTasks = []) {
  const headerText = selectedTasks.length === 0
    ? 'What does most of your typical week look like? Pick the *3 tasks* that take up the most of your time.'
    : `Pick the *3 tasks* that take up the most of your time.\n\n_Selected so far (${selectedTasks.length}/3): ${selectedTasks.join(', ')}_`;

  return await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      ...taskButtons(department, subteam, selectedTasks),
    ],
  });
}

async function askAutomationGoal(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    text: 'Thanks — one more thing. Are there any repetitive parts of those tasks you wish you could hand off or speed up dramatically?\n\n_(Just type your answer)_',
  });
}

async function askPersonalImpact(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: "Now let's look at the impact AI is having on your own work.\n\n*Which of these best describes how AI affects your day-to-day output?*" } },
      {
        type: 'actions',
        block_id: 'pi_action_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Haven't used it meaningfully yet" }, action_id: 'pi__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: "Tried things — no real change yet" }, action_id: 'pi__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'pi_action_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Saving real time on specific tasks' }, action_id: 'pi__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'AI has genuinely changed my output', }, action_id: 'pi__d', value: 'D', style: 'primary' },
        ],
      },
    ],
  });
}

async function askPersonalImpactFollowup(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    text: "That's great. Can you give me a quick example of how AI has changed what you produce or deliver?\n\n_(Just type your answer)_",
  });
}

async function askTeamImpact(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: "Now let's think about your teammates.\n\n*Which best describes what's happening on your team with AI?*" } },
      {
        type: 'actions',
        block_id: 'ti_action_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Figuring it out individually — no shared approach' }, action_id: 'ti__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: 'A few of us use it, but we rarely share' }, action_id: 'ti__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'ti_action_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'I sometimes help colleagues try things' }, action_id: 'ti__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'I actively coach my team on AI' }, action_id: 'ti__d', value: 'D', style: 'primary' },
        ],
      },
    ],
  });
}

async function askTeamImpactFollowup(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    text: "What's a recent example of you helping someone on your team use AI more effectively?\n\n_(Just type your answer)_",
  });
}

async function askOrgImpact(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: "Now let's zoom out to the bigger picture.\n\n*Can you connect your AI usage to any team goals or broader business outcomes?*" } },
      {
        type: 'actions',
        block_id: 'oi_action_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Not really — no connection to goals" }, action_id: 'oi__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: 'Loosely — some connection, no clear results' }, action_id: 'oi__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'oi_action_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Yes — can point to specific results' }, action_id: 'oi__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: "Definitely — I've built practices others use" }, action_id: 'oi__d', value: 'D', style: 'primary' },
        ],
      },
    ],
  });
}

async function askOrgImpactFollowup(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    text: "What's an example?\n\n_(Just type your answer)_",
  });
}

async function askAIDev(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: "Last one — this one is about your knowledge and curiosity around AI itself.\n\n*When it comes to understanding and experimenting with AI — which feels most like you?*" } },
      {
        type: 'actions',
        block_id: 'ad_action_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Still learning what's out there" }, action_id: 'ad__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: 'Consistent user — not experimenting much' }, action_id: 'ad__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'ad_action_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Actively trying new things' }, action_id: 'ad__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'I go deep — others come to me for guidance' }, action_id: 'ad__d', value: 'D', style: 'primary' },
        ],
      },
    ],
  });
}

async function askAIDevClarify(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Have you used any AI tools at work yet, even casually?' } },
      {
        type: 'actions',
        block_id: 'ad_clarify_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Yes, a little' }, action_id: 'ad_clarify__yes', value: 'yes' },
          { type: 'button', text: { type: 'plain_text', text: 'Not yet' }, action_id: 'ad_clarify__no', value: 'no' },
        ],
      },
    ],
  });
}

async function sendLearningPlan(client, userId, channelId) {
  const profile = getProfile(userId);
  const { personal_impact, team_impact, org_impact, ai_development, department, top_tasks = [] } = profile;

  const modules = getModulePlan(department, top_tasks);
  const level = overallLevel(personal_impact, team_impact, org_impact, ai_development);

  const moduleLines = modules
    .map((m, i) => `${i === 0 ? '✅' : '⬜'} *Module ${m.num}: ${m.title}* — ${m.desc}`)
    .join('\n');

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Here's your AI Impact profile, <@${userId}>:\n\n📊 *Personal Impact:* ${scoreLabel(personal_impact)} (${personal_impact}/5)\n👥 *Team Impact:* ${scoreLabel(team_impact)} (${team_impact}/5)\n🏢 *Org Impact:* ${scoreLabel(org_impact)} (${org_impact}/5)\n🧠 *AI Development:* ${scoreLabel(ai_development)} (${ai_development}/5)\n\n*Overall AI Impact Level: ${level}*`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Based on your role and where you are right now, I've put together a 5-module learning path for you. It's designed to move you from where you are today toward ${level === 'High' ? 'sustaining and sharing your impact' : level === 'Medium' ? 'High' : 'Medium'}.\n\n*Your Learning Path:*\n${moduleLines}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You can work through these at your own pace. I'll check in every 6 weeks to track your progress and update your scores.\n\nYou can also ask me anything, anytime — just DM me.\n\n*Want to start Module 1 now?*`,
        },
      },
      {
        type: 'actions',
        block_id: 'plan_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Start Module 1' }, action_id: 'plan__module1', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Save for later' }, action_id: 'plan__later' },
        ],
      },
    ],
  });

  updateProfile(userId, {
    onboarding_complete: true,
    onboarding_date: new Date().toISOString(),
    last_checkin: new Date().toISOString(),
  });
  setState(userId, { step: 'complete' });
}

// ─── Module 1: AI Foundations ─────────────────────────────────────────────────

async function sendModule1(client, userId, channelId) {
  const profile = getProfile(userId);
  const { department = '', top_tasks = [] } = profile;

  const complianceBlock = HIGH_COMPLIANCE_DEPTS.includes(department)
    ? `\n\n⚠️ *Important for ${department}:* AI output touching financial data, legal language, or client account information must always be human-verified before use. Never enter client financial data, employee PII, or sensitive account details into AI tools — paraphrase or anonymize first.`
    : '';

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Module 1: AI Foundations* 🧠\n\nLet's start with what AI actually is — and what it isn't. This is the foundation that makes everything else click.${complianceBlock}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*What AI is good at:*\n• Drafting, summarizing, researching, and structuring\n• Brainstorming options and approaches quickly\n• Explaining complex things in plain language\n• Writing variations and alternatives\n• Repurposing content across formats`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*What AI is NOT good at:*\n• Real-time or proprietary data it hasn't been given\n• Precise financial calculations (always verify numbers)\n• Legal or financial certainty — it can help you draft, not decide\n• Personal judgment calls that require context you haven't provided`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*The formula for useful AI output:*\n\`Clear context + Specific ask + Desired format = Better output\`\n\nInstead of: _"Help me with a report"_\nTry: _"Write a 3-paragraph executive summary of these Q2 results for a leadership audience. Lead with the biggest change vs. last quarter: [paste data]"_`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*What to never put into AI tools:*\n• Client names, account numbers, or financial details\n• Employee PII (SSNs, salaries, performance ratings)\n• Proprietary business strategies or unreleased product info\n• Passwords or credentials of any kind\n\nWhen in doubt: paraphrase or anonymize before you prompt.`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Your quick task for Module 1:*\nYou told me your top tasks are: _${top_tasks.join(', ') || 'your core work'}_.\n\nFor each one, ask yourself: "What part of this is mostly writing, summarizing, or structuring?" That's where AI can help you most — and where we'll start in Module 2.\n\nReady to continue?`,
        },
      },
      {
        type: 'actions',
        block_id: 'module1_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Yes — let's go to Module 2" }, action_id: 'mod1__next', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Come back to this later' }, action_id: 'mod1__later' },
        ],
      },
    ],
  });

  setState(userId, { step: 'module_1_complete' });
  updateProfile(userId, { module_1_complete: true, module_1_date: new Date().toISOString() });
}

// ─── Check-in Flow ────────────────────────────────────────────────────────────

async function sendCheckinIntro(client, userId, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey <@${userId}>! It's been a little while — before we get into it, mind if I do a quick 2-minute check-in on your AI progress? Your answers update your scores on the dashboard.`,
        },
      },
      {
        type: 'actions',
        block_id: 'checkin_intro_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Sure, let's do it" }, action_id: 'ci__start', style: 'primary' },
          { type: 'button', text: { type: 'plain_text', text: 'Skip for now' }, action_id: 'ci__skip' },
        ],
      },
    ],
  });
  setState(userId, { step: 'checkin_intro', channelId });
}

async function askCheckinPersonal(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Since we last talked, has the way you use AI in your own work changed?' } },
      {
        type: 'actions',
        block_id: 'ci_personal_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Not much — about the same as before' }, action_id: 'ci_p__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: "Yes — using it more consistently now" }, action_id: 'ci_p__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'ci_personal_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Yes — using it for things I wasn't doing before" }, action_id: 'ci_p__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'Yes — delivered a real AI-driven outcome' }, action_id: 'ci_p__d', value: 'D', style: 'primary' },
        ],
      },
    ],
  });
}

async function askCheckinPersonalFollowup(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    text: "That's great — can you describe what you delivered?\n\n_(Just type your answer)_",
  });
}

async function askCheckinTeam(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: 'Has anything changed in how AI is used across your team?' } },
      {
        type: 'actions',
        block_id: 'ci_team_action',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Not really — still mostly individual" }, action_id: 'ci_t__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: "Yes — shared more or helped a colleague" }, action_id: 'ci_t__b', value: 'B' },
          { type: 'button', text: { type: 'plain_text', text: 'Yes — we have a more consistent approach now' }, action_id: 'ci_t__c', value: 'C' },
        ],
      },
    ],
  });
}

async function askCheckinBlockers(client, channelId) {
  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: "What's been getting in the way of using AI more? _(This helps me adjust your learning plan)_" } },
      {
        type: 'actions',
        block_id: 'ci_blockers_1',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Too busy — no time to focus on it' }, action_id: 'ci_b__a', value: 'A' },
          { type: 'button', text: { type: 'plain_text', text: "Not sure how to apply it to my work" }, action_id: 'ci_b__b', value: 'B' },
        ],
      },
      {
        type: 'actions',
        block_id: 'ci_blockers_2',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: "Using same amount — just not leveling up" }, action_id: 'ci_b__c', value: 'C' },
          { type: 'button', text: { type: 'plain_text', text: 'Something else' }, action_id: 'ci_b__d', value: 'D' },
        ],
      },
    ],
  });
}

async function sendCheckinSummary(client, userId, channelId, oldP, oldT, newP, newT) {
  const profile = getProfile(userId);
  const arrow = (o, n) => Math.round(n * 2) / 2 > o ? '↑' : '→';
  const finalP = Math.min(5, Math.round(newP * 2) / 2);
  const finalT = Math.min(5, Math.round(newT * 2) / 2);
  const improved = finalP > oldP || finalT > oldT;

  await client.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Here's where you stand now, <@${userId}>:\n\n📊 *Personal Impact:* ${oldP} → ${finalP} ${arrow(oldP, finalP)}\n👥 *Team Impact:* ${oldT} → ${finalT} ${arrow(oldT, finalT)}\n🏢 *Org Impact:* ${profile.org_impact} (unchanged)\n🧠 *AI Development:* ${profile.ai_development} (unchanged)\n\n${improved ? '🎉 Nice growth since last time — keep building on it.' : "No change yet — that's okay. Keep working through your next module and I'll check in again in 6 weeks."}\n\nYour dashboard has been updated. Talk soon!`,
        },
      },
    ],
  });

  updateProfile(userId, {
    personal_impact: finalP,
    team_impact: finalT,
    last_checkin: new Date().toISOString(),
  });
  setState(userId, { step: 'complete' });
}

// ─── Shared Flow Finishers ────────────────────────────────────────────────────

async function finishOnboarding(client, userId, channelId) {
  setState(userId, { step: 'generating_plan' });
  await client.chat.postMessage({ channel: channelId, text: '⏳ Building your personalized learning plan...' });
  await sendLearningPlan(client, userId, channelId);
}

async function finishCheckin(client, userId, channelId) {
  const state = getState(userId);
  const profile = getProfile(userId);
  await sendCheckinSummary(
    client, userId, channelId,
    profile.personal_impact,
    profile.team_impact,
    state.checkin_new_personal ?? profile.personal_impact,
    state.checkin_new_team ?? profile.team_impact
  );
}

// ─── Event Listener: Incoming DMs ────────────────────────────────────────────

app.event('message', async ({ event, client }) => {
  // Only handle direct messages from real users (not bots, not edits)
  if (event.channel_type !== 'im') return;
  if (event.bot_id || event.subtype) return;

  const userId = event.user;
  const channelId = event.channel;
  const text = (event.text || '').trim();
  const state = getState(userId);
  const profile = getProfile(userId);

  // ── New user: send welcome ──
  if (state.step === 'idle') {
    await sendWelcome(client, userId, channelId);
    return;
  }

  // ── Onboarding complete: check if check-in is due ──
  if (profile.onboarding_complete && state.step === 'complete') {
    if (weeksSince(profile.last_checkin) >= 6) {
      await sendCheckinIntro(client, userId, channelId);
    } else {
      await client.chat.postMessage({
        channel: channelId,
        text: `Hey <@${userId}>! Ready to keep going with your learning? Your next module is waiting whenever you are. Just say *"next module"* and I'll pick up where we left off. 🚀`,
      });
    }
    return;
  }

  // ── Handle "next module" or "I did the challenge" text triggers ──
  if (/next module/i.test(text)) {
    if (state.step === 'module_1_complete') {
      setState(userId, { step: 'module_2_active' });
      await sendModule2(client, userId, channelId, profile);
      return;
    }
    if (state.step === 'module_2_complete') {
      setState(userId, { step: 'module_3_active' });
      await sendModule3(client, userId, channelId, profile);
      return;
    }
  }

  if (/i did the challenge/i.test(text) && state.step === 'challenge_active') {
    setState(userId, { step: 'module_3_complete' });
    updateProfile(userId, { module_3_complete: true, module_3_date: new Date().toISOString() });
    await client.chat.postMessage({
      channel: channelId,
      text: "That's what it looks like! 🎉 Tell me what you built or tried — just type it out. The more specific you are, the better I can capture it in your progress scores.",
    });
    return;
  }

  // ── Module 2: user typed their reaction after "I tried it!" ──
  if (state.step === 'module_2_complete' && !profile.module_2_reaction) {
    updateProfile(userId, { module_2_reaction: text });
    setState(userId, { step: 'module_2_complete' });
    await client.chat.postMessage({
      channel: channelId,
      text: `Nice — thanks for sharing that. 📝 I've logged your experience.\n\nReady for Module 3? Type *"next module"* whenever you are. That's where we build prompts you'll actually reuse every week.`,
    });
    return;
  }

  // ── Module 3: user shared their challenge result ──
  if (state.step === 'module_3_complete' && !profile.module_3_reflection) {
    updateProfile(userId, { module_3_reflection: text });

    // Give a bump to personal or ai_development score based on their sharing
    const bump = text.length > 80 ? 0.5 : 0.25;
    updateProfile(userId, {
      personal_impact: Math.min(5, (profile.personal_impact || 1) + bump),
    });

    await client.chat.postMessage({
      channel: channelId,
      text: `That's real progress. 🌟 I've logged your reflection and given your Personal Impact score a small bump — it'll show on your dashboard.\n\nYou're building a skill that compounds. Keep going.\n\n*Modules 4 and 5 are on their way* — I'll send them here when they're ready. In the meantime, keep using your prompt template on real work.`,
    });
    return;
  }

  // ── Free-text answer handlers (onboarding) ──

  if (state.step === 'awaiting_automation_goal') {
    updateProfile(userId, { automation_goal: text });
    setState(userId, { step: 'awaiting_personal_impact' });
    await askPersonalImpact(client, channelId);
    return;
  }

  if (state.step === 'awaiting_personal_impact_followup') {
    let score = 3;
    try { score = await scorePersonalImpact(text); } catch (e) { console.error('Scoring error (personal):', e.message); }
    updateProfile(userId, { personal_impact: score });
    setState(userId, { step: 'awaiting_team_impact' });
    await askTeamImpact(client, channelId);
    return;
  }

  if (state.step === 'awaiting_team_impact_followup') {
    let score = 3;
    try { score = await scoreTeamImpact(text); } catch (e) { console.error('Scoring error (team):', e.message); }
    updateProfile(userId, { team_impact: score });
    setState(userId, { step: 'awaiting_org_impact' });
    await askOrgImpact(client, channelId);
    return;
  }

  if (state.step === 'awaiting_org_impact_followup') {
    let score = 4;
    try { score = await scoreOrgImpact(text); } catch (e) { console.error('Scoring error (org):', e.message); }
    updateProfile(userId, { org_impact: score });
    setState(userId, { step: 'awaiting_ai_dev' });
    await askAIDev(client, channelId);
    return;
  }

  // ── Free-text answer handlers (check-in) ──

  if (state.step === 'awaiting_checkin_personal_followup') {
    let score = Math.min(5, (getProfile(userId).personal_impact || 3) + 1);
    try { score = await scoreCheckinPersonal(text); } catch (e) { console.error('Scoring error (checkin personal):', e.message); }
    setState(userId, { step: 'awaiting_checkin_team', checkin_new_personal: score });
    await askCheckinTeam(client, channelId);
    return;
  }
});

// ─── Button Action Handlers ───────────────────────────────────────────────────

// Welcome buttons
app.action('welcome_go', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_department', channelId: body.channel.id });
  await askDepartment(client, body.channel.id);
});

app.action('welcome_later', async ({ body, ack, client }) => {
  await ack();
  await client.chat.postMessage({ channel: body.channel.id, text: "No problem! Just DM me when you're ready and we'll get started. 👋" });
});

// Department buttons — register one handler per department
DEPARTMENTS.forEach(dept => {
  app.action(`dept__${slugify(dept)}`, async ({ body, ack, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    updateProfile(userId, { department: dept });

    if (SUBTEAM_DEPTS.includes(dept)) {
      setState(userId, { step: 'awaiting_subteam', channelId });
      await askSubteam(client, channelId, dept);
    } else {
      setState(userId, { step: 'awaiting_starting_point', channelId });
      await askStartingPoint(client, channelId);
    }
  });
});

// Sub-team buttons — register one handler per unique sub-team name.
// Some names repeat across departments (e.g. "Operations" appears in Business Solutions,
// Customer Success, and Risk). Deduplicating ensures we only register each action ID once.
// This is safe because the user's department is already saved in their profile before
// the sub-team question appears — we just need to record the sub-team they picked.
const uniqueSubteams = [...new Set(Object.values(SUBTEAMS).flat())];
uniqueSubteams.forEach(st => {
  app.action(`subteam__${slugify(st)}`, async ({ body, ack, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    updateProfile(userId, { subteam: st });
    setState(userId, { step: 'awaiting_starting_point', channelId });
    await askStartingPoint(client, channelId);
  });
});

// Starting point (warm-up — unscored)
['a', 'b', 'c', 'd'].forEach(letter => {
  app.action(`sp__${letter}`, async ({ body, ack, client }) => {
    await ack();
    const userId = body.user.id;
    const channelId = body.channel.id;
    updateProfile(userId, { starting_point: letter.toUpperCase() });
    setState(userId, { step: 'awaiting_tasks', channelId, selected_tasks: [] });
    const profile = getProfile(userId);
    await askTasks(client, channelId, profile.department, profile.subteam, []);
  });
});

// Task toggle buttons — regex matches all toggle_task__ prefixed action IDs
app.action(/^toggle_task__/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const channelId = body.channel.id;
  const state = getState(userId);
  if (state.step !== 'awaiting_tasks') return;

  const task = action.value;
  let selected = [...(state.selected_tasks || [])];
  if (selected.includes(task)) {
    selected = selected.filter(t => t !== task);
  } else if (selected.length < 3) {
    selected.push(task);
  }

  setState(userId, { selected_tasks: selected });
  const profile = getProfile(userId);

  // Update the task selection message in-place
  await client.chat.update({
    channel: channelId,
    ts: body.message.ts,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Pick the *3 tasks* that take up the most of your time.\n\n${selected.length > 0 ? `_Selected so far (${selected.length}/3): ${selected.join(', ')}_` : ''}`,
        },
      },
      ...taskButtons(profile.department, profile.subteam, selected),
    ],
  });
});

// Task selection confirmed
app.action('tasks_confirmed', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  const state = getState(userId);
  updateProfile(userId, { top_tasks: state.selected_tasks || [] });
  setState(userId, { step: 'awaiting_automation_goal' });
  await askAutomationGoal(client, body.channel.id);
});

// Personal Impact
app.action('pi__a', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { personal_impact: 1 });
  setState(body.user.id, { step: 'awaiting_team_impact' });
  await askTeamImpact(client, body.channel.id);
});
app.action('pi__b', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { personal_impact: 2 });
  setState(body.user.id, { step: 'awaiting_team_impact' });
  await askTeamImpact(client, body.channel.id);
});
app.action('pi__c', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { personal_impact: 3 });
  setState(body.user.id, { step: 'awaiting_team_impact' });
  await askTeamImpact(client, body.channel.id);
});
app.action('pi__d', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_personal_impact_followup' });
  await askPersonalImpactFollowup(client, body.channel.id);
});

// Team Impact
app.action('ti__a', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { team_impact: 1 });
  setState(body.user.id, { step: 'awaiting_org_impact' });
  await askOrgImpact(client, body.channel.id);
});
app.action('ti__b', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { team_impact: 2 });
  setState(body.user.id, { step: 'awaiting_org_impact' });
  await askOrgImpact(client, body.channel.id);
});
app.action('ti__c', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { team_impact: 3 });
  setState(body.user.id, { step: 'awaiting_org_impact' });
  await askOrgImpact(client, body.channel.id);
});
app.action('ti__d', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_team_impact_followup' });
  await askTeamImpactFollowup(client, body.channel.id);
});

// Org Impact
app.action('oi__a', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { org_impact: 1 });
  setState(body.user.id, { step: 'awaiting_ai_dev' });
  await askAIDev(client, body.channel.id);
});
app.action('oi__b', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { org_impact: 2 });
  setState(body.user.id, { step: 'awaiting_ai_dev' });
  await askAIDev(client, body.channel.id);
});
app.action('oi__c', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { org_impact: 3 });
  setState(body.user.id, { step: 'awaiting_ai_dev' });
  await askAIDev(client, body.channel.id);
});
app.action('oi__d', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_org_impact_followup' });
  await askOrgImpactFollowup(client, body.channel.id);
});

// AI Development
app.action('ad__a', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_ai_dev_clarify' });
  await askAIDevClarify(client, body.channel.id);
});
app.action('ad__b', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { ai_development: 3 });
  await finishOnboarding(client, body.user.id, body.channel.id);
});
app.action('ad__c', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { ai_development: 4 });
  await finishOnboarding(client, body.user.id, body.channel.id);
});
app.action('ad__d', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { ai_development: 5 });
  await finishOnboarding(client, body.user.id, body.channel.id);
});

// AI Dev clarify
app.action('ad_clarify__yes', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { ai_development: 2 });
  await finishOnboarding(client, body.user.id, body.channel.id);
});
app.action('ad_clarify__no', async ({ body, ack, client }) => {
  await ack();
  updateProfile(body.user.id, { ai_development: 1 });
  await finishOnboarding(client, body.user.id, body.channel.id);
});

// Learning plan actions
app.action('plan__module1', async ({ body, ack, client }) => {
  await ack();
  await sendModule1(client, body.user.id, body.channel.id);
});
app.action('plan__later', async ({ body, ack, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "Got it — your plan is saved. DM me whenever you're ready to start Module 1. 💪",
  });
});

// Module 1 actions
app.action('mod1__next', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'module_2_active' });
  await sendModule2(client, userId, body.channel.id, getProfile(userId));
});
app.action('mod1__later', async ({ body, ack, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "No worries — come back whenever you're ready. Module 2 will be here. 👋",
  });
});

// ─── Module 2 Actions ─────────────────────────────────────────────────────────

// mod2__open_gemini is a URL button — Slack handles the link click, no handler needed

app.action('mod2__tried', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'module_2_complete' });
  updateProfile(userId, { module_2_complete: true, module_2_date: new Date().toISOString() });
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "Love it! 🎉 That's the real thing — not just reading about AI, but actually using it. How did it go?\n\n_(Just type a quick reaction — what worked, what surprised you, or what you'd try differently next time)_",
  });
});

app.action('mod2__later', async ({ body, ack, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "Saved! When you're ready, just say *\"next module\"* and I'll pick up where we left off. The prompt will be waiting for you. 👋",
  });
});

// ─── Module 3 Actions ─────────────────────────────────────────────────────────

app.action('mod3__start_game', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'game_prompt_active', pg_round: 0, pg_score: 0 });
  await startPromptGame(client, userId, body.channel.id);
});

app.action('mod3__skip_game', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'trivia_active', tq_index: 0, tq_score: 0 });
  await sendTriviaQuestion(client, body.channel.id, 0, 0);
});

// ─── Spot the Bad Prompt: answer buttons (dynamic: pg__<round>__<a|b>) ────────

app.action(/^pg__\d+__[ab]$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const parts = action.action_id.split('__');   // ['pg', roundIndex, answer]
  const roundIndex = parseInt(parts[1], 10);
  const answer = parts[2];
  const state = getState(userId);
  const currentScore = state.pg_score || 0;

  await sendPromptGameResult(client, body.channel.id, roundIndex, answer, currentScore);
});

// Next round button (pg__next__<nextRound>__<score>)
app.action(/^pg__next__\d+__\d+$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const parts = action.action_id.split('__');   // ['pg', 'next', nextRound, score]
  const nextRound = parseInt(parts[2], 10);
  const score = parseInt(parts[3], 10);
  setState(userId, { pg_round: nextRound, pg_score: score });
  await sendPromptGameRound(client, body.channel.id, nextRound, score);
});

// Finish prompt game (pg__finish__<score>)
app.action(/^pg__finish__\d+$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const score = parseInt(action.action_id.split('__')[2], 10);
  setState(userId, { step: 'game_prompt_complete', pg_score: score });
  await sendPromptGameSummary(client, userId, body.channel.id, score);
});

// ─── Trivia: start & answer buttons ──────────────────────────────────────────

app.action('start_trivia', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'trivia_active', tq_index: 0, tq_score: 0 });
  await sendTriviaQuestion(client, body.channel.id, 0, 0);
});

app.action('skip_trivia', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'challenge_active' });
  await sendWeeklyChallenge(client, userId, body.channel.id, getProfile(userId));
});

// Trivia answer buttons (tq__<index>__<a|b|c|d>)
app.action(/^tq__\d+__[abcd]$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const parts = action.action_id.split('__');   // ['tq', index, letter]
  const questionIndex = parseInt(parts[1], 10);
  const answer = parts[2];
  const state = getState(userId);
  const currentScore = state.tq_score || 0;

  await sendTriviaResult(client, body.channel.id, questionIndex, answer, currentScore);
});

// Trivia next question (tq__next__<index>__<score>)
app.action(/^tq__next__\d+__\d+$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const parts = action.action_id.split('__');
  const nextIndex = parseInt(parts[2], 10);
  const score = parseInt(parts[3], 10);
  setState(userId, { tq_index: nextIndex, tq_score: score });
  await sendTriviaQuestion(client, body.channel.id, nextIndex, score);
});

// Trivia finish (tq__finish__<score>)
app.action(/^tq__finish__\d+$/, async ({ body, ack, client, action }) => {
  await ack();
  const userId = body.user.id;
  const score = parseInt(action.action_id.split('__')[2], 10);
  setState(userId, { step: 'trivia_complete', tq_score: score });
  await sendTriviaSummary(client, userId, body.channel.id, score);
});

// ─── Weekly Challenge Actions ─────────────────────────────────────────────────

app.action('show_challenge', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'challenge_active' });
  await sendWeeklyChallenge(client, userId, body.channel.id, getProfile(userId));
});

app.action('challenge__done', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  setState(userId, { step: 'module_3_complete' });
  updateProfile(userId, { module_3_complete: true, module_3_date: new Date().toISOString() });
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "That's what it looks like! 🎉 Tell me what you built or tried — just type it out. The more specific you are, the better I can capture it in your progress scores.",
  });
});

app.action('challenge__later', async ({ body, ack, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.channel.id,
    text: "Sounds good — your challenge is saved. Come back when you've had a chance to try it and say *\"I did the challenge\"* and I'll pick up from here. 💪",
  });
});

// challenge__open_gemini is a URL button — no handler needed

// Check-in buttons
app.action('ci__start', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_checkin_personal' });
  await askCheckinPersonal(client, body.channel.id);
});
app.action('ci__skip', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'complete' });
  await client.chat.postMessage({ channel: body.channel.id, text: "No problem! DM me anytime when you're ready for the check-in. 👋" });
});

// Check-in: Personal Impact
app.action('ci_p__a', async ({ body, ack, client }) => {
  await ack();
  const profile = getProfile(body.user.id);
  setState(body.user.id, { step: 'awaiting_checkin_team', checkin_new_personal: profile.personal_impact });
  await askCheckinTeam(client, body.channel.id);
});
app.action('ci_p__b', async ({ body, ack, client }) => {
  await ack();
  const profile = getProfile(body.user.id);
  setState(body.user.id, { step: 'awaiting_checkin_team', checkin_new_personal: Math.min(5, profile.personal_impact + 0.5) });
  await askCheckinTeam(client, body.channel.id);
});
app.action('ci_p__c', async ({ body, ack, client }) => {
  await ack();
  const profile = getProfile(body.user.id);
  setState(body.user.id, { step: 'awaiting_checkin_team', checkin_new_personal: Math.min(5, profile.personal_impact + 1) });
  await askCheckinTeam(client, body.channel.id);
});
app.action('ci_p__d', async ({ body, ack, client }) => {
  await ack();
  setState(body.user.id, { step: 'awaiting_checkin_personal_followup' });
  await askCheckinPersonalFollowup(client, body.channel.id);
});

// Check-in: Team Impact
app.action('ci_t__a', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  const profile = getProfile(userId);
  const state = getState(userId);
  const newP = state.checkin_new_personal ?? profile.personal_impact;
  const noGrowth = Math.round(newP) <= profile.personal_impact && profile.team_impact <= profile.team_impact;
  setState(userId, { checkin_new_team: profile.team_impact });

  // If no growth on either personal or team, ask what's blocking them
  if (noGrowth) {
    setState(userId, { step: 'awaiting_checkin_blockers' });
    await askCheckinBlockers(client, body.channel.id);
  } else {
    await finishCheckin(client, userId, body.channel.id);
  }
});
app.action('ci_t__b', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  const profile = getProfile(userId);
  setState(userId, { checkin_new_team: Math.min(5, profile.team_impact + 0.5) });
  await finishCheckin(client, userId, body.channel.id);
});
app.action('ci_t__c', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;
  const profile = getProfile(userId);
  setState(userId, { checkin_new_team: Math.min(5, profile.team_impact + 1.5) });
  await finishCheckin(client, userId, body.channel.id);
});

// Check-in: Blockers (any answer → finish)
['a', 'b', 'c', 'd'].forEach(letter => {
  app.action(`ci_b__${letter}`, async ({ body, ack, client }) => {
    await ack();
    await finishCheckin(client, body.user.id, body.channel.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await app.start();
    console.log('\n✅ AI Learning Companion is running!');
    console.log('📱 DM the bot in Slack to begin onboarding.\n');
  } catch (err) {
    console.error('❌ Failed to start bot:', err.message);
    console.error('\nCommon causes:');
    console.error('  • Missing or incorrect token in .env file');
    console.error('  • Socket Mode not enabled in Slack app settings');
    console.error('  • App-level token (SLACK_APP_TOKEN) missing or wrong prefix (needs xapp-)');
    process.exit(1);
  }
})();
