'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

// A lightweight type-to-filter dropdown (combobox) for long option lists like the
// org's hundreds of managers/teams, where a native <select> is unscannable. Plain
// strings in, selected string out ('' = the "all" reset). No dependencies.
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  allLabel = 'All',
  placeholder = 'Search…',
  widthClass = 'min-w-[180px]',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.toLowerCase().includes(s)) : options;
  }, [q, options]);

  function pick(v) {
    onChange(v);
    setOpen(false);
    setQ('');
  }

  return (
    <div className={`relative ${widthClass}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-left text-ink dark:text-slate-200"
      >
        <span className={`truncate ${value ? '' : 'text-slate-400'}`}>{value || allLabel}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
          <div className="sticky top-0 bg-white dark:bg-slate-900 p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => pick('')}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${!value ? 'text-brand font-medium' : 'text-ink dark:text-slate-200'}`}
          >
            {allLabel}
            {!value && <Check className="w-4 h-4 shrink-0" />}
          </button>
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => pick(o)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${value === o ? 'text-brand font-medium' : 'text-ink dark:text-slate-200'}`}
            >
              <span className="truncate">{o}</span>
              {value === o && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-400 text-center">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}
