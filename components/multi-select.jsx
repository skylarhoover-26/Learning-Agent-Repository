'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Shared multi-select filter control. Lifted out of app/admin/feedback/page.jsx
// when /ai-news needed the same thing — one copy, so the two filter rows can't
// drift apart in behaviour or styling (the feed parser being duplicated in three
// routes is what let one Atom bug live in three places).
// A compact checkbox dropdown so a filter can hold several selections at once.
// Empty selection reads as "All"; picking values narrows to their union.
export default function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking anywhere outside the control.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const summary = selected.length === 0
    ? 'All'
    : selected.length === 1
    ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
    : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {label}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center justify-between gap-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-2 py-1 min-w-[6rem]"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 min-w-[11rem] max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-brand hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Clear selection
            </button>
          )}
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="accent-brand"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
