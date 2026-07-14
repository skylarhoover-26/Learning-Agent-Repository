'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Library, Search, Clock, ChevronRight, ChevronDown, Copy, Check, X, TrendingUp, History } from 'lucide-react';
import { trackUseCaseTry, trackUseCaseCopy, getMostUsedIds, getRecentlyUsedIds } from '@/lib/library-store';
import { sortByDifficulty } from '@/lib/difficulty';

const USE_CASES = [
  { id: 1, icon: '📧', title: 'Draft customer emails', description: 'Generate professional email responses to common customer inquiries.', difficulty: 'easy', category: 'communication', roles: ['cs', 'sales'], timeSaved: '10 min/email', starterPrompt: 'You are a customer success professional at a home services software company. Draft a warm, professional response to this customer inquiry: [paste inquiry]' },
  { id: 2, icon: '📊', title: 'Summarize meeting notes', description: 'Turn messy meeting notes into clean summaries with action items and owners.', difficulty: 'easy', category: 'meetings', roles: ['all'], timeSaved: '15 min/meeting', starterPrompt: 'Summarize the following meeting notes into: 1) Key decisions made, 2) Action items with owners and deadlines, 3) Open questions. Notes: [paste notes]' },
  { id: 3, icon: '🔍', title: 'Research competitor features', description: 'Analyze and compare competitor product features for strategic planning.', difficulty: 'medium', category: 'research', roles: ['product', 'marketing'], timeSaved: '1 hour/report', starterPrompt: 'Compare these two products for a home services audience. For each, list: key features, pricing model, strengths, weaknesses, and what they do better than us. Products: [list products]' },
  { id: 4, icon: '📝', title: 'Create training content', description: 'Generate first drafts of training materials, quizzes, and guides for your team.', difficulty: 'medium', category: 'documentation', roles: ['enablement', 'leadership'], timeSaved: '2 hours/module', starterPrompt: 'Create a training module outline for [topic]. Include: learning objectives, key concepts, an interactive exercise, and 5 quiz questions. The audience is [role] employees who are [experience level].' },
  { id: 5, icon: '🎯', title: 'Write job descriptions', description: 'Generate role-specific job descriptions with clear responsibilities and requirements.', difficulty: 'easy', category: 'writing', roles: ['hr', 'leadership'], timeSaved: '30 min/posting', starterPrompt: 'Write a job description for [role] at a growing home services technology company. Include: role summary, key responsibilities (5-7), required qualifications, preferred qualifications, and what makes this role exciting.' },
  { id: 6, icon: '💡', title: 'Brainstorm solutions', description: 'Generate creative approaches to challenging problems with structured thinking.', difficulty: 'easy', category: 'decisions', roles: ['all'], timeSaved: '20 min/session', starterPrompt: 'I need creative solutions for this challenge: [describe challenge]. Generate 5 different approaches, each with: the approach, why it could work, risks, and first step to try.' },
  { id: 7, icon: '📈', title: 'Analyze customer feedback', description: 'Extract themes and insights from large volumes of customer feedback data.', difficulty: 'medium', category: 'analysis', roles: ['cs', 'product'], timeSaved: '3 hours/batch', starterPrompt: 'Analyze these customer feedback responses. Identify: top 5 themes, sentiment distribution, specific feature requests, and 3 actionable recommendations. Data: [paste feedback]' },
  { id: 8, icon: '🚀', title: 'Write release notes', description: 'Transform technical change logs into customer-friendly release communications.', difficulty: 'easy', category: 'communication', roles: ['product', 'marketing'], timeSaved: '20 min/release', starterPrompt: 'Convert these technical release notes into a customer-friendly announcement. Use simple language, highlight benefits (not features), and include a compelling subject line. Technical notes: [paste notes]' },
  { id: 9, icon: '✅', title: 'Create onboarding checklists', description: 'Build comprehensive onboarding checklists for new hires or new customers.', difficulty: 'easy', category: 'planning', roles: ['hr', 'cs', 'enablement'], timeSaved: '45 min/checklist', starterPrompt: 'Create a detailed onboarding checklist for a new [role/customer type] at a home services software company. Include: week 1 tasks, week 2 tasks, key people to meet, systems to set up, and knowledge to acquire. Duration: [timeframe].' },
  { id: 10, icon: '📋', title: 'Write SOPs', description: 'Generate standard operating procedures for repeatable team processes.', difficulty: 'medium', category: 'documentation', roles: ['leadership', 'enablement'], timeSaved: '1 hour/SOP', starterPrompt: 'Write a standard operating procedure for [process]. Include: purpose, scope, required tools, step-by-step instructions, common mistakes to avoid, and an FAQ section. Keep language simple enough for a new team member.' },
  { id: 11, icon: '📱', title: 'Generate social media posts', description: 'Create engaging social media content tailored to different platforms.', difficulty: 'easy', category: 'communication', roles: ['marketing'], timeSaved: '15 min/post', starterPrompt: 'Write a [platform: LinkedIn/Twitter/Facebook] post about [topic] for a home services technology company. Tone: [professional/casual/exciting]. Include a hook, value proposition, and call-to-action. Max [character count] characters.' },
  { id: 12, icon: '📄', title: 'Draft proposal templates', description: 'Create client-facing proposals and business case documents.', difficulty: 'medium', category: 'writing', roles: ['sales', 'leadership'], timeSaved: '1 hour/proposal', starterPrompt: 'Draft a proposal for [prospect company] who needs [solution]. Include: executive summary, problem statement, proposed solution, timeline, investment, and expected ROI. Our company provides home services software.' },
  { id: 13, icon: '❓', title: 'Build FAQ documents', description: 'Create comprehensive FAQ pages from common questions and product knowledge.', difficulty: 'easy', category: 'documentation', roles: ['cs', 'product', 'enablement'], timeSaved: '1 hour/FAQ set', starterPrompt: 'Create an FAQ document for [feature/product area] with 10 questions and answers. Questions should reflect what customers actually ask (not marketing language). Include both basic and advanced questions.' },
  { id: 14, icon: '🎟️', title: 'Analyze support ticket trends', description: 'Identify patterns and root causes in support ticket data.', difficulty: 'medium', category: 'analysis', roles: ['cs', 'product'], timeSaved: '2 hours/analysis', starterPrompt: 'Analyze these support tickets from the past [timeframe]. Identify: top 5 issue categories, trending problems, resolution patterns, and recommendations for reducing ticket volume. Data: [paste ticket summaries]' },
  { id: 15, icon: '⭐', title: 'Create performance review templates', description: 'Generate structured self-reviews, peer reviews, and manager assessments.', difficulty: 'easy', category: 'writing', roles: ['hr', 'leadership'], timeSaved: '30 min/review', starterPrompt: 'Help me write a [self/peer/manager] performance review for a [role] who [key accomplishments]. Include: strengths (3), areas for growth (2), specific examples, and goals for next quarter. Tone: constructive and encouraging.' },
  { id: 16, icon: '📢', title: 'Write internal announcements', description: 'Craft clear internal communications for company updates, changes, and wins.', difficulty: 'easy', category: 'communication', roles: ['leadership', 'hr', 'marketing'], timeSaved: '20 min/announcement', starterPrompt: 'Write an internal announcement about [change/update/win]. Audience: all employees. Include: what changed, why, how it affects them, what action (if any) they need to take, and who to contact with questions. Tone: [positive/neutral/sensitive].' },
  { id: 17, icon: '📉', title: 'Generate report summaries', description: 'Distill long reports into executive summaries with key takeaways.', difficulty: 'easy', category: 'analysis', roles: ['all'], timeSaved: '20 min/report', starterPrompt: 'Summarize this report into a 1-page executive summary for [audience]. Include: key findings (3-5), implications, recommended actions, and any risks or caveats. Report: [paste report or key sections]' },
  { id: 18, icon: '📅', title: 'Draft meeting agendas', description: 'Create structured meeting agendas with clear objectives and time allocations.', difficulty: 'easy', category: 'meetings', roles: ['all'], timeSaved: '10 min/agenda', starterPrompt: 'Create an agenda for a [duration]-minute [meeting type] with [attendees]. Topic: [main topic]. Include: objectives, discussion items with time allocations, decision points, and next steps. Prioritize the most important items first.' },
  { id: 19, icon: '📊', title: 'Create project status updates', description: 'Turn scattered project notes into polished status reports.', difficulty: 'easy', category: 'planning', roles: ['all'], timeSaved: '15 min/update', starterPrompt: 'Create a project status update for [project name]. Include: overall status (on track/at risk/blocked), progress since last update, key accomplishments, blockers, next steps, and help needed. Raw notes: [paste notes]' },
  { id: 20, icon: '📖', title: 'Write knowledge base articles', description: 'Create searchable help articles that reduce support ticket volume.', difficulty: 'medium', category: 'documentation', roles: ['cs', 'enablement', 'product'], timeSaved: '45 min/article', starterPrompt: 'Write a knowledge base article about [topic]. Include: title, brief description, step-by-step instructions with screenshots placeholders, troubleshooting tips, and related articles. Write for a non-technical audience.' },
  { id: 21, icon: '📋', title: 'Analyze survey results', description: 'Extract insights and recommendations from employee or customer survey data.', difficulty: 'medium', category: 'analysis', roles: ['hr', 'cs', 'product'], timeSaved: '2 hours/survey', starterPrompt: 'Analyze these survey results. Identify: overall sentiment, top themes (positive and negative), demographic differences (if applicable), and 3-5 actionable recommendations. Include confidence levels for each finding. Data: [paste results]' },
  { id: 22, icon: '📞', title: 'Generate sales call scripts', description: 'Create structured call scripts for discovery, demo, and follow-up calls.', difficulty: 'medium', category: 'communication', roles: ['sales'], timeSaved: '30 min/script', starterPrompt: 'Create a [discovery/demo/follow-up] call script for a [prospect type]. Include: opening hook, qualifying questions, value propositions tailored to home services businesses, objection handling (3 common objections), and closing/next steps.' },
  { id: 23, icon: '🏆', title: 'Create customer win stories', description: 'Turn customer success data into compelling case studies and testimonials.', difficulty: 'medium', category: 'writing', roles: ['marketing', 'cs', 'sales'], timeSaved: '1 hour/story', starterPrompt: 'Write a customer success story based on these details: [customer name, industry, challenge, solution, results]. Format: challenge → solution → results. Include specific metrics. Tone: professional but compelling. Length: 300-500 words.' },
  { id: 24, icon: '📜', title: 'Draft policy documents', description: 'Create clear, comprehensive policy documents for teams and organizations.', difficulty: 'medium', category: 'documentation', roles: ['hr', 'leadership'], timeSaved: '2 hours/policy', starterPrompt: 'Draft a [policy type] policy for a growing technology company (~500 employees). Include: purpose, scope, definitions, policy statements, procedures, exceptions, and enforcement. Use clear, non-legalistic language.' },
  { id: 25, icon: '🎤', title: 'Build interview question sets', description: 'Generate role-specific behavioral and technical interview questions.', difficulty: 'easy', category: 'planning', roles: ['hr', 'leadership'], timeSaved: '30 min/set', starterPrompt: 'Create 10 interview questions for a [role] position. Include: 4 behavioral questions (STAR format), 3 situational questions, 3 role-specific technical questions. For each, include what a strong answer looks like.' },
  { id: 26, icon: '📚', title: 'Write product documentation', description: 'Create user-facing product docs, feature guides, and API references.', difficulty: 'advanced', category: 'documentation', roles: ['product', 'enablement'], timeSaved: '2 hours/doc', starterPrompt: 'Write product documentation for [feature/product area]. Include: overview, use cases, getting started guide, detailed feature walkthrough, best practices, and FAQ. Audience: [technical level]. Include placeholder callouts for screenshots.' },
  { id: 27, icon: '🔢', title: 'Generate data analysis summaries', description: 'Turn spreadsheet data into narrative insights for stakeholders.', difficulty: 'medium', category: 'analysis', roles: ['all'], timeSaved: '30 min/analysis', starterPrompt: 'Analyze this data and write a narrative summary for [audience]. Include: what the data shows, 3 key insights, how this compares to [benchmark/previous period], and recommended actions. Data: [paste data or describe metrics]' },
  { id: 28, icon: '🎨', title: 'Create presentation outlines', description: 'Build structured presentation outlines with key talking points per slide.', difficulty: 'easy', category: 'planning', roles: ['all'], timeSaved: '30 min/deck', starterPrompt: 'Create a presentation outline for [topic]. Audience: [who]. Duration: [X] minutes. Include: slide titles, 3-4 bullet points per slide, speaker notes, and a strong opening/closing. Total slides: [target number].' },
  { id: 29, icon: '🔄', title: 'Draft change management comms', description: 'Create communication plans for organizational or process changes.', difficulty: 'advanced', category: 'communication', roles: ['leadership', 'hr', 'enablement'], timeSaved: '1 hour/plan', starterPrompt: 'Create a change management communication plan for [change]. Include: announcement email, FAQ for managers, FAQ for individual contributors, timeline of communications, key messages by audience, and potential concerns with responses.' },
  { id: 30, icon: '🔧', title: 'Build troubleshooting guides', description: 'Create step-by-step troubleshooting workflows for common issues.', difficulty: 'medium', category: 'documentation', roles: ['cs', 'product', 'enablement'], timeSaved: '45 min/guide', starterPrompt: 'Create a troubleshooting guide for [issue/feature]. Include: common symptoms, diagnostic steps (in order), solutions for each root cause, escalation criteria, and prevention tips. Format as a decision tree where possible.' },
  { id: 31, icon: '📄', title: 'Summarize a long document', description: 'Condense a long report, contract, or article into the parts that matter.', difficulty: 'easy', category: 'research', roles: ['all'], timeSaved: '30 min/doc', starterPrompt: 'Summarize the document below for a busy [role]. Give me: a 3-sentence overview, the 5 most important points, anything that needs a decision or action, and any risks or unclear parts. Document: [paste document]' },
  { id: 32, icon: '🔎', title: 'Research a prospect before a call', description: 'Pull together a quick briefing on a company or person before you meet.', difficulty: 'medium', category: 'research', roles: ['sales', 'cs', 'leadership'], timeSaved: '30 min/call', starterPrompt: 'I have a call with [company/person]. Based on the details below, create a short pre-call briefing: who they are, likely priorities and pain points, smart questions to ask, and how a home services software company could help. Details: [paste what you know / website text]' },
  { id: 33, icon: '⚖️', title: 'Compare tools or vendors', description: 'Build a side-by-side comparison to support a buying or build decision.', difficulty: 'medium', category: 'research', roles: ['all'], timeSaved: '1 hour/decision', starterPrompt: 'Compare these options for [use case]: [list 2-4 tools/vendors]. Create a table scoring each on: key capabilities, ease of use, pricing, integration, and risks. End with a recommendation for a team that cares most about [priority].' },
  { id: 34, icon: '🤔', title: 'Weigh pros and cons of a decision', description: 'Think through a decision with a structured pros/cons and recommendation.', difficulty: 'easy', category: 'decisions', roles: ['all'], timeSaved: '20 min/decision', starterPrompt: 'Help me decide: [describe the decision]. Lay out the realistic options, the pros and cons of each, what could go wrong, and what you would recommend given that I care most about [priority]. Ask me anything you need first.' },
  { id: 35, icon: '🛡️', title: 'Pressure-test a plan for risks', description: 'Have AI play devil\'s advocate and surface the risks in your plan.', difficulty: 'medium', category: 'decisions', roles: ['leadership', 'product', 'enablement'], timeSaved: '30 min/plan', starterPrompt: 'Here is my plan: [paste plan]. Act as a skeptical reviewer. Identify the top risks, hidden assumptions, and failure modes. For each, tell me how likely and how severe it is, and one way to reduce it. Be direct.' },
  { id: 36, icon: '🗺️', title: 'Plan a project timeline', description: 'Turn a goal into a phased timeline with milestones and owners.', difficulty: 'medium', category: 'planning', roles: ['all'], timeSaved: '45 min/plan', starterPrompt: 'Create a project plan to achieve [goal] by [deadline]. Break it into phases with milestones, key tasks, suggested owners/roles, dependencies, and risks to watch. Assume a small cross-functional team.' },
  { id: 37, icon: '🧩', title: 'Break a big goal into weekly tasks', description: 'Split an overwhelming goal into a realistic week-by-week plan.', difficulty: 'easy', category: 'planning', roles: ['all'], timeSaved: '20 min/goal', starterPrompt: 'I want to achieve [goal] in [timeframe]. Break it into a week-by-week plan with 2-4 concrete tasks per week, a clear outcome for each week, and a way to tell if I am on track. Keep it realistic for someone who can spend [hours] per week.' },
  { id: 38, icon: '🗣️', title: 'Prep for a 1:1 or check-in', description: 'Get focused talking points and questions ready for a 1:1 meeting.', difficulty: 'easy', category: 'meetings', roles: ['leadership', 'hr', 'all'], timeSaved: '15 min/meeting', starterPrompt: 'Help me prep for a 1:1 with [name/role]. Based on the context below, suggest: 3-4 talking points, good open questions to ask, anything I should follow up on, and a positive note to recognize. Context: [paste recent updates]' },
];

// Category taxonomy, kept in alphabetical order by label — this is the order the
// collapsible sections render in and the order the Category dropdown lists them.
const CATEGORIES = {
  analysis: { label: 'Analysis & Data' },
  communication: { label: 'Communication' },
  decisions: { label: 'Decisions' },
  documentation: { label: 'Documentation' },
  meetings: { label: 'Meetings' },
  planning: { label: 'Planning' },
  research: { label: 'Research' },
  writing: { label: 'Writing' },
};
const CATEGORY_ORDER = Object.keys(CATEGORIES);

const ROLES = {
  cs: { label: 'Customer Success' },
  sales: { label: 'Sales' },
  product: { label: 'Product' },
  marketing: { label: 'Marketing' },
  enablement: { label: 'Enablement' },
  hr: { label: 'HR / People' },
  leadership: { label: 'Leadership' },
};

// Colored difficulty pills, matching the Practice (structured-lesson) screen so
// the difficulty graphic reads the same way across the app.
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', advanced: 'Advanced' };
const DIFFICULTY_STYLES = {
  easy: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  advanced: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};
// The card's hover glow (`.cine-tilt:hover` reads `--accent`) is recolored per
// difficulty so the "pop" matches the level: green=easy, orange=medium, red=hard.
const DIFFICULTY_GLOW = { easy: '#22C55E', medium: '#F59E0B', advanced: '#EF4444' };
const difficultyPill = 'inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border';

function DifficultyBadge({ difficulty }) {
  const key = DIFFICULTY_LABELS[difficulty] ? difficulty : 'medium';
  return <span className={`${difficultyPill} ${DIFFICULTY_STYLES[key]}`}>{DIFFICULTY_LABELS[key]}</span>;
}

// The Use Case Library, extracted so it can render on its own /library screen.
export default function UseCaseLibrary() {
  const [role, setRole] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [popularIds, setPopularIds] = useState([]);
  const [recentIds, setRecentIds] = useState([]);

  useEffect(() => {
    setPopularIds(getMostUsedIds(5));
    setRecentIds(getRecentlyUsedIds(5));
  }, []);

  const filtered = useMemo(() => {
    return USE_CASES.filter(uc => {
      if (role !== 'all' && !uc.roles.includes(role) && !uc.roles.includes('all')) return false;
      if (category !== 'all' && uc.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return uc.title.toLowerCase().includes(q) || uc.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [role, category, search]);

  // Group the filtered use cases by category, preserving CATEGORY_ORDER and
  // dropping empty categories so only sections with matches render.
  const grouped = useMemo(() => {
    return CATEGORY_ORDER
      .map(key => ({ key, label: CATEGORIES[key].label, items: sortByDifficulty(filtered.filter(uc => uc.category === key)) }))
      .filter(group => group.items.length > 0);
  }, [filtered]);

  function toggleCategory(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <div className="cine-glass rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 8px 20px -8px var(--accent)' }}>
            <Library className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-ink dark:text-slate-200 mb-1">Browse what AI can actually do</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Use cases are grouped by category — expand a section to explore. Each has a copy-paste prompt you can use right now, or click <strong>Try it</strong> to walk through it as a lesson.
            </p>
          </div>
        </div>
      </div>

      <div data-tour="page-library" className="cine-glass rounded-2xl p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                data-tour="library-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try: 'email', 'meeting', 'analyze'..."
                className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white dark:bg-slate-800">
              <option value="all">All roles</option>
              {Object.entries(ROLES).map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white dark:bg-slate-800">
              <option value="all">All categories</option>
              {CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>{CATEGORIES[key].label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Showing <strong>{filtered.length}</strong> of {USE_CASES.length} use cases across {grouped.length} categories
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="cine-glass rounded-2xl border-dashed p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400">No use cases match your filters. Try clearing some.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => {
            const isCollapsed = collapsed[group.key];
            return (
              <section key={group.key} className="cine-glass rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(group.key)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="font-bold text-ink dark:text-slate-200">{group.label}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
                      {group.items.length}
                    </span>
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.items.map(uc => (
                      <UseCaseCard
                        key={uc.id}
                        uc={uc}
                        isPopular={popularIds.includes(uc.id)}
                        isRecent={recentIds.includes(uc.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UseCaseCard({ uc, isPopular, isRecent }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const cat = CATEGORIES[uc.category] || {};

  function copyPrompt(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(uc.starterPrompt || '');
      setCopied(true);
      trackUseCaseCopy(uc.id);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }

  function handleTry() {
    trackUseCaseTry(uc.id);
  }

  const diffKey = DIFFICULTY_LABELS[uc.difficulty] ? uc.difficulty : 'medium';
  return (
    <div className="cine-glass cine-tilt rounded-2xl transition-all overflow-hidden" style={{ '--accent': DIFFICULTY_GLOW[diffKey] }}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {uc.icon && (
            <span
              className="shrink-0 w-11 h-11 rounded-xl grid place-items-center text-2xl leading-none"
              style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
            >
              {uc.icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-ink dark:text-slate-200 leading-tight mb-1.5">{uc.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <DifficultyBadge difficulty={uc.difficulty} />
              {cat.label && <span className="text-xs text-slate-500 dark:text-slate-400">{cat.label}</span>}
              {isPopular && (
                <span className="text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Popular
                </span>
              )}
              {isRecent && !isPopular && (
                <span className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                  <History className="w-3 h-3" /> Recent
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{uc.description}</p>
        {uc.timeSaved && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Saves {uc.timeSaved}
          </p>
        )}
        <div className="flex gap-2">
          <Link
            href={`/lesson?topic=${encodeURIComponent(uc.title)}`}
            onClick={handleTry}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
          >
            Try it <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-all"
          >
            Prompt
          </button>
        </div>
        {showPrompt && (
          <div className="mt-3 bg-bg-warm dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Copy-paste prompt</span>
              <button onClick={copyPrompt} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 inline-flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">{uc.starterPrompt}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
