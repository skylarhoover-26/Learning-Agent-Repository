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
        // Plain uppercase kicker (no pill background/border) so it reads as a
        // label, not a clickable button — testers kept trying to click the pill.
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.18em] mb-4 ${centered ? 'mx-auto' : ''}`}
          style={{ color: 'var(--accent)' }}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {eyebrow}
        </span>
      )}
      <h1
        // leading + small padding keep the gradient (background-clip: text) from
        // clipping descenders / the last glyph of the heading.
        className={`font-display font-extrabold tracking-tight leading-[1.1] pb-[0.12em] pr-[0.06em] ${gradient ? 'cine-grad-flow inline-block' : ''} ${centered ? 'mx-auto' : ''}`}
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
