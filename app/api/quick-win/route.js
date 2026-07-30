import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { getQuickWin, getTaskList } from '@/lib/curriculum-data';
import { logAuditEntry } from '@/lib/audit-log';
import { buildToolGuidance, resolveTools } from '@/lib/ai-tools';
import { AUDIENCE } from '@/lib/audience';
import { getMergedTools } from '@/lib/ai-tools-store';

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const MODEL = MODELS.sonnet;

function buildCuratedQuickWin(department, task, curatedData, tool) {
  return {
    title: curatedData.quickWin,
    description: `A quick win for ${department} — specifically for "${task}". Copy the prompt below and try it in ${tool.label}.`,
    timeEstimate: '~3 minutes',
    steps: [
      'Copy the prompt below',
      `Open ${tool.label} in another window and paste it in`,
      'Review the output and customize for your specific situation',
      'Use the result in your work today',
    ],
    prompt: curatedData.prompt,
    expectedResult: `You'll get ${curatedData.what}.`,
  };
}

function pickRandomTask(department, subTeam, topTasks) {
  if (topTasks && topTasks.length > 0) {
    return topTasks[Math.floor(Math.random() * topTasks.length)];
  }
  const tasks = getTaskList(department, subTeam);
  if (tasks.length === 0) return null;
  return tasks[Math.floor(Math.random() * tasks.length)];
}

function buildSystemPrompt(profile, catalog, flavorTask) {
  const { department, sub_team, tier, goal, display_name } = profile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(profile);
  const primaryTool = tools[0];

  return [
    AUDIENCE,
    '',
    'You are an AI productivity coach on an internal learning platform.',
    'Your job: generate ONE specific, immediately actionable thing the user can do with AI right now in under 5 minutes.',
    '',
    'WHAT A QUICK WIN IS FOR: the user should walk away having LEARNED AN AI TECHNIQUE they can reuse — how to write a prompt that gets usable output, how to check an AI answer for accuracy, how to get AI to critique their own draft. The task is the vehicle; the technique is the point. Name the technique plainly in the description so they know what skill they just practiced.',
    'WHAT IT IS NOT: a deliverable for the company. These people are individual contributors, not owners — never hand them market-expansion strategy, a company value proposition, a customer-facing artifact, or a decision above their role. The output should be something small and personal they could throw away: a draft, a summary, a rewrite, a checked answer, a list of questions.',
    '',
    'Return a single JSON object with these fields:',
    '- title (string): short, catchy name for this quick win (e.g. "Draft a Meeting Recap in 30 Seconds")',
    '- description (string): 1-2 sentences explaining why this is useful and how it saves time',
    '- timeEstimate (string): estimated time like "~2 minutes" or "~4 minutes" — always under 5 minutes',
    '- steps (array of strings): 3-5 numbered step instructions to complete this win',
    `- prompt (string): the actual copy-paste prompt they can paste into ${primaryTool.label}. It MUST follow the RCTF framework: start with a Role ("You are a..."), then Context (background info), then Task (what to do), then Format (desired output structure). It must be COMPLETE — no placeholders like [insert X]. Make it specific and ready to use.`,
    '- expectedResult (string): 1-2 sentences describing what they will get back when they use the prompt',
    '',
    'Rules:',
    '- Return ONLY the JSON object. No markdown fences, no explanation outside the JSON.',
    '- The prompt must be specific and complete — no brackets, no fill-in-the-blank placeholders.',
    '- Keep it practical, not theoretical. Something they can literally do RIGHT NOW.',
    '- Vary your suggestions — cover different use cases: writing, analysis, planning, communication, brainstorming, summarizing.',
    buildToolGuidance(tools, catalog),
    !isDevTier
      ? '- The user is NOT a developer. Never suggest coding, APIs, or terminal commands. Focus on prompts they can paste into their AI tool.'
      : '- The user is a developer. You may suggest technical wins involving code, APIs, or developer tools.',
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}. Use that to set the scene, not to narrow the skill.` : null,
    flavorTask ? `- A real task of theirs you can build the example around: ${flavorTask}. Keep it as the setting — the technique must still transfer to anything else they do.` : null,
    goal ? `- Their learning goal: ${goal}. Connect the win to this goal when possible.` : null,
    display_name ? `- The user's name is ${display_name}.` : null,
  ].filter(Boolean).join('\n');
}

export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const { department, sub_team, top_tasks } = profile || {};

    let body = {};
    try {
      body = await request.json();
    } catch {
      // no body is fine
    }

    const requestedTask = body.task;
    // A per-session tool override (from the callout's switcher) wins over the
    // learner's saved preference for this generation only.
    const profileForGen = body.tools ? { ...profile, preferred_tools: body.tools } : profile;
    const primaryTool = resolveTools(profileForGen)[0];

    // Curated wins are hand-tuned for a SPECIFIC task, so they're served only when
    // the learner picked that task. "Surprise me" (no task) always generates:
    // the curated set is 55 fixed entries written as company deliverables — market
    // research on a franchise segment, expansion strategy — and Surprise me is
    // supposed to teach a technique the learner keeps, not hand an IC a task their
    // role doesn't own (feedback #141 follow-up).
    if (department && requestedTask) {
      const curated = getQuickWin(department, requestedTask);
      if (curated) {
        return NextResponse.json({
          quickWin: buildCuratedQuickWin(department, requestedTask, curated, primaryTool),
          source: 'curated',
          task: requestedTask,
        });
      }
    }

    const catalog = await getMergedTools();
    // For Surprise me, one of the learner's own tasks sets the scene for the
    // example — enough that it feels like their work without the technique being
    // about their job.
    const flavorTask = requestedTask || pickRandomTask(department, sub_team, top_tasks);
    const systemPrompt = buildSystemPrompt(profileForGen, catalog, flavorTask);
    const userMessage = requestedTask
      ? `Give me one quick AI win specifically for this task: "${requestedTask}". Make the prompt directly usable for this task.`
      : 'Give me one quick AI win I can do right now. Teach me an AI technique I can reuse, not a chore to complete. Make it different from common suggestions — surprise me with something useful.';

    const start = Date.now();
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const quickWin = JSON.parse(text);

    logAuditEntry({
      type: 'quick_win',
      endpoint: '/api/quick-win',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODEL,
      input: { task: requestedTask || 'random', department },
      output: { title: quickWin.title, source: 'ai' },
      durationMs: Date.now() - start,
    }).catch(() => {});

    return NextResponse.json({ quickWin, source: 'ai' });
  } catch (error) {
    console.error('POST /api/quick-win error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
