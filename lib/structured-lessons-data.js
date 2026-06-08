const LESSONS = [
  {
    id: 'customer-followup',
    title: 'Tech Note to Customer Message',
    subtitle: 'Rewrite a messy technician note into something a homeowner wants to read',
    category: 'Writing',
    difficulty: 'Beginner',
    persona: 'Field Technician',
    icon: '🔧',
    sourceText:
      'cust said AC blowing warm — checked refrig, low — added 2lb 410a — recommended coil clean nxt visit',
    instructions:
      'Rewrite this technician note as a friendly 2-3 sentence message to the customer (Mrs. Henderson). Explain what you found, what you did, and the recommended next step — no jargon.',
    gradingCriteria:
      'clarity, friendliness, includes what was found + what was done + next step, no jargon like "410a" or "refrigerant"',
    toneContext:
      'customer follow-up message after an HVAC service visit to Mrs. Henderson',
    customerName: 'Mrs. Henderson',
    tips: [
      'Explain what you found and what you did (no jargon)',
      'Mention the recommended next step',
      'Keep it friendly and brief (2-3 sentences)',
    ],
  },
  {
    id: 'complaint-summary',
    title: 'Summarize a Customer Complaint',
    subtitle: 'Turn a rambling complaint into a clear internal summary for the team',
    category: 'Analysis',
    difficulty: 'Beginner',
    persona: 'Customer Service',
    icon: '📋',
    sourceText:
      "I've been trying to get someone out here for THREE WEEKS. First they said Tuesday, nobody showed. Then I called back and the girl said Thursday between 8-12, I took off work, and the guy shows up at 3pm with no call. Then he looks at the water heater for 5 mins and says he needs a part and leaves. That was 9 days ago. I've called twice since then and nobody can tell me when the part is coming. I'm about to leave a review on every site I can find. This is the worst service I've ever experienced and I want a manager to call me TODAY.",
    instructions:
      'Write a 3-4 sentence internal summary for the team lead. Include: what happened, how many touchpoints, what the customer wants, and the urgency level. Keep it neutral and factual — no blame.',
    gradingCriteria:
      'captures the timeline accurately (3 weeks, missed appointment, late arrival, missing part, 2 follow-up calls), identifies what customer wants (manager callback today), neutral/professional tone, no blame language, concise',
    toneContext:
      'internal team summary of an escalated customer complaint about repeated service failures',
    customerName: null,
    tips: [
      'Stick to facts — what happened and when',
      'Count the touchpoints (calls, visits, missed appointments)',
      'State what the customer wants and the urgency level',
      'Keep it neutral — no blame or editorializing',
    ],
  },
  {
    id: 'team-update',
    title: 'Bullet Points to Team Update',
    subtitle: 'Turn scattered notes into a clear weekly update for your team',
    category: 'Writing',
    difficulty: 'Beginner',
    persona: 'Manager / Team Lead',
    icon: '📊',
    sourceText:
      '- hired 2 new techs start monday\n- parts backorder issue resolved finally\n- q3 revenue up 12% over q2\n- sarah got her NATE cert congrats\n- new scheduling software training next wed 2pm\n- 3 trucks need inspection by end of month\n- customer satisfaction score 4.7 this month (was 4.3)',
    instructions:
      'Write a clear, organized team update email (5-8 sentences). Group related items, lead with wins, and make the action items obvious. Keep it motivating but professional.',
    gradingCriteria:
      'logical grouping of items, leads with positive news (revenue, satisfaction, certification), action items are clear (training date, truck inspections), welcoming tone for new hires, professional but warm',
    toneContext:
      'weekly team update email from a service manager to their field team',
    customerName: null,
    tips: [
      'Lead with wins — people read the first line',
      'Group related items together (people, operations, metrics)',
      'Make action items stand out with dates',
      'Keep the tone motivating but not over-the-top',
    ],
  },
  {
    id: 'feature-to-benefit',
    title: 'Features to Benefits Pitch',
    subtitle: 'Transform a feature list into a pitch that sells the outcome',
    category: 'Writing',
    difficulty: 'Intermediate',
    persona: 'Sales',
    icon: '💰',
    sourceText:
      '- Online booking with real-time availability\n- Automated appointment reminders (text + email)\n- GPS tech tracking for customers\n- Digital invoicing with online payment\n- Automated review requests after job completion\n- Customer portal with service history',
    instructions:
      'Write a 4-5 sentence pitch for a plumbing company owner explaining why these features matter for their business. Focus on outcomes (more bookings, fewer no-shows, faster payment) not the features themselves.',
    gradingCriteria:
      'focuses on business outcomes not features, speaks to pain points a plumbing company owner cares about (missed calls, late payments, reputation), conversational not salesy, specific value propositions, avoids generic marketing speak',
    toneContext:
      'sales pitch to a plumbing company owner about Housecall Pro software features',
    customerName: null,
    tips: [
      'Lead with the problem the owner faces, not the feature',
      'Translate each feature into a business outcome',
      'Use specific language ("fewer no-shows" not "improved efficiency")',
      'Sound like a helpful advisor, not a sales script',
    ],
  },
  {
    id: 'negative-review-reply',
    title: 'Reply to a Negative Review',
    subtitle: 'Draft a professional response that turns a bad review into a trust signal',
    category: 'Writing',
    difficulty: 'Intermediate',
    persona: 'Marketing / Reputation',
    icon: '⭐',
    sourceText:
      '⭐ (1/5) — "Charged me $400 for a drain cleaning that took 20 minutes. The tech was nice enough but this is highway robbery. I could have rented a snake from Home Depot for $50. Will never use again and telling all my neighbors to avoid." — Mike R.',
    instructions:
      'Write a professional public reply (3-4 sentences). Acknowledge the concern, explain the value without being defensive, and offer to make it right. Remember: future customers are reading this reply.',
    gradingCriteria:
      'acknowledges the frustration without being defensive, explains value (professional equipment, warranty, expertise) without dismissing the complaint, offers a path to resolution (call us, partial credit, etc.), professional tone that future customers would find reassuring, does NOT argue or get sarcastic',
    toneContext:
      'public reply to a 1-star review about pricing for a drain cleaning service',
    customerName: 'Mike',
    tips: [
      'Thank them for the feedback — even when it stings',
      'Acknowledge the concern before explaining anything',
      'Explain value without being defensive or argumentative',
      'Offer a clear next step to make it right',
    ],
  },
  {
    id: 'policy-announcement',
    title: 'Simplify a Policy Change',
    subtitle: 'Turn a dense policy update into something the whole team will actually read',
    category: 'Writing',
    difficulty: 'Intermediate',
    persona: 'HR / Admin',
    icon: '📜',
    sourceText:
      'Effective July 1, 2026, all field personnel are required to complete a digital pre-trip vehicle inspection via the Fleet Management module prior to departing the designated staging area for any service call assignment. Inspections must include photographic documentation of tire condition, fluid levels, and equipment inventory. Personnel who fail to complete the pre-trip inspection will be subject to progressive disciplinary action per Section 7.3 of the Employee Handbook. Supervisors are responsible for monitoring compliance via the Fleet Dashboard and addressing non-compliance within 24 hours of occurrence.',
    instructions:
      'Rewrite this policy update as a clear, friendly announcement to the field team (4-5 sentences). They need to know: what changed, when it starts, what they need to do, and why it matters. Skip the legalese.',
    gradingCriteria:
      'plain language (no "personnel", "designated staging area", "progressive disciplinary action"), clear what/when/how, explains why (safety, accountability) not just rules, friendly but firm tone, actionable',
    toneContext:
      'team announcement about a new vehicle inspection policy for field technicians',
    customerName: null,
    tips: [
      'Replace corporate jargon with everyday words',
      'Lead with what they need to DO, not the policy number',
      'Explain WHY — people follow rules they understand',
      'Keep the tone "team captain" not "legal department"',
    ],
  },
  {
    id: 'kb-article',
    title: 'Support Ticket to Knowledge Base Article',
    subtitle: 'Turn a solved support ticket into a self-service help article',
    category: 'Analysis',
    difficulty: 'Intermediate',
    persona: 'Support / Knowledge',
    icon: '📖',
    sourceText:
      'Ticket #4821 — Customer: "My invoices are showing the wrong tax rate since I moved offices last month."\n\nResolution: Customer had updated their business address in Profile but not in Settings > Tax Configuration. Tax rates are pulled from Tax Configuration, not the profile address. Had them go to Settings > Tax Configuration > Tax Rates, click Edit, update the service area ZIP code to 85281, save. Tax rate auto-updated to 8.6%. Verified on a test invoice — correct now.',
    instructions:
      'Write a short help article (title + 3-4 step instructions + one-sentence explanation) that other customers could follow to fix this themselves. Clear, scannable, no unnecessary words.',
    gradingCriteria:
      'has a clear descriptive title, steps are numbered and specific (includes exact navigation path), explains the root cause briefly (tax config vs profile address), scannable format, no jargon or ticket-specific details',
    toneContext:
      'customer-facing knowledge base article about updating tax rates after a business address change',
    customerName: null,
    tips: [
      'Write a title that matches what someone would search for',
      'Number the steps — people scan, they do not read',
      'Include the exact navigation path (Settings > Tax Configuration > ...)',
      'Add a one-line "why" so they understand the root cause',
    ],
  },
  {
    id: 'meeting-to-actions',
    title: 'Meeting Notes to Action Items',
    subtitle: 'Extract clear owners and deadlines from messy meeting notes',
    category: 'Analysis',
    difficulty: 'Beginner',
    persona: 'Any Role',
    icon: '📝',
    sourceText:
      "Discussed the new onboarding flow for customers. Jake said he'd look into the welcome email — it's been broken since the migration. Maria mentioned we're losing people at step 3 of signup, probably the phone verification. She'll pull the drop-off data by Thursday. Tom wants to A/B test removing phone verification entirely but needs legal to weigh in first — he'll send the request today. Also need to update the help docs before launch, nobody volunteered for that yet. Launch target is still July 15 but Maria said that's tight if we don't start testing by end of next week.",
    instructions:
      'Extract the action items from these meeting notes. For each item, include: who owns it, what they need to do, and the deadline (if mentioned). Then add one line about the key risk or blocker.',
    gradingCriteria:
      'captures all 4 action items (Jake: welcome email, Maria: drop-off data by Thursday, Tom: legal request today, help docs: unassigned), includes owners and deadlines where mentioned, flags the unassigned item and the timeline risk, concise format',
    toneContext:
      'follow-up action items from a product team meeting about customer onboarding improvements',
    customerName: null,
    tips: [
      'Scan for every "will", "need to", "going to" — that is an action item',
      'Every action item needs an owner (or flag it as unassigned)',
      'Include deadlines when mentioned, even rough ones',
      'Call out risks and blockers at the end',
    ],
  },
  {
    id: 'jargon-for-newhire',
    title: 'Rewrite Instructions for a New Hire',
    subtitle: 'Make internal instructions understandable for someone on day one',
    category: 'Writing',
    difficulty: 'Beginner',
    persona: 'Training / Onboarding',
    icon: '🎓',
    sourceText:
      "To close out a job, make sure the WO is fully filled — all line items, parts used, and labor hours. Then flip it to 'Completed' in the dispatch board. If there's a warranty claim, tag it WC and route to Brenda before invoicing. Don't forget to attach your photos to the WO or accounting will kick it back. If the customer signed the tablet, the e-sig auto-syncs but double-check it shows in the portal. Pro tip: batch your closeouts at EOD so you're not doing them on-site.",
    instructions:
      'Rewrite these instructions for a brand-new technician on their first week. Spell out abbreviations, explain the "why" behind each step, and keep the friendly tone. 5-7 sentences.',
    gradingCriteria:
      'all abbreviations expanded (WO = work order, WC = warranty claim, EOD = end of day, e-sig = electronic signature), steps are in logical order, explains WHY (photos needed for accounting, e-sig for customer records), friendly/encouraging tone, does not assume prior knowledge of the dispatch board or portal',
    toneContext:
      'training instructions for a new field technician learning how to close out a job in Housecall Pro',
    customerName: null,
    tips: [
      'Spell out every abbreviation — they do not know WO, WC, or EOD yet',
      'Explain why each step matters, not just what to do',
      'Keep the order logical (do this, then this, then this)',
      'Sound like a helpful coworker, not a manual',
    ],
  },
  {
    id: 'status-update',
    title: 'Scattered Notes to Project Update',
    subtitle: 'Turn a pile of project notes into a crisp status update for leadership',
    category: 'Writing',
    difficulty: 'Advanced',
    persona: 'Project Manager / Operations',
    icon: '🚀',
    sourceText:
      "- CRM migration 80% done, stuck on custom field mapping for 2 weeks\n- vendor says fix by friday but they said that last friday too\n- mobile app redesign on track, beta next month\n- hired a QA contractor, starts monday\n- budget is 15% over on the CRM project due to vendor delays\n- CEO wants a demo of the new dashboard by the 20th\n- 2 devs out sick this week, slowed down the API work\n- customer portal launch pushed from June to August\n- good news: NPS score hit 72 this quarter, highest ever",
    instructions:
      'Write a professional project status update for the leadership team (6-8 sentences). Organize by status (on track, at risk, blocked), lead with the win, be honest about problems but frame them with your plan to resolve. Include the key date commitments.',
    gradingCriteria:
      'organized by status not by bullet order, leads with NPS win, honest about CRM delays and budget overrun with resolution plan, flags the vendor reliability issue, mentions key dates (demo by 20th, beta next month, portal pushed to August), professional executive tone, does not hide bad news but frames it constructively',
    toneContext:
      'weekly project status update email to the leadership team covering multiple workstreams',
    customerName: null,
    tips: [
      'Lead with the win — it earns you goodwill for the bad news',
      'Group by status (green/yellow/red) not by project',
      'For every problem, include what you are doing about it',
      'Include specific dates — leaders want to know when, not just what',
    ],
  },
];

export function getAllLessons() {
  return LESSONS.map(({ id, title, subtitle, category, difficulty, persona, icon }) => ({
    id,
    title,
    subtitle,
    category,
    difficulty,
    persona,
    icon,
  }));
}

export function getLessonById(id) {
  return LESSONS.find(l => l.id === id) || null;
}

export function getLessonCategories() {
  return [...new Set(LESSONS.map(l => l.category))];
}
