'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Rss, ArrowRight, ExternalLink, FlaskConical, Sparkles, Grid3x3 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import BookLoader from '@/components/book-loader';
import MultiSelect from '@/components/multi-select';
import { SECTION_COLORS } from '@/lib/section-colors';
import {
  freshnessLabel, isResearchSource, lessonHref, CATEGORY_LABELS, SCAN_TIME_LABEL,
} from '@/lib/ai-news';
import {
  LANES, LANE_BY_ID, RANKED_LIMIT, attachPersonal, byBestMatch, publishedMs,
  laneCounts, hasPersonalization, marksByItem, isDefaultVisible, MAX_AGE_HOURS,
  rankableItems,
} from '@/lib/news-personal';

// What the daily scan found that affects the person reading it.
//
// The page used to be organised by what KIND of news each item was — model
// changes, tool features, product pitches — with the count pills showing raw
// totals. That answered "what happened" and left "does any of this touch my
// work" entirely to the reader (feedback #145).
//
// So the spine of the page is impact on YOU. Lanes come from a per learner score
// (api/ai-news/why, built from tasks, goals, projects and tools), category and
// source drop to filters, and items the news has actually moved on your Knowledge
// Heatmap say so on the row.
//
// It is NOT a complete view of the feed, by decision. Three gates in
// lib/news-personal.js decide what appears at all: the item has to be recent, it
// has to be the kind of thing we teach, and it has to touch this reader's work.
// On a 200-item scan that routinely leaves under ten. Nothing is destroyed — the
// admin surfaces still see the whole feed — but a learner opening this page
// should find only what affects their role, with no count of what was left out
// and no toggle tempting them into it.

export default function AiNewsPage() {
  return <CinematicFrame><AiNewsInner /></CinematicFrame>;
}

// The small pill that says why an item scored the way it did — the learner's own
// vocabulary back at them ("Your project: Video Maker").
function MatchChip({ text }) {
  return (
    // Tailwind colour pairs rather than a CSS var, so the chip keeps its
    // contrast in both themes the same way the heatmap's badges do.
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/50">
      <Sparkles className="w-3 h-3" />
      {text}
    </span>
  );
}

// The heatmap tie-back. lib/skill-staleness.js has been marking skills "worth a
// refresh" from this same feed since feedback #54, but the news page never said
// so, which made the loop invisible from the side where it starts. Clickable, so
// "this changed how you should prompt" leads straight to the square it changed.
function HeatmapChip({ mark }) {
  return (
    // Orange, matching the "Stale" badge on /heatmap — the chip and the square
    // it points at should read as the same signal.
    <Link
      href="/heatmap"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold relative pointer-events-auto text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/50"
      title={mark.reason || 'This update makes that skill worth a refresh'}
    >
      <Grid3x3 className="w-3 h-3" />
      Refreshes {mark.skill}
    </Link>
  );
}

function NewsRow({ item, mark }) {
  return (
    // The whole row is the "Take a lesson" target via the stretched link below,
    // so the hover lift/glow means something rather than decorating a container
    // you can't click. A stretched <Link> (absolute inset-0) rather than wrapping
    // the row, because "Read the source" is itself an <a> and nesting anchors is
    // invalid HTML — the overlay sits under the real links instead.
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
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: 'var(--accent2)' }}
            >
              {item.sourceName}
            </span>
            {item.match && <MatchChip text={item.match} />}
            {mark && <HeatmapChip mark={mark} />}
          </div>
          <p className="font-semibold leading-snug">{item.title}</p>
          {/* Publisher's own blurb, so you can judge whether it's worth a lesson
              without opening the article. Missing for sources that ship no
              description, so the row has to read fine without it. */}
          {item.summary && (
            <p className="text-sm leading-relaxed mt-1.5" style={{ color: 'var(--ink-dim)' }}>
              {item.summary}
            </p>
          )}
          {/* What it means for THIS reader, generated from their role, tasks,
              goals and projects. The blurb above summarises the article; this
              says what changed and why it lands on their desk (feedback #145).
              Only the top-ranked items get one, so the row must read fine
              without it. */}
          {item.why && (
            <p
              className="text-sm leading-relaxed mt-2 pl-2.5"
              style={{ color: 'var(--ink)', borderLeft: '2px solid var(--accent)' }}
            >
              <span className="font-semibold">Why this matters to you: </span>{item.why}
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

function Section({ label, count, note, items, marks, icon: Icon }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />}
        <h3 className="font-display font-bold text-xl">{label}</h3>
        <span className="text-xs tabular-nums" style={{ color: 'var(--ink-dim)' }}>{count}</span>
      </div>
      {note && <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>{note}</p>}
      <div className="space-y-2 mt-3">
        {items.map((item, i) => (
          <NewsRow
            key={item.externalId || `${label}-${i}`}
            item={item}
            mark={marks.get(item.externalId)}
          />
        ))}
      </div>
    </section>
  );
}

// One pill in the lane row. Active is a solid fill, matching the admin feedback
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
      <span
        className={`text-xs ${active ? 'text-white/80' : ''}`}
        style={active ? undefined : { color: 'var(--ink-dim)', opacity: 0.7 }}
      >
        {count}
      </span>
    </button>
  );
}

// What to say above the unranked pile.
//
// The old note said "these few sat past that line or came back unjudged" no
// matter how many there were, and read as reassurance. On a day when the ranking
// mostly failed it sat above 22 of 23 items and quietly misdescribed a broken
// feature as housekeeping. When most of the feed is unranked, say so — a reader
// who can see the lane counts already knows something is off, and being told
// "these few" when it is nearly all of them is worse than being told nothing.
function unrankedNote(unrankedCount, practicalCount) {
  const mostly = practicalCount > 0 && unrankedCount / practicalCount >= 0.5;
  if (mostly) {
    return `We could not rank most of today's items against your work — ${unrankedCount} of ${practicalCount} came back unjudged, so they are in date order instead of best-match. Nothing is lost, but the order below is not personal to you. It usually sorts itself out on the next check.`;
  }
  return `We rank the newest ${RANKED_LIMIT} items against your work each day, which is normally the whole feed. These sat past that line or came back unjudged, so they are here in date order so nothing is lost.`;
}

function AiNewsInner() {
  const [data, setData] = useState(null);
  const [personal, setPersonal] = useState({});
  // 'loading' until the ranking call settles, then 'ready' or 'failed'. Kept
  // distinct from an empty map because "we ranked nothing for you" and "we
  // couldn't rank" need different words on the page.
  const [rankState, setRankState] = useState('loading');
  const [marks, setMarks] = useState([]);

  // `null` means "the reader hasn't chosen yet", so the page can derive a sensible
  // default from the ranking WITHOUT an effect that reaches in and overwrites
  // state. The first version did exactly that — rendered the unranked feed, then
  // re-sorted itself when the scores landed — and the first thing it showed was a
  // wall of items that had nothing to do with you. A derived default has no such
  // window: nothing renders until there is something worth rendering.
  const [view, setView] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai-news', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setData(d || { items: [], count: 0, totalCount: 0, scannedAt: null }); })
      .catch(() => { if (active) setData({ items: [], count: 0, totalCount: 0, scannedAt: null }); });

    // Org-wide and read-only: which skills the news says are worth a refresh.
    // Independent of the list, so it races it rather than waiting.
    fetch('/api/skill-staleness')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && Array.isArray(d?.marks)) setMarks(d.marks); })
      .catch(() => { /* the rows read fine without the heatmap chip */ });

    return () => { active = false; };
  }, []);

  // Memoized: `data?.items || []` is a new array identity every render, which
  // made every useMemo below re-run on each one — memoized in name only.
  const all = useMemo(() => data?.items || [], [data]);

  // What gets sent for ranking: the newest RANKED_LIMIT items that could appear
  // in the default view. Two exclusions, both for the same reason — never spend a
  // learner's daily generation on rows the lanes will not show:
  //
  //   arXiv, because the page files research in its own section outside the lanes.
  //   Unapproved categories, because vendor pitches, funding news and industry
  //     commentary never reach this page at all.
  //   Anything older than MAX_AGE_HOURS, because it is not news and will not show.
  //
  // The score gate in isDefaultVisible can't apply here — it needs the score this
  // call produces — so it runs after the results land.
  // Shared with the home page's news card via lib/news-personal, so both ask
  // api/ai-news/why for the identical set and therefore share its per-day cache
  // and its scores. When these two drifted apart, the card showed items this page
  // would not.
  const rankable = useMemo(() => rankableItems(all), [all]);

  // The effect depends on a STRING of ids, not on `rankable`. `rankable` is a
  // fresh array identity whenever data reloads, and depending on it would re-POST
  // on every such render; the joined ids only change when the actual set does.
  const rankKey = useMemo(() => rankable.map((i) => i.externalId).join('|'), [rankable]);
  const listLoaded = data !== null;

  useEffect(() => {
    if (!listLoaded) return;
    if (!rankKey) { setRankState('ready'); return; }
    let active = true;
    setRankState('loading');
    fetch('/api/ai-news/why', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: rankable.map((i) => ({ id: i.externalId, title: i.title, summary: i.summary })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        const map = d?.personal || {};
        setPersonal(map);
        setRankState(Object.keys(map).length ? 'ready' : 'failed');
      })
      .catch(() => { if (active) setRankState('failed'); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankKey, listLoaded]);

  const enriched = useMemo(() => attachPersonal(all, personal), [all, personal]);
  const ranked = hasPersonalization(enriched);

  // The view and sort the page opens on, derived rather than assigned. Which lane
  // it lands on depends on what the day actually produced: opening on "Changes
  // your work" when nothing scored that high greets you with an empty room, so it
  // falls back to the first lane with anything in it.
  const defaultView = useMemo(() => {
    if (!ranked) return 'all';
    const populated = LANES.find((lane) => enriched.some((i) => i.lane === lane.id));
    return populated ? populated.id : 'all';
  }, [ranked, enriched]);

  const activeView = view ?? defaultView;
  const activeSort = sortBy ?? (ranked ? 'match' : 'newest');

  const markMap = useMemo(() => marksByItem(enriched, marks), [enriched, marks]);

  // The relevance gate, and the only list this page has.
  //
  // There is no "show everything" any more. It existed for a day, announcing how
  // many items had been held back, and on a 200-item scan that meant telling a
  // learner about 190 things we had just decided were not worth their time. On a
  // learning app that reads as an invitation to go and read the noise. The page
  // promises what changed for YOU, so that is all it carries.
  //
  // The scan still stores everything — nothing is destroyed, and the admin
  // surfaces still see the whole feed. It is this page that has an opinion.
  //
  // DECLARED BEFORE ITS CONSUMERS, and it has to stay that way. useMemo bodies run
  // during render, so a memo above this line that reads `base` throws
  // "Cannot access 'base' before initialization" and takes the whole page down —
  // which is exactly what shipped once already. `next build` cannot see it,
  // because nothing evaluates the component until a browser mounts it.
  const base = useMemo(() => enriched.filter(isDefaultVisible), [enriched]);

  // Both dropdowns are built from the list actually on the page, NOT from the
  // whole feed. Offering "Business & market" as a Type when no business item can
  // appear is offering a filter that can only ever return nothing.
  const sourceOptions = useMemo(
    () => [...new Set(base.map((i) => i.sourceName).filter(Boolean))]
      .sort()
      .map((s) => ({ value: s, label: s })),
    [base],
  );

  const categoryOptions = useMemo(() => {
    const present = [...new Set(base.map((i) => i.category || 'unclassified'))];
    return present
      .map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [base]);

  const scoped = useMemo(() => {
    let list = base;
    if (selectedSources.length) list = list.filter((i) => selectedSources.includes(i.sourceName));
    if (selectedCategories.length) {
      list = list.filter((i) => selectedCategories.includes(i.category || 'unclassified'));
    }
    list = list.slice();
    if (activeSort === 'match') list.sort(byBestMatch);
    else if (activeSort === 'newest') list.sort((a, b) => publishedMs(b) - publishedMs(a));
    else if (activeSort === 'oldest') list.sort((a, b) => publishedMs(a) - publishedMs(b));
    else if (activeSort === 'source') {
      list.sort((a, b) => String(a.sourceName).localeCompare(String(b.sourceName)));
    }
    return list;
  }, [base, selectedSources, selectedCategories, activeSort]);

  // arXiv is split out regardless of lane — raw paper titles get their own
  // clearly-labelled home so nobody mistakes them for practical picks.
  const practical = useMemo(() => scoped.filter((i) => !isResearchSource(i.sourceName)), [scoped]);
  const research = useMemo(() => scoped.filter((i) => isResearchSource(i.sourceName)), [scoped]);

  const { counts, unranked } = useMemo(() => laneCounts(practical), [practical]);

  const inView = activeView === 'all'
    ? practical
    : activeView === 'unranked'
      ? practical.filter((i) => !i.lane)
      : practical.filter((i) => i.lane === activeView);

  const laneSections = activeView === 'all'
    ? LANES.map((lane) => ({ lane, items: practical.filter((i) => i.lane === lane.id) }))
      .filter((s) => s.items.length)
    : activeView === 'unranked'
      ? []
      : [{ lane: LANE_BY_ID.get(activeView), items: inView }].filter((s) => s.lane && s.items.length);

  const unrankedItems = (activeView === 'all' || activeView === 'unranked')
    ? practical.filter((i) => !i.lane)
    : [];

  // No "next check" here — it implied repeated scanning. The scan runs once a
  // day; "updated Nh ago" is the honest signal and still exposes a dead cron.
  // Counts what is ON the page, not what the scan swept up. `all.length` was the
  // raw stored total, which meant the hero advertised 200 items above a list of
  // ten — a number that described our scraper rather than the reader's day.
  const subtitle = data?.scannedAt
    ? `${base.length} ${base.length === 1 ? 'update' : 'updates'} for your work · checked ${freshnessLabel(data.scannedAt)}`
    : 'Check out the latest in AI News and take a lesson if you\'d like to learn more.';

  return (
    <div className="min-h-screen">
      <PageHeader icon={Rss} title="AI news" subtitle="Ranked against your work" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-10">
        <CinematicPageHero
          eyebrow="AI news"
          title="What changed for you"
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
        ) : rankState === 'loading' ? (
          // Nothing from the feed renders until it has been ranked.
          //
          // The first version showed the raw newest-first list during this window
          // and re-sorted underneath you, which meant the page's first impression
          // was a wall of items with nothing to do with your work — the exact
          // problem this rebuild exists to fix. A few seconds of honest waiting
          // beats a few seconds of wrong answer.
          <RankingSkeleton />
        ) : base.length === 0 ? (
          // Items are stored, but none of them are both recent and relevant to
          // this reader. A real outcome on a quiet Monday, not an error — and it
          // has to say so, because the alternative is a page that looks broken.
          <div className="cine-glass rounded-2xl p-6 text-sm space-y-2" style={{ color: 'var(--ink-dim)' }}>
            <p style={{ color: 'var(--ink)' }} className="font-semibold">
              Nothing new for your work in the last {MAX_AGE_HOURS} hours.
            </p>
            <p>
              We only show updates from the last two days that touch your role, tasks, goals or
              projects. Today&rsquo;s scan found nothing that clears that bar, which is a quiet news
              day rather than a problem. The next scan runs at {SCAN_TIME_LABEL}.
            </p>
            <p>
              <Link href="/my-goals" className="underline font-medium">Update what you&rsquo;re working on</Link>
              {' '}if your focus has shifted, or take a lesson on anything from the{' '}
              <Link href="/library" className="underline font-medium">Library</Link>.
            </p>
          </div>
        ) : (
          <>
            <RankNotice ranked={ranked} count={counts.act} />

            {/* Filters on their own line so the dropdowns never collide with the
                pill row, mirroring the admin feedback page's layout. Category
                lives here now rather than in the pills: it is a way to slice the
                feed, not the thing the page leads with. */}
            <div className="flex flex-wrap items-center gap-4">
              <MultiSelect
                label="Source"
                options={sourceOptions}
                selected={selectedSources}
                onChange={setSelectedSources}
              />
              <MultiSelect
                label="Type"
                options={categoryOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
              />
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-dim)' }}>
                Sort
                <select
                  value={activeSort}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs px-2 py-1"
                >
                  <option value="match" disabled={!ranked}>Best match</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="source">By source</option>
                </select>
              </div>
            </div>

            {/* The pills are impact on YOU, not category totals. Every count is
                what that pill would actually open. */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="pr-3 mr-0.5 text-sm font-medium whitespace-nowrap"
                style={{ color: 'var(--ink-dim)', borderRight: '1px solid var(--line)' }}
              >
                Total
                <span className="ml-1.5 text-xs" style={{ color: 'var(--ink-dim)', opacity: 0.7 }}>
                  {practical.length}
                </span>
              </span>
              <FilterPill
                label="All"
                count={practical.length}
                active={activeView === 'all'}
                onClick={() => setView('all')}
              />
              {ranked && LANES.map((lane) => (
                <FilterPill
                  key={lane.id}
                  label={lane.label}
                  count={counts[lane.id]}
                  active={activeView === lane.id}
                  onClick={() => setView(lane.id)}
                />
              ))}
              {ranked && unranked > 0 && (
                <FilterPill
                  label="Not ranked"
                  count={unranked}
                  active={activeView === 'unranked'}
                  onClick={() => setView('unranked')}
                />
              )}
            </div>

            <div className="space-y-10">
              {laneSections.map(({ lane, items }) => (
                <Section
                  key={lane.id}
                  label={lane.label}
                  count={items.length}
                  note={lane.note}
                  items={items}
                  marks={markMap}
                />
              ))}

              {/* When nothing is ranked yet (or ranking failed) the page still
                  has to show the news, so it falls back to one flat list. */}
              {!ranked && activeView === 'all' && (
                <Section
                  label="Latest"
                  count={practical.length}
                  items={practical}
                  marks={markMap}
                />
              )}

              {unrankedItems.length > 0 && (
                <Section
                  label="Not ranked"
                  count={unrankedItems.length}
                  note={unrankedNote(unrankedItems.length, practical.length)}
                  items={unrankedItems}
                  marks={markMap}
                />
              )}

              {/* A lane you have filtered down to nothing, or a lane the day
                  simply didn't fill. Without this the page just ends after the
                  pills, which reads as broken rather than as empty. */}
              {inView.length === 0 && (
                <div className="cine-glass rounded-2xl p-6 text-sm" style={{ color: 'var(--ink-dim)' }}>
                  {selectedSources.length || selectedCategories.length
                    ? 'Nothing here with those filters on. Clear Source or Type to widen it.'
                    : 'Nothing landed in this group today. Try another one — the whole feed is under All.'}
                </div>
              )}
            </div>

            {research.length > 0 && activeView === 'all' && (
              <div className="pt-6" style={{ borderTop: '1px solid var(--line)' }}>
                <Section
                  label="Research"
                  count={research.length}
                  icon={FlaskConical}
                  note="Raw paper titles straight from arXiv. Heavier going than the news above, and not ranked against your work — worth a look if you want the underlying work."
                  items={research}
                  marks={markMap}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// What the page shows while the ranking call is out.
//
// Deliberately NOT the BookLoader used elsewhere: this wait is a few seconds of
// real work on the reader's behalf, and saying what that work IS turns dead time
// into an explanation of why the list below is ordered the way it is. The ghost
// rows keep the layout still, so nothing jumps when the real ones arrive.
function RankingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="cine-glass rounded-2xl px-4 py-3 text-sm flex items-center gap-2" style={{ color: 'var(--ink-dim)' }}>
        <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'var(--accent2)' }} />
        Ranking today&rsquo;s news against your role, tasks, goals and projects…
      </div>
      <div className="space-y-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="cine-glass rounded-2xl px-4 py-4 animate-pulse">
            <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-3.5 w-3/4 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
            <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The one line that tells the reader what the ordering means: explain what the
// sort is, and admit it plainly when the ranking didn't happen.
function RankNotice({ ranked, count }) {
  if (!ranked) {
    return (
      <div className="cine-glass rounded-2xl px-4 py-3 text-sm" style={{ color: 'var(--ink-dim)' }}>
        We couldn&rsquo;t rank these against your work just now, so this is the plain feed, newest first.
        Everything still works, and a refresh usually sorts it.
      </div>
    );
  }
  return (
    <div className="cine-glass rounded-2xl px-4 py-3 text-sm" style={{ color: 'var(--ink-dim)' }}>
      <Sparkles className="w-4 h-4 inline-block mr-1.5 -mt-0.5" style={{ color: 'var(--accent2)' }} />
      Ranked against your role, tasks, goals and projects.{' '}
      {count > 0
        ? <><strong style={{ color: 'var(--ink)' }}>{count}</strong> {count === 1 ? 'item changes' : 'items change'} your work today.</>
        : 'Nothing in today\'s scan changes your work directly, so this is what is worth watching.'}{' '}
      <Link href="/my-goals" className="underline font-medium">Update what you&rsquo;re working on</Link> to change what rises to the top.
    </div>
  );
}
