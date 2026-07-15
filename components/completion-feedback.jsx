'use client';

import { useState } from 'react';
import {
  Check, ThumbsUp, Loader2, LifeBuoy, RotateCcw, Copy, ExternalLink,
} from 'lucide-react';
import { trackEvent } from '@/lib/track';

// Post-completion checkpoint. Shown at the very END of a lesson (after the recap)
// — asks whether the learner got what they came for. "Yes" just thanks them;
// "Not quite" mirrors the Project Quest checkpoint: it surfaces tailored
// troubleshooting resources and offers a more-focused lesson. Feedback is logged
// via trackEvent; it never gates XP or completion.
//
// Props:
//   kind          — what was completed ('lesson' | 'game' | …), for tagging
//   topic         — the specific topic/title completed
//   format        — lesson format, forwarded to /api/lesson/next-steps
//   objectives    — lesson objectives/key points, forwarded for sharper resources
//   onFocusedLesson(note) — optional; when provided, shows "Take a more focused
//                           lesson" and hands back what the learner is still after
export default function CompletionFeedback({
  kind = 'lesson', topic = '', format = 'standard', objectives = [], onFocusedLesson,
}) {
  // 'ask' → yes/no · 'note' → the "not quite" unstuck panel · 'done' → thanks
  const [stage, setStage] = useState('ask');
  const [stillUnclear, setStillUnclear] = useState('');
  const [nextSteps, setNextSteps] = useState(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextCopied, setNextCopied] = useState(false);

  function record(helpful, extra = {}) {
    try { trackEvent('completion_feedback', { kind, topic, helpful, ...extra }); } catch { /* non-blocking */ }
  }

  function onYes() {
    record(true);
    setStage('done');
  }

  function onNo() {
    record(false);
    setStage('note');
  }

  async function getNextSteps() {
    if (nextLoading) return;
    record(false, { note: stillUnclear.trim(), action: 'resources' });
    setNextLoading(true);
    try {
      const res = await fetch('/api/lesson/next-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, format, objectives, stillUnclear }),
      });
      const d = res.ok ? await res.json() : null;
      if (d) setNextSteps(d);
    } catch {
      // best-effort; leave nextSteps null and let them try again
    } finally {
      setNextLoading(false);
    }
  }

  function takeFocusedLesson() {
    record(false, { note: stillUnclear.trim(), action: 'focused_lesson' });
    onFocusedLesson?.(stillUnclear.trim());
  }

  async function copyNextPrompt() {
    if (!nextSteps?.prompt) return;
    try {
      await navigator.clipboard.writeText(nextSteps.prompt);
      setNextCopied(true);
      setTimeout(() => setNextCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card p-5">
      {stage === 'ask' && (
        <div className="text-center">
          <p className="text-sm font-bold text-ink dark:text-slate-200">
            Did you get what you were hoping to learn?
          </p>
          {topic && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{topic}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              onClick={onYes}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-all"
            >
              <ThumbsUp className="w-4 h-4" /> Yes, I&rsquo;m all set
            </button>
            <button
              onClick={onNo}
              className="px-5 py-2.5 rounded-pill border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Not quite
            </button>
          </div>
        </div>
      )}

      {stage === 'note' && (
        <div>
          <p className="text-sm font-semibold text-ink dark:text-slate-200 mb-1">No problem — let&rsquo;s get you unstuck.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">What were you still hoping to figure out? (optional — makes the help more specific)</p>
          <input
            value={stillUnclear}
            onChange={(e) => setStillUnclear(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') getNextSteps(); }}
            placeholder="e.g., I still don't know how to connect this to my real workflow"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand mb-3"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={getNextSteps}
              disabled={nextLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all"
            >
              {nextLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding resources…</> : <><LifeBuoy className="w-3.5 h-3.5" /> Get troubleshooting resources</>}
            </button>
            {onFocusedLesson && (
              <button
                onClick={takeFocusedLesson}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 text-sm font-medium hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Take a more focused lesson
              </button>
            )}
          </div>

          {nextSteps && (
            <div className="mt-4 rounded-xl bg-bg-subtle dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
              {nextSteps.intro && <p className="text-sm text-ink dark:text-slate-200 mb-2">{nextSteps.intro}</p>}
              <ul className="space-y-2">
                {nextSteps.steps?.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-semibold text-ink dark:text-slate-200">{s.title}</span>
                    {s.detail ? <span className="text-slate-600 dark:text-slate-400"> — {s.detail}</span> : null}
                    {s.url ? <> <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-0.5">open <ExternalLink className="w-3 h-3" /></a></> : null}
                  </li>
                ))}
              </ul>
              {nextSteps.prompt && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paste this into your AI tool</p>
                    <button onClick={copyNextPrompt} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-600">
                      {nextCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <div className="rounded-lg bg-ink/90 dark:bg-slate-950 text-slate-100 text-xs p-3 whitespace-pre-wrap">{nextSteps.prompt}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-right">
            <button
              onClick={() => setStage('done')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-pill text-slate-500 dark:text-slate-400 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4" /> Thanks for the feedback!
        </p>
      )}
    </div>
  );
}
