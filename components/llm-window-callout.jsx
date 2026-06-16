'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, X, PanelsTopLeft, Check } from 'lucide-react';
import { AI_TOOLS } from '@/lib/ai-tools';
import { useActiveTool } from './active-tool-provider';

// A dismissible header callout that reminds the learner to keep their AI tool
// open in a separate window so they can follow along beside the coach. It also
// lets them switch the tool for this session (and optionally save it as their
// default). `storageKey` keeps the dismissal scoped per surface for the session.
export default function LlmWindowCallout({ storageKey = 'default', className = '' }) {
  const { tool, isOverridden, hasPreference, setOverride, saveAsDefault } = useActiveTool();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid a flash before we read sessionStorage
  const [switching, setSwitching] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const dismissKey = `llmCallout_${storageKey}`;

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch {
      // sessionStorage unavailable — just hide for now
    }
  }

  function openTool() {
    if (tool.url) window.open(tool.url, '_blank', 'noopener,noreferrer');
  }

  function pick(choice) {
    setOverride(choice);
    setSwitching(false);
  }

  function pickCustom() {
    const label = customLabel.trim();
    if (!label) return;
    setOverride({ id: 'other', label });
    setCustomLabel('');
    setSwitching(false);
  }

  if (dismissed) return null;

  return (
    <div
      className={`rounded-2xl border border-brand-200 dark:border-slate-600 bg-brand-50/70 dark:bg-slate-800 p-3 sm:p-4 ${className}`}
      data-tour="llm-callout"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-brand dark:text-brand-200">
          <PanelsTopLeft className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink dark:text-slate-200">
            You&rsquo;ll do the hands-on AI work in your own tool. Keep{' '}
            <span className="font-semibold">
              {tool.emoji} {tool.label}
            </span>{' '}
            open in another window so you can follow along here.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {tool.url && (
              <button
                onClick={openTool}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-pill bg-brand text-white hover:bg-brand-700 transition-colors"
              >
                Open {tool.label}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSwitching((s) => !s)}
              className="px-3 py-1.5 text-sm font-medium rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-colors"
            >
              Using a different tool?
            </button>
            {isOverridden && (
              <button
                onClick={() => saveAsDefault(tool)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand dark:hover:text-brand-200 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Save {tool.label} as my default
              </button>
            )}
          </div>

          {switching && (
            <div className="mt-3 pt-3 border-t border-brand-200/70 dark:border-slate-600">
              <div className="flex flex-wrap gap-2">
                {AI_TOOLS.map((t) => {
                  const active = t.id === tool.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => pick(t.id)}
                      className={`px-3 py-1.5 text-sm rounded-pill border transition-colors ${
                        active
                          ? 'border-brand bg-brand text-white'
                          : 'border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200 hover:border-brand'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && pickCustom()}
                  placeholder="Something else (e.g. Perplexity)"
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-pill border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-brand"
                />
                <button
                  onClick={pickCustom}
                  disabled={!customLabel.trim()}
                  className="px-3 py-1.5 text-sm font-medium rounded-pill bg-ink text-white disabled:opacity-40 transition-colors"
                >
                  Use it
                </button>
              </div>
              {!hasPreference && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Tip: set a default tool in your profile so the coach always tailors lessons to it.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={dismiss}
          className="p-1 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
