'use client';

import { Clock } from 'lucide-react';

// The greyed "Coming soon" teaser used wherever a home surface points at a
// feature an admin has set to Coming soon in Menu Visibility.
//
// The three states are deliberately different, matching what the admin page
// promises for each:
//   visible      — the real thing
//   coming_soon  — THIS: shown, greyed, not clickable. A teaser is the whole
//                  point of the state, so the space isn't left blank.
//   hidden       — nothing at all. "Removed completely; no menu entry and no
//                  teaser" — a placeholder here would contradict that.
//
// Shared so every gated surface greys out the same way instead of each one
// inventing its own treatment.
export default function ComingSoonBlock({ title, desc, icon: Icon = Clock, className = '', compact = false, dataTour }) {
  return (
    <div
      className={`cine-glass rounded-2xl ${compact ? 'p-5' : 'p-6'} ${className}`}
      // Carries the same data-tour anchor as the surface it replaces, so the
      // guided tour still has something real to spotlight on a "coming soon"
      // feature rather than being dropped.
      data-tour={dataTour}
      // Not a link and not focusable: the page behind it is gated, so offering a
      // click would just bounce the learner off a locked route.
      style={{ opacity: 0.55 }}
      aria-disabled="true"
    >
      <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center gap-4'}`}>
        <span
          className={`${compact ? 'w-11 h-11' : 'w-12 h-12'} rounded-xl grid place-items-center shrink-0`}
          style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--ink-dim)' }} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold">{title}</p>
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: 'var(--glass)', color: 'var(--ink-dim)', border: '1px solid var(--line)' }}
            >
              Coming soon
            </span>
          </div>
          {desc && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{desc}</p>
          )}
        </div>
      </div>
    </div>
  );
}
