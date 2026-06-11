'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  Search, Sparkles, ChevronRight, Clock, Lightbulb,
  RefreshCw, Loader2,
} from 'lucide-react';

const SAMPLE_PROMPTS = [
  "I'm an Operations Manager. My typical day: 3-4 meetings, reviewing project status updates, planning next quarter, and writing reports.",
  "I'm in Sales. I spend mornings on prospect research, then write outreach emails, take customer calls, and update CRM in the afternoon.",
  "Senior Director of Enablement. I lead a team that builds training. I review their content, run program launches, write executive updates, and meet with stakeholders.",
];

const DIFFICULTY_STYLES = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700' },
};

const CATEGORY_COLORS = {
  writing: 'from-blue-500 to-cyan-500',
  analysis: 'from-purple-500 to-indigo-500',
  meetings: 'from-orange-500 to-red-500',
  decisions: 'from-pink-500 to-rose-500',
};

function DiscoverContent() {
  const searchParams = useSearchParams();
  const [workDescription, setWorkDescription] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [cameFromTasks, setCameFromTasks] = useState(false);
  const prefilledRef = useRef(false);

  // Prefill (but DON'T auto-run) when arriving from the "Find AI for your work"
  // hero, so the user can review/update their saved tasks before searching.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !prefilledRef.current) {
      prefilledRef.current = true;
      setWorkDescription(q);
      setCameFromTasks(true);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function findOpportunities(desc) {
    const text = (typeof desc === 'string' ? desc : workDescription).trim();
    if (!text) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDescription: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setOpportunities(data.opportunities || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Discover error:', error);
      setOpportunities([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }

  function reset() {
    setHasSearched(false);
    setOpportunities([]);
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Search} title="Find AI for Your Work" subtitle="Discover specific ways AI can help" />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!hasSearched && (
          <div>
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-brand" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold text-ink dark:text-slate-200 mb-3 tracking-tight">
                Tell me about your work
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Describe your typical day, a specific task, or something on your plate right now.
                I'll find specific AI opportunities you can try today.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <textarea
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="e.g., I'm a Director of Operations. My typical day is split between status meetings, reviewing team work, planning, and writing executive summaries..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {workDescription.length === 0 && 'Even a few sentences works.'}
                  {workDescription.length > 0 && workDescription.length < 30 && 'A bit more detail will help me find better opportunities...'}
                  {workDescription.length >= 30 && 'Looks good — ready to find AI opportunities'}
                </p>
                <button
                  onClick={findOpportunities}
                  disabled={!workDescription.trim() || workDescription.length < 10 || isSearching}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Find AI for me
                    </>
                  )}
                </button>
              </div>
              {cameFromTasks && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 dark:bg-slate-700/50 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Lightbulb className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>
                    We pulled this from your saved tasks — update it if anything&apos;s changed, then hit <strong>Find AI for me</strong>.{' '}
                    <Link href="/my-tasks" className="text-brand font-medium hover:underline">Update your tasks</Link> to keep future trainings tailored.
                  </span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-3">
                Or start from one of these examples
              </h3>
              <div className="space-y-2">
                {SAMPLE_PROMPTS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setWorkDescription(s)}
                    className="w-full text-left p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-slate-700 transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasSearched && (
          <div>
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-brand-700 font-semibold mb-1">Your work</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{workDescription}</p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try another
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-bold text-ink dark:text-slate-200">
                Found {opportunities.length} ways AI can help your work
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Pick one to try — each opens a hands-on lesson tied to YOUR actual work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp, i) => {
                const difficulty = DIFFICULTY_STYLES[opp.difficulty] || DIFFICULTY_STYLES.medium;
                const gradient = CATEGORY_COLORS[opp.category] || 'from-slate-400 to-slate-500';
                return (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 hover:shadow-md transition-all overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-3xl shrink-0">{opp.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-ink dark:text-slate-200 leading-tight mb-1">{opp.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${difficulty.color}`}>
                              {difficulty.label}
                            </span>
                            {opp.timeSaved && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Saves {opp.timeSaved}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{opp.description}</p>
                      {opp.whyItHelps && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 italic">
                          {opp.whyItHelps}
                        </div>
                      )}
                      <Link
                        href={`/lesson?topic=${encodeURIComponent(opp.title)}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
                      >
                        Try it
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
