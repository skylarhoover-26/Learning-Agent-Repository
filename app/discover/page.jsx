'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import { useActiveTool } from '@/components/active-tool-provider';
import { sortByDifficulty } from '@/lib/difficulty';
import {
  Search, Sparkles, ChevronRight, Clock, Lightbulb,
  RefreshCw, Loader2, Library,
} from 'lucide-react';

const SAMPLE_PROMPTS = [
  "I'm an Operations Manager. My typical day: 3-4 meetings, reviewing project status updates, planning next quarter, and writing reports.",
  "I'm in Sales. I spend mornings on prospect research, then write outreach emails, take customer calls, and update CRM in the afternoon.",
  "Senior Director of Enablement. I lead a team that builds training. I review their content, run program launches, write executive updates, and meet with stakeholders.",
];

// Colored difficulty pills — same green/amber/red scale used across the app
// (library, games, practice) so difficulty reads the same everywhere.
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', advanced: 'Advanced' };
const DIFFICULTY_STYLES = {
  easy: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  advanced: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};
const difficultyPill = 'inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border';

function DiscoverContent() {
  const searchParams = useSearchParams();
  const { tools } = useActiveTool();
  const [workDescription, setWorkDescription] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [cameFromTasks, setCameFromTasks] = useState(false);
  const prefilledRef = useRef(false);
  // Holds a background-generated result during the guided tour so the results
  // step is already populated when the tour "clicks" Find AI (no spinner wait).
  const prefetchRef = useRef({ text: null, promise: null });

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

  async function fetchOpportunities(text) {
    const res = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workDescription: text, tools }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');
    return data;
  }

  // During the tour, pre-generate results in the background as the work text is
  // typed (debounced), so the results are ready when Find AI is clicked.
  useEffect(() => {
    const inTour = typeof window !== 'undefined' && window.sessionStorage.getItem('tourActive') === '1';
    if (!inTour) return;
    const text = workDescription.trim();
    if (text.length < 10 || prefetchRef.current.text === text) return;
    const t = setTimeout(() => {
      prefetchRef.current = { text, promise: fetchOpportunities(text).catch(() => null) };
    }, 500);
    return () => clearTimeout(t);
  }, [workDescription]);

  async function findOpportunities(desc) {
    const text = (typeof desc === 'string' ? desc : workDescription).trim();
    if (!text) return;
    setIsSearching(true);
    try {
      // Reuse the tour's background prefetch if it matches; otherwise fetch live.
      let data = null;
      if (prefetchRef.current.text === text && prefetchRef.current.promise) {
        data = await prefetchRef.current.promise;
      }
      if (!data) data = await fetchOpportunities(text);
      setOpportunities(sortByDifficulty(data.opportunities || []));
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
      <PageHeader icon={Search} title="Discovery" subtitle="Find AI opportunities for your actual work" />

      <main data-tour="discover-main" className="max-w-5xl mx-auto px-6 pt-6 pb-12 sm:pb-16">
        <CinematicPageHero
          eyebrow="Discover"
          title="Find AI for your actual work"
          subtitle="Describe your typical day, a task, or something on your plate right now — I'll surface specific AI opportunities you can try today, tied to your real work."
          icon={Search}
          gradient
        />
        {!hasSearched && (
          <div>
            <div data-tour="page-discover" className="cine-glass rounded-2xl p-6 mb-6">
              <textarea
                data-tour="discover-input"
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
                  data-tour="discover-send"
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
                    <Link href="/my-tasks?from=discover" className="text-brand font-medium hover:underline">Update your tasks</Link> to keep future trainings tailored.
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
                    className="cine-glass cine-tilt w-full text-left p-4 rounded-xl transition-all text-sm text-slate-700 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasSearched && (
          <div data-tour="discover-results">
            <div className="cine-glass rounded-2xl p-4 mb-6 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--accent)' }}>Your work</p>
                <p className="text-sm line-clamp-2" style={{ color: 'var(--ink-dim)' }}>{workDescription}</p>
              </div>
              <button
                onClick={reset}
                className="text-sm inline-flex items-center gap-1 shrink-0 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try another
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Found {opportunities.length} ways AI can help your work
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Pick one to try — each opens a hands-on lesson tied to YOUR actual work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp, i) => (
                <div key={i} className="cine-glass rounded-2xl transition-all p-5">
                  <h3 className="font-semibold text-ink dark:text-slate-200 leading-tight mb-2">{opp.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={`${difficultyPill} ${DIFFICULTY_STYLES[opp.difficulty] || DIFFICULTY_STYLES.medium}`}>{DIFFICULTY_LABELS[opp.difficulty] || 'Medium'}</span>
                    {opp.timeSaved && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Saves {opp.timeSaved}
                      </span>
                    )}
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
              ))}
            </div>
          </div>
        )}

        {/* Pointer to the full Use Case Library, now its own screen. */}
        <Link
          href="/library"
          className="cine-glass cine-tilt mt-10 flex items-center gap-3 rounded-2xl p-5 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center text-brand shrink-0">
            <Library className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink dark:text-slate-200">Browse the use case library</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">30+ ready-to-use AI use cases with copy-paste prompts.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </Link>
      </main>
    </div>
  );
}

export default function DiscoverPage() {
  return <CinematicFrame><DiscoverPageInner /></CinematicFrame>;
}

function DiscoverPageInner() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 pt-6 pb-10 text-center text-slate-500 dark:text-slate-400">Loading...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
