'use client';

import { Check, PenLine } from 'lucide-react';

// The collapsed "you already chose this" row that sits above the current step in a
// wizard: a tick, the label, the value, and Edit to jump back to it.
//
// Extracted from app/lesson/page.jsx when the Games hub became a wizard too. It is
// the thing that makes a multi-screen flow legible — without it, moving forward hides
// what you picked, and people lose track of what they're building.
export default function WizardLadderRow({ label, value, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl cine-glass text-left opacity-75 hover:opacity-100 transition-all"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white shrink-0">
        <Check className="w-3.5 h-3.5" />
      </span>
      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold w-14 shrink-0">{label}</span>
      <span className="flex-1 font-medium text-slate-600 dark:text-slate-300 truncate">{value}</span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-brand transition-colors shrink-0">
        <PenLine className="w-3.5 h-3.5" /> Edit
      </span>
    </button>
  );
}
