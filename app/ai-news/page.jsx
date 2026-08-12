'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Rss, ArrowRight, ExternalLink, FlaskConical } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import BookLoader from '@/components/book-loader';
import MultiSelect from '@/components/multi-select';
import { SECTION_COLORS } from '@/lib/section-colors';
import {
  freshnessLabel, groupByCategory, isApproved, isResearchSource, lessonHref,
  SCAN_TIME_LABEL,
} from '@/lib/ai-news';

// Everything the daily scan found. The home card shows the newest three that
// passed the relevance guardrail; this page shows all of them grouped by what
// kind of news they are, and can reveal what the guardrail rejected.
//
// The "Show everything" toggle is the point of storing rejected items rather
// than discarding them: if the rubric turns out too strict, you can see exactly
// what it dropped and adjust, instead of wondering what you never saw.
// How many of the newest items get a tailored line. Matches the server cap in
// api/ai-news/why, and keeps the single generation call small.
const WHY_LIMIT = 12;

export default function AiNewsPage() {
  return <CinematicFrame><AiNewsInner /></CinematicFrame>;
}

function NewsRow({ item, why }) {
  return (
    // The whole row is now the "Take a lesson" target via the stretched link
    // below, so the hover lift/glow means something rather than decorating a
    // container you can't click. A stretched <Link> (absolute inset-0) rather than
    // wrapping the row, because "Read the source" is itself an <a> and nesting
    // anchors is invalid HTML — the overlay sits under the real links instead.
    <div
      className="cine-glass cine-tilt rounded-2xl px-4 py-3 relative"
      style={{ '--tilt-accent': SECTION_COLORS.aiNews }}
    >
      <Link
        href={lessonHref(item)}
        aria-label={`Take a lesson on: ${item.title}`}
        className="absolute inset-0 rounded-2xl"
      />
      <div className="flex items-start gap-3 relative pointer-events-none">
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
          {/* What it means for THIS reader, generated from their role and tasks.
              The blurb above summarises the article; this says what changed and
              why it lands on their desk (feedback #145). Absent until it loads,
              and absent entirely if generation failed, so the row still reads
              fine without it. */}
          {why && (
            <p className="text-sm leading-relaxed mt-2 pl-2.5" style={{ color: 'var(--ink)', borderLeft: '2px solid var(--accent)' }}>
              <span className="font-semibold">Why this matters to you: </span>{why}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {/* pointer-events-auto: the content wrapper above is
                pointer-events-none so clicks anywhere on the row reach the
                stretched link, but these two must stay individually clickable —
                especially "Read the source", which goes somewhere different. */}
            <Link
              href={lessonHref(item)}
              className="inline-flex items-center gap-1 text-xs font-bold relative pointer-events-auto"
              style={{ color: 'var(--good)' }}
            >
              Take a lesson <ArrowRight className="w-3 h-3" />
            </Link>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold relative pointer-events-auto"
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

function CategorySection({ label, count, items, note, why }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-display font-bold text-xl">{label}</h3>
        <span className="text-xs tabular-nums" style={{ color: 'var(--ink-dim)' }}>{count}</span>
      </div>
      {note && <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>{note}</p>}
      <div className="space-y-2 mt-3">
        {items.map((item, i) => (
          <NewsRow key={item.externalId || `${label}-${i}`} item={item} why={why?.[item.externalId]} />
        ))}
      </div>
    </section>
  );
}

// One pill in the filter row. Active is a solid fill, matching the admin feedback
// page's tabs — that's the pattern this page was asked to follow.
function FilterPill({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-brand text-white' : 'cine-glass'
      }`}
      style={active ? undefined : { color: 'var(--ink-dim)' }}
    >
      {label}
      <span className={`text-xs ${active ? 'text-white/80' : ''}`} style={active ? undefined : { color: 'var(--ink-dim)', opacity: 0.7 }}>
        {count}
      </span>
    </button>
  );
}

function AiNewsInner() {
  const [data, setData] = useState(null);
  // One selection drives the pill row: 'all' (default), 'skills' for the curated
  // set, or a category slug. There's no "important vs not" toggle any more — every
  // item is potentially worth someone's time, so the row just offers views rather
  // than ranking them.
  const [view, setView] = useState('all');
  const [selectedSources, setSelectedSources] = useState([]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    let active = true;
    fetch('/api/ai-news', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setData(d || { items: [], count: 0, totalCount: 0, scannedAt: null }); })
      .catch(() => { if (active) setData({ items: [], count: 0, totalCount: 0, scannedAt: null }); });
    return () => { active = false; };
  }, []);

  // Memoized: `data?.items || []` is a new array identity every render, which made
  // every useMemo below re-run on each one — memoized in name only.
  const all = useMemo(() => data?.items || [], [data]);

  // Per-learner "why this matters to you", one line per item. Fetched after the
  // list lands, in a single request covering the newest items, and cached
  // server-side per learner per content-day so revisits cost nothing.
  //
  // The effect depends on a STRING of ids, not on `all`. `all` is a fresh array
  // identity whenever data reloads, and depending on it would re-POST on every
  // such render; the joined ids only change when the actual set of items does.
  const [why, setWhy] = useState({});
  const whyItems = useMemo(
    () => all.slice(0, WHY_LIMIT).filter((i) => i.externalId && i.title),
    [all],
  );
  const whyKey = useMemo(() => whyItems.map((i) => i.externalId).join('|'), [whyItems]);

  useEffect(() => {
    if (!whyKey) return;
    let active = true;
    fetch('/api/ai-news/why', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: whyItems.map((i) => ({ id: i.externalId, title: i.title, summary: i.summary })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.why) setWhy(d.why); })
      .catch(() => { /* the list reads fine without these lines */ });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whyKey]);

  // Source filter + sort apply to EVERYTHING, before the view pills, so the pill
  // counts always describe what you'd actually get by clicking them.
  const sourceOptions = useMemo(
    () => [...new Set(all.map((i) => i.sourceName).filter(Boolean))]
      .sort()
      .map((s) => ({ value: s, label: s })),
    [all]
  );

  const scoped = useMemo(() => {
    let list = selectedSources.length
      ? all.filter((i) => selectedSources.includes(i.sourceName))
      : all.slice();
    if (sortBy === 'newest' || sortBy === 'oldest') {
      // publishedAt is whatever the feed gave us (RFC-822 or ISO). Anything
      // unparseable sorts last rather than poisoning the order with NaN.
      const t = (i) => {
        const ms = new Date(i.publishedAt || 0).getTime();
        return Number.isNaN(ms) ? 0 : ms;
      };
      list.sort((a, b) => (sortBy === 'newest' ? t(b) - t(a) : t(a) - t(b)));
    } else if (sortBy === 'source') {
      list.sort((a, b) => String(a.sourceName).localeCompare(String(b.sourceName)));
    }
    return list;
  }, [all, selectedSources, sortBy]);

  const scopedApproved = scoped.filter(isApproved);

  // Pill counts come from `scoped` (post source/sort, pre view) so every number is
  // exactly what that pill would show.
  const countsByCategory = useMemo(() => {
    const m = new Map();
    for (const i of scoped.filter((x) => !isResearchSource(x.sourceName))) {
      const c = i.category || 'unclassified';
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [scoped]);

  const pillGroups = groupByCategory(scoped.filter((i) => !isResearchSource(i.sourceName)));

  const shown = view === 'skills' ? scopedApproved : scoped;
  const activeCategory = view !== 'all' && view !== 'skills' ? view : null;

  const allGroups = groupByCategory(shown.filter((i) => !isResearchSource(i.sourceName)));
  const groups = activeCategory ? allGroups.filter((g) => g.category === activeCategory) : allGroups;
  // arXiv is split out regardless of category — raw paper titles get their own
  // clearly-labelled home so nobody mistakes them for practical picks. Hidden
  // while a category filter is on rather than sitting under an unrelated heading.
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
            {/* Filters on their own line so the dropdowns never collide with the
                pill row, mirroring the admin feedback page's layout. */}
            <div className="flex flex-wrap items-center gap-4">
              <MultiSelect
                label="Source"
                options={sourceOptions}
                selected={selectedSources}
                onChange={setSelectedSources}
              />
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-dim)' }}>
                Sort
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-2 py-1"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="source">By source</option>
                </select>
              </div>
            </div>

            {/* Total leading the pill row, then the views. "For your skills" is the
                curated set — named as a suggestion, not a claim that the rest is
                unimportant, since any of it could matter to someone. */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="pr-3 mr-0.5 text-sm font-medium whitespace-nowrap"
                style={{ color: 'var(--ink-dim)', borderRight: '1px solid var(--line)' }}
              >
                Total
                <span className="ml-1.5 text-xs" style={{ color: 'var(--ink-dim)', opacity: 0.7 }}>
                  {scoped.length}
                </span>
              </span>
              <FilterPill label="All" count={scoped.length} active={view === 'all'} onClick={() => setView('all')} />
              <FilterPill
                label="For your skills"
                count={scopedApproved.length}
                active={view === 'skills'}
                onClick={() => setView('skills')}
              />
              {pillGroups.map((g) => (
                <FilterPill
                  key={g.category}
                  label={g.label}
                  count={countsByCategory.get(g.category) || g.items.length}
                  active={view === g.category}
                  onClick={() => setView(g.category)}
                />
              ))}
            </div>

            <div className="space-y-10">
              {groups.map((g) => (
                <CategorySection
                  key={g.category}
                  label={g.label}
                  count={g.items.length}
                  items={g.items}
                  why={why}
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
                    <NewsRow key={item.externalId || `research-${i}`} item={item} why={why?.[item.externalId]} />
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
