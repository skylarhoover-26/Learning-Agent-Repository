'use client';

import { useState } from 'react';
import { FormattedContent } from '@/components/lesson-slide';
import { RotateCw, ChevronDown, Eye, MousePointerClick } from 'lucide-react';

// Renders the interactive teaching blocks that accompany a teach step's concept
// prose: flip flashcards, reveal-an-example expanders, compare tabs, and
// clickable diagram steps. Each block is self-contained and degrades to nothing
// if malformed (the server already sanitizes shape + sizes).
export default function LessonInteractive({ blocks }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <div className="mt-4 space-y-4">
      {blocks.map((b, i) => {
        if (b.type === 'flashcards') return <Flashcards key={i} title={b.title} cards={b.cards} />;
        if (b.type === 'reveal') return <RevealExample key={i} title={b.title} prompt={b.prompt} content={b.content} />;
        if (b.type === 'tabs') return <CompareTabs key={i} title={b.title} tabs={b.tabs} />;
        if (b.type === 'diagram') return <ClickableDiagram key={i} title={b.title} steps={b.steps} />;
        return null;
      })}
    </div>
  );
}

function BlockTitle({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
      <Icon className="w-3.5 h-3.5 text-brand" /> {children}
    </p>
  );
}

// --- Flip flashcards --------------------------------------------------------
function Flashcards({ title, cards }) {
  const [flipped, setFlipped] = useState({});
  return (
    <div>
      <BlockTitle icon={RotateCw}>{title || 'Tap to flip'}</BlockTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {cards.map((c, i) => {
          const isFlipped = !!flipped[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => setFlipped((p) => ({ ...p, [i]: !p[i] }))}
              aria-pressed={isFlipped}
              className={`group relative text-left rounded-xl border p-4 min-h-[104px] transition-all ${
                isFlipped
                  ? 'border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-slate-700/60'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-brand-300 hover:shadow-card'
              }`}
            >
              <span className="absolute top-2.5 right-2.5 text-slate-300 dark:text-slate-500 group-hover:text-brand transition-colors">
                <RotateCw className="w-3.5 h-3.5" />
              </span>
              {!isFlipped ? (
                <>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Term</span>
                  <span className="block mt-1 font-semibold text-ink dark:text-slate-200">{c.front}</span>
                  <span className="block mt-2 text-xs text-slate-400">Tap to reveal →</span>
                </>
              ) : (
                <>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-brand">Definition</span>
                  <span className="block mt-1 text-sm text-ink dark:text-slate-200">{c.back}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Reveal-an-example expander --------------------------------------------
function RevealExample({ title, prompt, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-bg-subtle dark:hover:bg-slate-800 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-200">
          <Eye className="w-4 h-4 text-brand" /> {open ? (title || 'Example') : prompt}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700">
          <FormattedContent text={content} />
        </div>
      )}
    </div>
  );
}

// --- Compare tabs -----------------------------------------------------------
function CompareTabs({ title, tabs }) {
  const [active, setActive] = useState(0);
  const current = tabs[active] || tabs[0];
  return (
    <div>
      <BlockTitle icon={MousePointerClick}>{title || 'Compare'}</BlockTitle>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tabs.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className={`px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
              i === active
                ? 'bg-brand text-white'
                : 'bg-bg-subtle dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-4">
        <FormattedContent text={current.content} />
      </div>
    </div>
  );
}

// --- Clickable diagram steps ------------------------------------------------
function ClickableDiagram({ title, steps }) {
  const [active, setActive] = useState(0);
  const current = steps[active] || steps[0];
  return (
    <div>
      <BlockTitle icon={MousePointerClick}>{title || 'Tap each step'}</BlockTitle>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                i === active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 hover:border-brand-300'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                i === active ? 'bg-white/25 text-white' : 'bg-brand-100 dark:bg-slate-700 text-brand'
              }`}>{i + 1}</span>
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
          </span>
        ))}
      </div>
      <div className="mt-2 rounded-xl border border-brand-200 dark:border-slate-600 bg-brand-50/60 dark:bg-slate-800 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-1">{current.label}</p>
        <p className="text-sm text-ink dark:text-slate-200">{current.detail}</p>
      </div>
    </div>
  );
}
