'use client';

import { ExternalLink } from 'lucide-react';
import { useActiveTool } from '@/components/active-tool-provider';
import { openLlmWindow } from '@/lib/open-llm-window';

// Sits at the top of a hands-on activity step. It confirms which AI tool the
// learner will use, lets them switch on the spot, and gives them a clear
// "Open <tool>" button — so it's obvious the real work happens in their tool's
// window, and the box below is just for checking their work here.
export default function ActivityToolBar() {
  const { tools, primaryTool, setPrimary } = useActiveTool();
  if (!primaryTool) return null;
  const others = (tools || []).filter((t) => t.id !== primaryTool.id);

  return (
    <div className="mb-3 rounded-xl border border-brand-200 dark:border-slate-600 bg-brand-50/60 dark:bg-slate-800 p-3">
      <p className="text-sm text-ink dark:text-slate-200">
        You&rsquo;ll do this in{' '}
        <span className="font-semibold">{primaryTool.emoji ? `${primaryTool.emoji} ` : ''}{primaryTool.label}</span>.
        Open it in a new window, do the hands-on part there, then come back here to check your work.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          onClick={() => primaryTool.url && openLlmWindow(primaryTool.url)}
          disabled={!primaryTool.url}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-all"
        >
          <ExternalLink className="w-4 h-4" /> Open {primaryTool.label}
        </button>
        {others.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Use a different tool:{' '}
            {others.map((t, i) => (
              <span key={t.id}>
                <button onClick={() => setPrimary(t)} className="font-medium text-brand hover:text-brand-600 underline">
                  {t.label}
                </button>
                {i < others.length - 1 ? ', ' : ''}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
