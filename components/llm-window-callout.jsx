'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, X, PanelsTopLeft, Check, Star } from 'lucide-react';
import { toolKey } from '@/lib/ai-tools';
import { openLlmWindow } from '@/lib/open-llm-window';
import { useActiveTool } from './active-tool-provider';
import { useToolCatalog } from './tool-catalog-provider';

// A dismissible header callout that reminds the learner to keep their AI tool(s)
// open in a separate window so they can follow along beside the coach. It also
// lets them adjust their tools for this session — toggle which tools they use
// and pick a primary — and optionally save the set as their default.
export default function LlmWindowCallout({ storageKey = 'default', className = '', recommendation = null }) {
  const { tools, primaryTool, hasPreference, toggleTool, setPrimary } = useActiveTool();
  const { catalog } = useToolCatalog();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid a flash before we read sessionStorage
  const [switching, setSwitching] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [adding, setAdding] = useState(false);

  // The live "what it's good for" for a tool — catalog wins for built-ins, custom
  // tools carry their own.
  const strengthsFor = (tool) =>
    (tool && catalog.find((c) => c.id === tool.id)?.strengths) || tool?.strengths || '';

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

  const hasTools = tools.length > 0;

  // Best tool for THIS lesson (may differ from the learner's favorite). Match the
  // recommended label to the catalog for its emoji/url, and check if the learner
  // already has it.
  const recTool = recommendation?.tool
    ? catalog.find((c) => c.label.toLowerCase() === recommendation.tool.toLowerCase())
    : null;
  const recLabel = recTool?.label || recommendation?.tool || null;
  const recEmoji = recTool?.emoji || '🛠️';
  const recUrl = recTool?.url || null;
  const userHasRec = recTool ? tools.some((t) => toolKey(t) === toolKey(recTool)) : false;

  function openTool() {
    if (primaryTool?.url) openLlmWindow(primaryTool.url);
  }

  function openRecommended() {
    if (recUrl) openLlmWindow(recUrl);
  }

  function addRecommended() {
    if (recTool) toggleTool(recTool.id === 'other' ? recTool : recTool.id);
  }

  async function addCustom() {
    const label = customLabel.trim();
    if (!label || adding) return;
    setCustomLabel('');
    setAdding(true);
    let extra = {};
    try {
      const res = await fetch('/api/tools/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label }),
      });
      if (res.ok) extra = await res.json();
    } catch {
      // fall back to just the name
    }
    toggleTool({ id: 'other', label, strengths: extra.strengths || null, url: extra.url || null });
    setAdding(false);
  }

  if (dismissed) return null;

  const selectedKeys = new Set(tools.map(toolKey));
  const extras = tools.length - 1;
  const primaryKey = primaryTool ? toolKey(primaryTool) : null;

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
          {recLabel ? (
            // Lesson-specific recommendation: best tool for THIS lesson + why.
            <>
              <p className="text-sm text-ink dark:text-slate-200">
                For this lesson, <span className="font-semibold">{recEmoji} {recLabel}</span> works best
                {userHasRec ? '' : <span className="text-slate-500 dark:text-slate-400"> — you don&rsquo;t have it set up yet</span>}.
                {' '}Open it in another window so you can follow along here.
              </p>
              {recommendation.why && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Why: {recommendation.why}</p>
              )}
              {!userHasRec && hasTools && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No access to {recLabel}? You can still do this lesson in {primaryTool.emoji} {primaryTool.label} — add {recLabel} if you&rsquo;d like to try it.
                </p>
              )}
            </>
          ) : hasTools ? (
            <p className="text-sm text-ink dark:text-slate-200">
              You&rsquo;ll do the hands-on AI work in your own tool. Keep{' '}
              <span className="font-semibold">
                {primaryTool.emoji} {primaryTool.label}
              </span>{' '}
              open in another window so you can follow along here
              {extras > 0 && <span className="text-slate-500 dark:text-slate-400"> (+{extras} more {extras === 1 ? 'tool' : 'tools'})</span>}.
            </p>
          ) : (
            <p className="text-sm text-ink dark:text-slate-200">
              You&rsquo;ll do the hands-on AI work in your own AI tool, open beside the coach. Pick the tool(s) you use so we can tailor lessons and give prompts you can paste in.
            </p>
          )}

          {!recLabel && hasTools && strengthsFor(primaryTool) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Best for {strengthsFor(primaryTool)}.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {/* Recommended tool the learner already has → open it. */}
            {recLabel && userHasRec && recUrl && (
              <button
                onClick={openRecommended}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-pill bg-brand text-white hover:bg-brand-700 transition-colors"
              >
                Open {recLabel}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Recommended tool the learner lacks → add it, and offer their own. */}
            {recLabel && !userHasRec && (
              <>
                {recTool && (
                  <button
                    onClick={addRecommended}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-pill bg-brand text-white hover:bg-brand-700 transition-colors"
                  >
                    Add {recLabel}
                  </button>
                )}
                {hasTools && primaryTool.url && (
                  <button
                    onClick={openTool}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-colors"
                  >
                    Open {primaryTool.label} instead
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {/* No recommendation → original behavior. */}
            {!recLabel && hasTools && primaryTool.url && (
              <button
                onClick={openTool}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-pill bg-brand text-white hover:bg-brand-700 transition-colors"
              >
                Open {primaryTool.label}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSwitching((s) => !s)}
              className="px-3 py-1.5 text-sm font-medium rounded-pill border border-brand-200 dark:border-slate-600 text-brand dark:text-brand-200 hover:bg-brand-100/60 dark:hover:bg-slate-700 transition-colors"
            >
              {!hasTools ? 'Choose your tools' : tools.length > 1 ? 'Manage your tools' : 'Using a different tool?'}
            </button>
          </div>

          {switching && (
            <div className="mt-3 pt-3 border-t border-brand-200/70 dark:border-slate-600 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pick every tool you use. Tap the star to set the one we&rsquo;ll open by default. Changes save automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                {catalog.map((t) => {
                  const selected = selectedKeys.has(toolKey(t));
                  const isPrimary = toolKey(t) === primaryKey;
                  return (
                    <div
                      key={t.id}
                      className={`inline-flex items-center rounded-pill border transition-colors ${
                        selected
                          ? 'border-brand bg-brand text-white'
                          : 'border-slate-300 dark:border-slate-600 text-ink dark:text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleTool(t.id)}
                        className="pl-3 pr-2 py-1.5 text-sm hover:opacity-90"
                      >
                        {selected && <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                        {t.emoji} {t.label}
                      </button>
                      {selected && (
                        <button
                          onClick={() => setPrimary(t.id)}
                          title={isPrimary ? 'Primary tool' : 'Set as primary'}
                          className="pr-2.5 pl-1 py-1.5"
                          aria-label={isPrimary ? 'Primary tool' : 'Set as primary'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-cta text-cta' : 'text-white/70'}`} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="Add another (e.g. Perplexity)"
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-pill border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-brand"
                />
                <button
                  onClick={addCustom}
                  disabled={!customLabel.trim() || adding}
                  className="px-3 py-1.5 text-sm font-medium rounded-pill bg-ink text-white disabled:opacity-40 transition-colors"
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
              {!hasPreference && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tip: set your tools in <span className="font-medium">My AI Tools</span> so the coach always tailors lessons to them.
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
