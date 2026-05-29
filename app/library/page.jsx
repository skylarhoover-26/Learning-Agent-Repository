'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Library, Search, Clock, ChevronRight, Copy, Check, X } from 'lucide-react';

const USE_CASES = [
  { id: 1, icon: '📧', title: 'Draft customer emails', description: 'Generate professional email responses to common customer inquiries.', difficulty: 'easy', category: 'writing', roles: ['cs', 'sales'], timeSaved: '10 min/email', starterPrompt: 'You are a customer success professional at a home services software company. Draft a warm, professional response to this customer inquiry: [paste inquiry]' },
  { id: 2, icon: '📊', title: 'Summarize meeting notes', description: 'Turn messy meeting notes into clean summaries with action items and owners.', difficulty: 'easy', category: 'meetings', roles: ['all'], timeSaved: '15 min/meeting', starterPrompt: 'Summarize the following meeting notes into: 1) Key decisions made, 2) Action items with owners and deadlines, 3) Open questions. Notes: [paste notes]' },
  { id: 3, icon: '🔍', title: 'Research competitor features', description: 'Analyze and compare competitor product features for strategic planning.', difficulty: 'medium', category: 'analysis', roles: ['product', 'marketing'], timeSaved: '1 hour/report', starterPrompt: 'Compare these two products for a home services audience. For each, list: key features, pricing model, strengths, weaknesses, and what they do better than us. Products: [list products]' },
  { id: 4, icon: '📝', title: 'Create training content', description: 'Generate first drafts of training materials, quizzes, and guides for your team.', difficulty: 'medium', category: 'writing', roles: ['enablement', 'leadership'], timeSaved: '2 hours/module', starterPrompt: 'Create a training module outline for [topic]. Include: learning objectives, key concepts, an interactive exercise, and 5 quiz questions. The audience is [role] employees who are [experience level].' },
  { id: 5, icon: '🎯', title: 'Write job descriptions', description: 'Generate role-specific job descriptions with clear responsibilities and requirements.', difficulty: 'easy', category: 'writing', roles: ['hr', 'leadership'], timeSaved: '30 min/posting', starterPrompt: 'Write a job description for [role] at a growing home services technology company. Include: role summary, key responsibilities (5-7), required qualifications, preferred qualifications, and what makes this role exciting.' },
  { id: 6, icon: '💡', title: 'Brainstorm solutions', description: 'Generate creative approaches to challenging problems with structured thinking.', difficulty: 'easy', category: 'decisions', roles: ['all'], timeSaved: '20 min/session', starterPrompt: 'I need creative solutions for this challenge: [describe challenge]. Generate 5 different approaches, each with: the approach, why it could work, risks, and first step to try.' },
  { id: 7, icon: '📈', title: 'Analyze customer feedback', description: 'Extract themes and insights from large volumes of customer feedback data.', difficulty: 'medium', category: 'analysis', roles: ['cs', 'product'], timeSaved: '3 hours/batch', starterPrompt: 'Analyze these customer feedback responses. Identify: top 5 themes, sentiment distribution, specific feature requests, and 3 actionable recommendations. Data: [paste feedback]' },
  { id: 8, icon: '🚀', title: 'Write release notes', description: 'Transform technical change logs into customer-friendly release communications.', difficulty: 'easy', category: 'writing', roles: ['product', 'marketing'], timeSaved: '20 min/release', starterPrompt: 'Convert these technical release notes into a customer-friendly announcement. Use simple language, highlight benefits (not features), and include a compelling subject line. Technical notes: [paste notes]' },
];

const CATEGORIES = {
  writing: { emoji: '✏️', label: 'Writing' },
  analysis: { emoji: '🔬', label: 'Analysis' },
  meetings: { emoji: '🤝', label: 'Meetings' },
  decisions: { emoji: '🎯', label: 'Decisions' },
};

const ROLES = {
  cs: { emoji: '🎧', label: 'Customer Success' },
  sales: { emoji: '💰', label: 'Sales' },
  product: { emoji: '🛠️', label: 'Product' },
  marketing: { emoji: '📣', label: 'Marketing' },
  enablement: { emoji: '📚', label: 'Enablement' },
  hr: { emoji: '👥', label: 'HR / People' },
  leadership: { emoji: '👔', label: 'Leadership' },
};

const DIFFICULTY_STYLES = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700' },
};

export default function LibraryPage() {
  const [role, setRole] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

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

  return (
    <div className="min-h-screen">
      <PageHeader icon={Library} title="Use Case Library" subtitle={`${USE_CASES.length} concrete ways to use AI at work`} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center text-brand shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-ink mb-1">Browse what AI can actually do</h2>
              <p className="text-sm text-slate-600">
                Each use case has a copy-paste prompt you can use right now, or click <strong>Try it</strong> to walk through it as a lesson.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Try: 'email', 'meeting', 'analyze'..."
                  className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1.5 block">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white">
                <option value="all">All roles</option>
                {Object.entries(ROLES).map(([key, r]) => (
                  <option key={key} value={key}>{r.emoji} {r.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1.5 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white">
                <option value="all">All categories</option>
                {Object.entries(CATEGORIES).map(([key, c]) => (
                  <option key={key} value={key}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Showing <strong>{filtered.length}</strong> of {USE_CASES.length} use cases
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-slate-500">No use cases match your filters. Try clearing some.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(uc => (
              <UseCaseCard key={uc.id} uc={uc} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function UseCaseCard({ uc }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const difficulty = DIFFICULTY_STYLES[uc.difficulty] || DIFFICULTY_STYLES.medium;
  const cat = CATEGORIES[uc.category] || {};

  function copyPrompt(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(uc.starterPrompt || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-brand-200 hover:shadow-card-hover shadow-card transition-all overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl shrink-0">{uc.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-ink leading-tight mb-1">{uc.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${difficulty.color}`}>{difficulty.label}</span>
              {cat.emoji && <span className="text-xs text-slate-500">{cat.emoji} {cat.label}</span>}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-3">{uc.description}</p>
        {uc.timeSaved && (
          <p className="text-xs text-slate-500 mb-4 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Saves {uc.timeSaved}
          </p>
        )}
        <div className="flex gap-2">
          <Link
            href={`/lesson?topic=${encodeURIComponent(uc.title)}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
          >
            Try it <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition-all"
          >
            Prompt
          </button>
        </div>
        {showPrompt && (
          <div className="mt-3 bg-bg-warm border border-slate-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Copy-paste prompt</span>
              <button onClick={copyPrompt} className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700 leading-relaxed">{uc.starterPrompt}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
