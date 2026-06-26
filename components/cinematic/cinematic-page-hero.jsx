'use client';

// Shared page hero for framed (CinematicFrame) tabs. The page's own PageHeader
// is hidden inside the frame, so this gives every tab the same cinematic feel as
// Home: a small uppercase eyebrow, a big tight title (optionally the animated
// gradient), and a calm subtitle — with generous whitespace around it.
//
// Usage: place as the first child of the page's <main>, then give the content
// below it a `mt-10` (or wrap in a spacing container).
export default function CinematicPageHero({ eyebrow, title, subtitle, icon: Icon, gradient = false, align = 'left' }) {
  const centered = align === 'center';
  return (
    <header className={centered ? 'text-center mb-10 sm:mb-12' : 'mb-10 sm:mb-12'}>
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[.18em] mb-4 ${centered ? 'mx-auto' : ''}`}
          style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--accent)' }}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {eyebrow}
        </span>
      )}
      <h1
        className={`font-display font-extrabold tracking-tight leading-[1.03] ${gradient ? 'cine-grad-flow inline-block' : ''} ${centered ? 'mx-auto' : ''}`}
        style={{ fontSize: 'clamp(32px,4.6vw,56px)' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className={`mt-4 text-lg leading-relaxed ${centered ? 'mx-auto' : ''}`} style={{ color: 'var(--ink-dim)', maxWidth: '40rem' }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}
