'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Egg, Play } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import Capybara from '@/components/capybara';
import { CAPY_VARIANTS, CAPY_VARIANT_IDS } from '@/lib/capybara-variants';
import { EASTER_EGGS, EGG_RARITY } from '@/lib/easter-eggs';

// The key. Two jobs:
//
// 1. Every hidden capybara, where it lives, and the literal steps to make it
//    appear — so an egg stays QA-able and supportable instead of becoming
//    folklore ("someone said there's a capybara somewhere?").
// 2. The art contact sheet, so poses can be reviewed side by side before any of
//    them are wired into a real surface.
//
// Both read straight off lib/easter-eggs.js and lib/capybara-variants.js. There
// is no second copy of the list to drift.

const STATUS_STYLE = {
  live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  planned: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export default function EasterEggsPage() {
  return <CinematicFrame><EasterEggsInner /></CinematicFrame>;
}

function EasterEggsInner() {
  const router = useRouter();
  const { isAdmin, loaded } = useMenuVisibility();
  const [onDark, setOnDark] = useState(false);
  const [zoom, setZoom] = useState(96);

  useEffect(() => {
    if (loaded && !isAdmin) router.replace('/');
  }, [loaded, isAdmin, router]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const liveEggs = EASTER_EGGS.filter((e) => e.status === 'live');
  const plannedEggs = EASTER_EGGS.filter((e) => e.status !== 'live');
  const live = liveEggs.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader
        icon={Egg}
        title="Easter Egg Key"
        subtitle="Every hidden capybara, and exactly how to make it show up"
      />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <Panel
          title="The rule"
          hint="Why these are eggs and not decoration."
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            The app&apos;s look is deliberately restrained, so capybaras stay <strong>rare and earned</strong>:
            milestones, empty states, failure states, and one hidden click. They are kept off the
            calibration gate and the assessment flow on purpose — those are the two places a learner is
            being measured, and a cartoon undercuts them.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <strong>{live} of {EASTER_EGGS.length}</strong> are live. The rest are drawn and specced but not
            yet placed on a surface.
          </p>
        </Panel>

        {/* ── The key itself ───────────────────────────────────────────── */}
        {/* Split by status rather than one flat list: the question this page has
            to answer at a glance is "what is actually in the app right now", and
            a live egg buried among ten planned ones doesn't answer it. */}
        <Panel
          title="Live in the app"
          hint="These are in production. Follow the trigger to see one yourself."
        >
          {liveEggs.length ? (
            <div className="space-y-2">
              {liveEggs.map((egg) => <EggRow key={egg.id} egg={egg} />)}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing placed yet. Everything below is drawn but not wired to a surface.
            </p>
          )}
        </Panel>

        <Panel
          title={`Planned (${plannedEggs.length})`}
          hint="Drawn and specced, not yet wired to a surface."
        >
          <div className="space-y-2">
            {plannedEggs.map((egg) => <EggRow key={egg.id} egg={egg} />)}
          </div>
        </Panel>

        {/* ── Contact sheet ────────────────────────────────────────────── */}
        <Panel
          title="Every pose"
          hint="One drawn component, twelve prop layers. Check them on both backgrounds — the level-up card is always dark navy."
        >
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onDark}
                onChange={(e) => setOnDark(e.target.checked)}
                className="accent-brand"
              />
              Preview on the dark card background
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Size
              <input
                type="range"
                min={24}
                max={160}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32 accent-brand"
              />
              <span className="tabular-nums w-10">{zoom}px</span>
            </label>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 rounded-xl p-4"
            style={onDark ? { background: '#0A2443' } : undefined}
          >
            {CAPY_VARIANT_IDS.map((id) => (
              <div
                key={id}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border ${
                  onDark
                    ? 'border-white/10 bg-white/[.04]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-center" style={{ minHeight: zoom }}>
                  <Capybara variant={id} size={zoom} />
                </div>
                <code className={`text-[10px] font-bold ${onDark ? 'text-cta-300' : 'text-brand-600 dark:text-brand-300'}`}>
                  {id}
                </code>
                <p className={`text-[10px] text-center leading-snug ${onDark ? 'text-white/55' : 'text-slate-500 dark:text-slate-400'}`}>
                  {CAPY_VARIANTS[id].note}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="How to use it in code" hint="One import, one prop.">
          <pre className="text-xs overflow-x-auto p-3 rounded-lg bg-slate-900 text-slate-100">
{`import Capybara from '@/components/capybara';

<Capybara variant="hotspring" size={72} />`}
          </pre>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Adding a pose: add an entry to <code>lib/capybara-variants.js</code> and, if it needs one, a
            prop layer to the <code>PROPS</code> map in <code>components/capybara.jsx</code>. Adding an egg:
            add an entry to <code>lib/easter-eggs.js</code> and flip it to <code>live</code> once it is
            actually placed.
          </p>
        </Panel>
      </main>
    </div>
  );
}

// One egg: the pose it uses, where it lives, and the literal steps to trigger it.
// `tryHref` is only set where an admin harness can play the egg on demand — most
// eggs need a real milestone, and a dead "try it" link is worse than none.
function EggRow({ egg }) {
  const rarity = EGG_RARITY[egg.rarity];
  const isLive = egg.status === 'live';

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        isLive
          ? 'bg-emerald-50/60 dark:bg-emerald-900/15 border-emerald-300 dark:border-emerald-700'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="w-14 h-14 shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
        <Capybara variant={egg.capy} size={52} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-ink dark:text-slate-200">{egg.name}</p>
          <span className={`px-2 py-0.5 rounded-pill text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[egg.status]}`}>
            {egg.status}
          </span>
          <span
            className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200"
            title={rarity?.hint}
          >
            {rarity?.label || egg.rarity}
          </span>
          <code className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{egg.capy}</code>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <strong className="text-slate-600 dark:text-slate-300">Where:</strong> {egg.where}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong className="text-slate-600 dark:text-slate-300">Trigger:</strong> {egg.trigger}
        </p>
        {egg.note && (
          <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">{egg.note}</p>
        )}
        {egg.tryHref && (
          <Link
            href={egg.tryHref}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-brand text-white text-xs font-bold hover:bg-brand-600 transition-colors"
          >
            <Play className="w-3 h-3" />
            {egg.tryLabel || 'See it'}
          </Link>
        )}
      </div>
    </div>
  );
}

function Panel({ title, hint, children }) {
  return (
    <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <h2 className="text-sm font-bold text-ink dark:text-slate-200">{title}</h2>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}
