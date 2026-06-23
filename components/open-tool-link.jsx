'use client';

import { ExternalLink } from 'lucide-react';
import { useActiveTool } from '@/components/active-tool-provider';
import { openLlmWindow } from '@/lib/open-llm-window';

// True when a step's prose actually tells the learner to go open their AI tool
// (e.g. "Open ChatGPT in a separate window…"). We only surface the open button
// at that moment — not at the very start before it's needed.
export function mentionsOpenTool(text, toolLabel) {
  if (typeof text !== 'string' || !text) return false;
  if (/\b(separate|new|another)\s+window\b/i.test(text)) return true;
  if (toolLabel && new RegExp(`open\\s+${toolLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)) return true;
  return false;
}

// The contextual "Open <tool> →" button, rendered right where the lesson says
// to open the tool. Uses whichever tool the learner confirmed at the start.
export default function OpenToolLink({ className = '', onOpened }) {
  const { primaryTool } = useActiveTool();
  if (!primaryTool?.url) return null;
  return (
    <button
      type="button"
      onClick={() => { openLlmWindow(primaryTool.url); onOpened?.(); }}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all ${className}`}
    >
      <ExternalLink className="w-4 h-4" /> Open {primaryTool.label}
    </button>
  );
}
