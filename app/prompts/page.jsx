'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import { FileText, Search, X, Copy, Check, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { PROMPTS, CATEGORIES, DEPARTMENTS } from '@/lib/prompts-data';
import { useProfile } from '@/components/profile-provider';
import { contentDayKey, REFRESH_LABEL } from '@/lib/content-day';

export default function PromptsPage() {
  return <CinematicFrame><PromptsPageInner /></CinematicFrame>;
}

function PromptsPageInner() {
  const { profile } = useProfile();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [department, setDepartment] = useState('all');

  // Daily, role-personalized prompts — cached per content-day (8 AM PT).
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const sig = `${profile.department || ''}|${profile.tier || ''}|${(profile.top_tasks || []).join(',')}`;
    const today = contentDayKey();
    const cacheKey = 'daily_prompts_v1';
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.sig === sig && cached.date === today && Array.isArray(cached.prompts) && cached.prompts.length) {
        setDaily(cached.prompts);
        return;
      }
    } catch {
      // ignore cache read errors
    }
    fetch('/api/prompts/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((d) => {
        if (Array.isArray(d.prompts) && d.prompts.length) {
          setDaily(d.prompts);
          try { localStorage.setItem(cacheKey, JSON.stringify({ sig, date: today, prompts: d.prompts })); } catch { /* ignore */ }
        } else {
          setDaily([]);
        }
      })
      .catch(() => setDaily([]));
  }, [profile]);

  const filtered = useMemo(() => {
    return PROMPTS.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (department !== 'all' && p.department !== department) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, category, department]);

  const hasActiveFilters = search || category !== 'all' || department !== 'all';

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setDepartment('all');
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={FileText}
        title="Shared Prompts Library"
        subtitle={`${PROMPTS.length} ready-to-use prompts across departments`}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <CinematicPageHero
          eyebrow="Prompts"
          title="Shared Prompts Library"
          subtitle={`${PROMPTS.length} curated, ready-to-use prompts across every department — copy one, or try it as a guided lesson.`}
          icon={FileText}
          gradient
        />
        <div className="cine-glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 8px 20px -8px var(--accent)' }}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-ink dark:text-slate-200 mb-1">Community prompts, ready to copy</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Browse curated prompts by department and category. Click <strong>Show prompt</strong> to view the full text, then copy it or try it as a lesson.
              </p>
            </div>
          </div>
        </div>

        {/* Today's prompts — personalized to the learner's role, fresh daily */}
        {(daily === null || (Array.isArray(daily) && daily.length > 0)) && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-cta-600" />
              <h2 className="font-bold text-ink dark:text-slate-200">Today&apos;s prompts for your role</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">· {REFRESH_LABEL}</span>
            </div>
            {daily === null ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Personalizing today&apos;s prompts…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {daily.map((p, i) => (
                  <DailyPromptCard key={`daily-${i}`} prompt={p} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="cine-glass rounded-2xl p-5 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Try: 'email', 'feedback', 'training'..."
                  className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white dark:bg-slate-800"
              >
                <option value="all">All categories</option>
                {Object.entries(CATEGORIES).map(([key, c]) => (
                  <option key={key} value={key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm bg-white dark:bg-slate-800"
              >
                <option value="all">All departments</option>
                {Object.entries(DEPARTMENTS).map(([key, d]) => (
                  <option key={key} value={key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong>{filtered.length}</strong> of {PROMPTS.length} prompts
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-brand hover:text-brand-600 font-medium inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="cine-glass rounded-2xl border-dashed p-10 text-center">
            <p className="text-slate-500 dark:text-slate-400">No prompts match your filters. Try clearing some.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// A self-contained card for the AI-generated daily prompts (no department/tags).
function DailyPromptCard({ prompt }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES[prompt.category] || { label: prompt.category || 'Prompt', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };

  function handleCopy() {
    try {
      navigator.clipboard.writeText(prompt.prompt || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="cine-glass rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
        </div>
        <h3 className="font-bold text-ink dark:text-slate-200 leading-tight mb-1">{prompt.title}</h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{prompt.description}</p>
        {expanded && (
          <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 mb-3 font-sans">{prompt.prompt}</pre>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-600">
            {expanded ? <><ChevronUp className="w-4 h-4" /> Hide prompt</> : <><ChevronDown className="w-4 h-4" /> Show prompt</>}
          </button>
          <button onClick={handleCopy}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand">
            {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptCard({ prompt }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cat = CATEGORIES[prompt.category] || { label: prompt.category, color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' };
  const dept = DEPARTMENTS[prompt.department] || { label: prompt.department };

  function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(prompt.prompt || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="cine-glass rounded-2xl transition-all overflow-hidden">
      <div className="p-5">
        <h3 className="font-bold text-ink dark:text-slate-200 leading-tight mb-1.5">{prompt.title}</h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{prompt.description}</p>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
            {dept.label}
          </span>
        </div>

        <div className="flex gap-2 mb-1">
          <Link
            href={`/lesson?topic=${encodeURIComponent(prompt.title)}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
          >
            Try in Lesson
          </Link>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-all inline-flex items-center gap-1"
          >
            {expanded ? (
              <>
                Hide <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Show prompt <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 bg-bg-warm dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                Prompt text
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 inline-flex items-center gap-1 shrink-0"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
              {prompt.prompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
