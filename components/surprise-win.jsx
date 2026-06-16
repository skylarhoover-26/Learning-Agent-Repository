'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/profile-provider';
import { useActiveTool } from '@/components/active-tool-provider';
import LlmWindowCallout from '@/components/llm-window-callout';
import BookLoader from '@/components/book-loader';
import { Zap, Copy, Check, Clock, ArrowRight, RefreshCw } from 'lucide-react';

// The "Surprise me" quick win, relocated from the retired /quick-win page. It
// auto-picks a task for you on mount and returns a ready-to-use AI prompt with
// steps. Rendered inline on the lesson screen.
export default function SurpriseWin({ onStartLesson }) {
  const { profile } = useProfile();
  const { tools } = useActiveTool();
  const [quickWin, setQuickWin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchQuickWin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setQuickWin(null);
    setCopied(false);
    try {
      const res = await fetch('/api/quick-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get a quick win');
      setQuickWin(data.quickWin);
    } catch (err) {
      console.error('Quick win error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tools]);

  useEffect(() => {
    fetchQuickWin();
  }, [fetchQuickWin]);

  async function handleCopy() {
    if (!quickWin?.prompt) return;
    try {
      await navigator.clipboard.writeText(quickWin.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      <LlmWindowCallout storageKey="surprise-win" />

      {isLoading && (
        <div className="text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-10 max-w-xl mx-auto">
            <BookLoader message="Finding something perfect for you..." size="lg" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 shadow-card p-10 max-w-xl mx-auto">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={fetchQuickWin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      )}

      {quickWin && !isLoading && (
        <ResultCard
          quickWin={quickWin}
          copied={copied}
          onCopy={handleCopy}
          onTryAnother={fetchQuickWin}
          onStartLesson={onStartLesson}
          department={profile?.department}
        />
      )}
    </div>
  );
}

function ResultCard({ quickWin, copied, onCopy, onTryAnother, onStartLesson, department }) {
  const { title, description, timeEstimate, steps, prompt, expectedResult } = quickWin;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-cta via-cta-400 to-brand" />

      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 tracking-tight leading-tight">
            {title}
          </h2>
          {timeEstimate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {timeEstimate}
            </span>
          )}
        </div>

        {description && (
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{description}</p>
        )}

        {steps && steps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-ink dark:text-slate-200 uppercase tracking-wide mb-3">
              Steps
            </h3>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {prompt && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink dark:text-slate-200 uppercase tracking-wide">
                Your Prompt
              </h3>
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {prompt}
            </div>
          </div>
        )}

        {expectedResult && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-brand-800 mb-1">What you&apos;ll get</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{expectedResult}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={onTryAnother}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Surprise me again
          </button>
          {onStartLesson ? (
            <button
              onClick={() => onStartLesson(title)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
            >
              Start a Lesson on This
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={`/lesson?topic=${encodeURIComponent(title)}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
            >
              Start a Lesson on This
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {department && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
            Based on your role in <span className="font-medium text-ink dark:text-slate-200">{department}</span>
          </p>
        )}
      </div>
    </div>
  );
}
