'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { FormattedContent } from '@/components/lesson-slide';
import { FlaskConical, Loader2, Zap, BookOpen, Bookmark } from 'lucide-react';

const FORMATS = [
  { key: 'quick_tip', label: 'Quick Tip', time: '60s', icon: Zap },
  { key: 'standard', label: 'Quick Lesson', time: '3–5 min', icon: BookOpen },
  { key: 'deep_dive', label: 'Deep Dive', time: '15–20 min', icon: Bookmark },
];

const PHASE_LABELS = {
  intro: 'Introduction', concepts: 'Key Concepts', setup: 'Setup', steps: 'Walkthrough',
  verify: 'Verify', practice: 'Practice', evaluate: 'Evaluate', apply: 'Apply', complete: 'Complete',
};

export default function LessonPreviewPage() {
  const router = useRouter();
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [topic, setTopic] = useState('');
  const [tier, setTier] = useState('beginner');
  const [format, setFormat] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false))
      .finally(() => setAdminChecked(true));
  }, []);

  async function generate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/lesson-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), format, tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!isAdmin) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader
        icon={FlaskConical}
        title="Lesson Content Preview"
        subtitle="Generate and review what a lesson produces, by topic and depth"
      />

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink dark:text-slate-200 mb-1">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
              placeholder="e.g. What are MCP servers?"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Depth</label>
              <div className="flex gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      format === f.key
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white dark:bg-slate-900 text-ink dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-brand-300'
                    }`}
                  >
                    <f.icon className="w-4 h-4" />
                    {f.label} <span className="opacity-70">· {f.time}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Learner tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 text-sm"
              >
                <option value="beginner">Beginner (no code)</option>
                <option value="developer">Developer</option>
              </select>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating full lesson…</> : 'Generate preview'}
          </button>
          {loading && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This runs the whole lesson end-to-end ({FORMATS.find(f => f.key === format)?.label}), so it can take 10–40 seconds.
            </p>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-ink dark:text-slate-200">{result.slideCount}</span> slides ·{' '}
              {FORMATS.find(f => f.key === result.format)?.label} · {result.tier}
            </p>
            {result.slides.map((slide, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-slate-700 text-brand dark:text-brand-200">
                    {i + 1}. {PHASE_LABELS[slide.phase] || slide.phase}
                  </span>
                  {slide.slideTitle && (
                    <h3 className="text-sm font-bold text-ink dark:text-slate-200">{slide.slideTitle}</h3>
                  )}
                </div>
                <div className="prose-sm text-ink dark:text-slate-200">
                  <FormattedContent text={slide.message} />
                </div>
                {slide.keyPoints?.length > 0 && (
                  <ul className="mt-3 list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                    {slide.keyPoints.map((kp, j) => <li key={j}>{kp}</li>)}
                  </ul>
                )}
                {slide.recap && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm">
                    <p className="font-semibold text-ink dark:text-slate-200 mb-1">Recap: {slide.recap.topic}</p>
                    {slide.recap.keyPoints?.length > 0 && (
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                        {slide.recap.keyPoints.map((kp, j) => <li key={j}>{kp}</li>)}
                      </ul>
                    )}
                    {slide.recap.applyTip && (
                      <p className="text-slate-600 dark:text-slate-400 mt-1"><span className="font-medium">Apply:</span> {slide.recap.applyTip}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
