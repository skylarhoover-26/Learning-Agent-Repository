'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Rss, ArrowRight, ExternalLink, FlaskConical, Filter } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import BookLoader from '@/components/book-loader';
import {
  freshnessLabel, groupByCategory, isResearchSource, lessonHref,
  splitByApproval, SCAN_TIME_LABEL,
} from '@/lib/ai-news';

// Everything the daily scan found. The home card shows the newest three that
// passed the relevance guardrail; this page shows all of them grouped by what
// kind of news they are, and can reveal what the guardrail rejected.
//
// The "Show everything" toggle is the point of storing rejected items rather
// than discarding them: if the rubric turns out too strict, you can see exactly
// what it dropped and adjust, instead of wondering what you never saw.
export default function AiNewsPage() {
  return <CinematicFrame><AiNewsInner /></CinematicFrame>;
}

function NewsRow({ item }) {
  return (
    <div className="cine-glass cine-row rounded-2xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--accent2)' }}
          >
            {item.sourceName}
          </span>
          <p className="font-semibold leading-snug">{item.title}</p>
          {/* Publisher's own blurb, so you can judge whether it's worth a lesson
              without opening the article. Missing for sources that ship no
              description, so the row has to read fine without it. */}
          {item.summary && (
            <p className="text-sm leading-relaxed mt-1.5" style={{ color: 'var(--ink-dim)' }}>
              {item.summary}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <Link
              href={lessonHref(item)}
              className="inline-flex items-center gap-1 text-xs font-bold"
              style={{ color: 'var(--good)' }}
            >
              Take a lesson <ArrowRight className="w-3 h-3" />
            </Link>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--ink-dim)' }}
              >
                Read the source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ label, count, items, note }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-display font-bold text-xl">{label}</h3>
        <span className="text-xs tabular-nums" style={{ color: 'var(--ink-dim)' }}>{count}</span>
      </div>
      {note && <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>{note}</p>}
      <div className="space-y-2 mt-3">
        {items.map((item, i) => (
          <NewsRow key={item.externalId || `${label}-${i}`} item={item} />
        ))}
      </div>
    </section>
  );
}

// Filter chips: All + one per category actually present in the current list, so
// the row never offers a filter that would return nothing.
function CategoryFilter({ groups, active, onChange, total }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="cine-glass px-3 py-1.5 rounded-pill text-xs font-bold transition-colors"
        style={active === null
          ? { color: 'var(--accent)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }
          : { color: 'var(--ink-dim)' }}
      >
        All {total}
      </button>
      {groups.map((g) => {
        const on = active === g.category;
        return (
          <button
            key={g.category}
            type="button"
            onClick={() => onChange(on ? null : g.category)}
            className="cine-glass px-3 py-1.5 rounded-pill text-xs font-bold transition-colors"
            style={on
              ? { color: 'var(--accent)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }
              : { color: 'var(--ink-dim)' }}
          >
            {g.label} {g.items.length}
          </button>
        );
      })}
    </div>
  );
}

function AiNewsInner() {
  const [data, setData] = useState(null);
  // Defaults to EVERYTHING. The guardrail's job is keeping the HOME page focused;
  // this page is the browse surface, so showing all of it and letting the category
  // chips narrow is the more useful default than hiding 85 of 109 items behind a
  // toggle nobody knows to press.
  const [showAll, setShowAll] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai-news', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setData(d || { items: [], count: 0, totalCount: 0, scannedAt: null }); })
      .catch(() => { if (active) setData({ items: [], count: 0, totalCount: 0, scannedAt: null }); });
    return () => { active = false; };
  }, []);

  const all = data?.items || [];
  const { approved, rejected } = splitByApproval(all);

  // arXiv is split out regardless of category — raw paper titles get their own
  // clearly-labelled home so nobody mistakes them for practical picks.
  const shown = showAll ? all : approved;
  // Groups are computed BEFORE the category filter so the chips keep showing every
  // available option (and its real count) while one of them is selected —
  // otherwise picking a filter would hide the way back to the others.
  const allGroups = groupByCategory(shown.filter((i) => !isResearchSource(i.sourceName)));
  const groups = activeCategory ? allGroups.filter((g) => g.category === activeCategory) : allGroups;
  // Research is its own labelled section, so it's hidden whenever a category
  // filter is active rather than sitting under an unrelated heading.
  const research = activeCategory ? [] : shown.filter((i) => isResearchSource(i.sourceName));

  // No "next check" here either — it implied repeated scanning. The scan runs once
  // a day; "updated Nh ago" is the honest signal and still exposes a dead cron.
  const subtitle = data?.scannedAt
    ? `${all.length} items · updated ${freshnessLabel(data.scannedAt)}`
    : 'Check out the latest in AI News and take a lesson if you\'d like to learn more.';

  return (
    <div className="min-h-screen">
      <PageHeader icon={Rss} title="AI news" subtitle="Everything today's scan found" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-10">
        <CinematicPageHero
          eyebrow="AI news"
          title="Everything we found"
          subtitle={subtitle}
          icon={Rss}
          gradient
        />

        {data === null ? (
          <div className="flex justify-center py-10">
            <BookLoader message="Loading the latest AI news…" size="sm" />
          </div>
        ) : all.length === 0 ? (
          <div className="cine-glass rounded-2xl p-6 text-sm" style={{ color: 'var(--ink-dim)' }}>
            No updates stored yet — the scan runs every morning at {SCAN_TIME_LABEL}.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                {showAll
                  ? `All ${all.length} items — pick a category below to narrow it down.`
                  : `Showing the ${approved.length} items about models, tools, and how to work with them.`}
              </p>
              {rejected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="cine-glass inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold shrink-0"
                  style={{ color: 'var(--accent2)' }}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {showAll ? 'Show only what matters' : `Show everything (${all.length})`}
                </button>
              )}
            </div>

            {allGroups.length > 1 && (
              <CategoryFilter
                groups={allGroups}
                active={activeCategory}
                onChange={setActiveCategory}
                total={shown.length}
              />
            )}

            <div className="space-y-10">
              {groups.map((g) => (
                <CategorySection
                  key={g.category}
                  label={g.label}
                  count={g.items.length}
                  items={g.items}
                />
              ))}
            </div>

            {research.length > 0 && (
              <div className="pt-6" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <h2 className="font-display font-bold text-xl">Research</h2>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--ink-dim)' }}>
                    {research.length}
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>
                  Raw paper titles straight from arXiv. Heavier going than the news above — worth a
                  look if you want the underlying work.
                </p>
                <div className="space-y-2 mt-3">
                  {research.map((item, i) => (
                    <NewsRow key={item.externalId || `research-${i}`} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
