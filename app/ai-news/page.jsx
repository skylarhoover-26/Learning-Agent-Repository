'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Rss, ArrowRight, ExternalLink, FlaskConical } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import CinematicPageHero from '@/components/cinematic/cinematic-page-hero';
import BookLoader from '@/components/book-loader';
import { freshnessLabel, groupBySource, lessonHref, SCAN_TIME_LABEL } from '@/lib/ai-news';

// Everything the daily scan found, browsable — the home page shows only the
// newest three. Each headline can be turned into a lesson on the spot.
//
// Sources are grouped, with arXiv filed under Research at the bottom: those are
// raw paper titles, and presenting "Do Models Fake Alignment Without Clear
// Consequences" as a practical pick sets the wrong expectation. They're still
// here for anyone curious, just labelled for what they are.
export default function AiNewsPage() {
  return <CinematicFrame><AiNewsInner /></CinematicFrame>;
}

function SourceGroup({ sourceName, items }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display font-bold text-lg">{sourceName}</h3>
        <span className="text-xs tabular-nums" style={{ color: 'var(--ink-dim)' }}>
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={item.externalId || `${sourceName}-${i}`}
            className="cine-glass cine-row rounded-2xl px-4 py-3 flex items-start gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{item.title}</p>
              <div className="flex items-center gap-3 mt-1.5">
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
        ))}
      </div>
    </section>
  );
}

function AiNewsInner() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai-news', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setData(d || { items: [], count: 0, scannedAt: null }); })
      .catch(() => { if (active) setData({ items: [], count: 0, scannedAt: null }); });
    return () => { active = false; };
  }, []);

  const items = data?.items || [];
  const { practical, research } = groupBySource(items);

  const subtitle = data?.scannedAt
    ? `${data.count} items · updated ${freshnessLabel(data.scannedAt)} · next check ${SCAN_TIME_LABEL}`
    : `Checked every morning at ${SCAN_TIME_LABEL}`;

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
        ) : items.length === 0 ? (
          <div className="cine-glass rounded-2xl p-6 text-sm" style={{ color: 'var(--ink-dim)' }}>
            No updates stored yet — the scan runs every morning at {SCAN_TIME_LABEL}.
          </div>
        ) : (
          <>
            <div className="space-y-10">
              {practical.map((g) => (
                <SourceGroup key={g.sourceName} sourceName={g.sourceName} items={g.items} />
              ))}
            </div>

            {research.length > 0 && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-1 mt-6">
                  <FlaskConical className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <h2 className="font-display font-bold text-xl">Research</h2>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>
                  Raw paper titles straight from arXiv. Heavier going than the news above — worth a
                  look if you want the underlying work.
                </p>
                <div className="space-y-10">
                  {research.map((g) => (
                    <SourceGroup key={g.sourceName} sourceName={g.sourceName} items={g.items} />
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
