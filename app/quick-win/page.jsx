'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { getProfileClient } from '@/lib/profile-client';
import {
  Zap, Copy, Check, ChevronRight, Sparkles,
  Clock, ArrowRight, RefreshCw, Loader2,
} from 'lucide-react';

export default function QuickWinPage() {
  const [department, setDepartment] = useState(null);
  const [quickWin, setQuickWin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const profile = getProfileClient();
      if (profile?.department) {
        setDepartment(profile.department);
      }
    } catch {
      // Profile not available — that's fine
    }
  }, []);

  async function fetchQuickWin() {
    setIsLoading(true);
    setError(null);
    setQuickWin(null);
    setCopied(false);

    try {
      const res = await fetch('/api/quick-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }

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
    <div className="min-h-screen bg-bg-warm">
      <PageHeader
        icon={Zap}
        title="Quick AI Win"
        subtitle="One thing you can do with AI right now"
      />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Initial State */}
        {!isLoading && !quickWin && !error && (
          <InitialCard
            department={department}
            onStart={fetchQuickWin}
          />
        )}

        {/* Loading State */}
        {isLoading && <LoadingCard />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorCard error={error} onRetry={fetchQuickWin} />
        )}

        {/* Result State */}
        {quickWin && !isLoading && (
          <ResultCard
            quickWin={quickWin}
            copied={copied}
            onCopy={handleCopy}
            onTryAnother={fetchQuickWin}
          />
        )}
      </main>
    </div>
  );
}

function InitialCard({ department, onStart }) {
  return (
    <div className="text-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-10 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-cta-50 ring-1 ring-cta-200 mx-auto mb-6 flex items-center justify-center">
          <Zap className="w-8 h-8 text-cta-700" strokeWidth={1.5} />
        </div>

        <h2 className="text-3xl font-bold text-ink mb-3 tracking-tight">
          Get a Quick AI Win
        </h2>
        <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
          I'll find <strong>ONE specific thing</strong> you can do with AI right now
          — personalized to your role. Takes under 5 minutes.
        </p>

        <button
          onClick={onStart}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-pill bg-cta text-ink font-bold text-lg hover:bg-cta-600 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Zap className="w-5 h-5" />
          Find my quick win
        </button>

        {department && (
          <p className="text-sm text-slate-500 mt-6">
            Based on your role in <span className="font-medium text-ink">{department}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="text-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-10 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-6 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-brand" strokeWidth={1.5} />
        </div>
        <Loader2 className="w-6 h-6 text-brand animate-spin mx-auto mb-4" />
        <p className="text-lg font-semibold text-ink mb-1">
          Finding something perfect for you...
        </p>
        <p className="text-sm text-slate-500">
          Personalizing to your role and goals
        </p>
      </div>
    </div>
  );
}

function ErrorCard({ error, onRetry }) {
  return (
    <div className="text-center">
      <div className="bg-white rounded-2xl border border-red-200 shadow-card p-10 max-w-xl mx-auto">
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

function ResultCard({ quickWin, copied, onCopy, onTryAnother }) {
  const { title, description, timeEstimate, steps, prompt, expectedResult } = quickWin;

  return (
    <div className="space-y-6">
      {/* Main Win Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        {/* Header accent */}
        <div className="h-2 bg-gradient-to-r from-cta via-cta-400 to-brand" />

        <div className="p-6 sm:p-8">
          {/* Title + Time Badge */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-ink tracking-tight leading-tight">
              {title}
            </h2>
            {timeEstimate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-brand-50 text-brand-700 text-sm font-medium shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {timeEstimate}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-slate-600 leading-relaxed mb-6">
              {description}
            </p>
          )}

          {/* Steps */}
          {steps && steps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
                Steps
              </h3>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-slate-700 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* The Prompt */}
          {prompt && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">
                  Your Prompt
                </h3>
                <button
                  onClick={onCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
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

          {/* Expected Result */}
          {expectedResult && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-brand-800 mb-1">What you'll get</p>
              <p className="text-sm text-slate-700 leading-relaxed">{expectedResult}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={onTryAnother}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill border border-slate-200 bg-white text-ink font-semibold text-sm hover:bg-slate-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Another
            </button>
            <Link
              href={`/lesson?topic=${encodeURIComponent(title)}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold text-sm hover:bg-cta-600 transition-all shadow-sm"
            >
              Start a Lesson on This
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
