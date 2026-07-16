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
// to open the tool. Opens the tool THIS lesson is built around when one is passed
// in (`tool`); otherwise falls back to the learner's primary tool.
export default function OpenToolLink({ tool, className = '', onOpened }) {
  const { primaryTool } = useActiveTool();
  const openTool = tool || primaryTool;
  if (!openTool?.url) return null;
  return (
    <button
      type="button"
      onClick={() => { openLlmWindow(openTool.url); onOpened?.(); }}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all ${className}`}
    >
      <ExternalLink className="w-4 h-4" /> Open {openTool.label}
    </button>
  );
}
