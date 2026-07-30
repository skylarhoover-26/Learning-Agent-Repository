'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper, Play } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { xpForNextLevel } from '@/lib/level-curve';
import { getLevelTitle } from '@/lib/level-titles';
import { BADGE_META } from '@/lib/badges';
import { itemsUnlockedBetween, nextUnlockAfter } from '@/lib/avatar-catalog';
import LevelUpModal from '@/components/level-up-modal';
import XpBar from '@/components/xp-bar';

// Dev/QA harness for the level-up celebration. Without this, seeing the modal
// costs a real level-up — which past level 5 means grinding hundreds of XP, and
// the interesting cases (a level that unlocks nothing, a two-level jump, level
// 100's seven unlocks) are unreachable by hand.
//
// It builds the SAME result object lib/progression.js emits on an award and
// hands it to the real <LevelUpModal>, so what you tune here is what learners
// get — no separate mock copy of the component to drift out of sync.

// Total XP required to sit exactly at the start of `level`.
function xpAtLevelFloor(level) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpForNextLevel(l);
  return sum;
}

// Cases worth eyeballing, each a reason the modal can look wrong.
const PRESETS = [
  { label: 'LV 2 · first level up', level: 2, jumped: 1, into: 18, streak: 0, badges: ['first_lesson'] },
  { label: 'LV 17 · unlocks nothing', level: 17, jumped: 1, into: 40, streak: 0, badges: [] },
  { label: 'LV 20 · four unlocks', level: 20, jumped: 1, into: 12, streak: 3, badges: [] },
  { label: 'LV 5 · badge + unlock', level: 5, jumped: 1, into: 60, streak: 0, badges: ['level_5'] },
  { label: 'LV 8 · two-level jump', level: 8, jumped: 2, into: 25, streak: 5, badges: ['first_quest'] },
  { label: 'LV 100 · seven unlocks', level: 100, jumped: 1, into: 3, streak: 7, badges: ['level_50'] },
];

const BADGE_IDS = Object.keys(BADGE_META);

export default function LevelUpPreviewPage() {
  return <CinematicFrame><LevelUpPreviewInner /></CinematicFrame>;
}

function LevelUpPreviewInner() {
  const router = useRouter();
  const { isAdmin, loaded } = useMenuVisibility();

  const [level, setLevel] = useState(2);
  const [jumped, setJumped] = useState(1);
  const [into, setInto] = useState(18);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState(['first_lesson']);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (loaded && !isAdmin) router.replace('/');
  }, [loaded, isAdmin, router]);

  // The award result the modal would receive in production. `jumped` is clamped
  // so the "from" level can never fall below 1 (LV 2 can only ever be a 1-level
  // jump), which is exactly the clamp the real curve enforces.
  const result = useMemo(() => {
    const safeJump = Math.min(jumped, level - 1) || 1;
    const fromLevel = Math.max(1, level - safeJump);
    const floor = xpAtLevelFloor(level);
    const totalXp = floor + Math.round((xpForNextLevel(level) * into) / 100);
    // Land the pre-award total mid-way through the level they came from, so the
    // modal derives prevLevel === fromLevel.
    const prevXp = xpAtLevelFloor(fromLevel) + Math.round(xpForNextLevel(fromLevel) / 2);
    return {
      xpAwarded: Math.max(1, totalXp - prevXp),
      totalXp,
      level,
      leveledUp: true,
      streak,
      newBadges: badges,
      source: 'preview',
    };
  }, [level, jumped, into, streak, badges]);

  const safeJump = Math.min(jumped, level - 1) || 1;
  const unlocks = itemsUnlockedBetween(level - safeJump, level);
  const teaser = unlocks.length === 0 && badges.length === 0 ? nextUnlockAfter(level) : null;

  function applyPreset(p) {
    setLevel(p.level);
    setJumped(p.jumped);
    setInto(p.into);
    setStreak(p.streak);
    setBadges(p.badges);
    setShowing(true);
  }

  function toggleBadge(id) {
    setBadges((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={PartyPopper} title="Level Up Preview" subtitle="Tune the celebration without earning it" />

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* ── Presets ──────────────────────────────────────────────────── */}
        <Panel title="Presets" hint="The cases most likely to look wrong.">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-pill text-xs font-semibold bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-900/70 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Panel>

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <Panel title="Build a level-up">
          <div className="space-y-4">
            <Slider
              label="New level"
              value={level}
              min={2}
              max={100}
              onChange={setLevel}
              readout={`LV ${level} · ${getLevelTitle(level)}`}
            />
            <Slider
              label="Levels jumped"
              value={jumped}
              min={1}
              max={3}
              onChange={setJumped}
              readout={safeJump === jumped ? `${jumped}` : `${safeJump} (clamped)`}
            />
            <Slider
              label="Progress into the new level"
              value={into}
              min={0}
              max={95}
              onChange={setInto}
              readout={`${into}%`}
            />
            <Slider
              label="Day streak"
              value={streak}
              min={0}
              max={14}
              onChange={setStreak}
              readout={streak >= 2 ? `${streak} days (row shows)` : `${streak} (no row)`}
            />

            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Badges earned alongside it
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BADGE_IDS.map((id) => {
                  const on = badges.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleBadge(id)}
                      className={`px-2.5 py-1 rounded-pill text-xs font-semibold transition-colors ${
                        on
                          ? 'bg-cta-500 text-ink'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {BADGE_META[id].emoji} {BADGE_META[id].name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        {/* ── What this level-up will contain ─────────────────────────── */}
        <Panel title="What it will show" hint="Read straight off the real catalog — no mock data.">
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <li><strong>Title:</strong> {getLevelTitle(level)}</li>
            <li><strong>XP awarded:</strong> {result.xpAwarded.toLocaleString()} · <strong>total:</strong> {result.totalXp.toLocaleString()}</li>
            <li>
              <strong>Avatar unlocks:</strong>{' '}
              {unlocks.length
                ? `${unlocks.length} — ${unlocks.map((i) => i.name).join(', ')}`
                : 'none at this level'}
            </li>
            <li><strong>Badge rows:</strong> {badges.length || 'none'}</li>
            <li>
              <strong>Teaser:</strong>{' '}
              {teaser ? `next unlock at LV ${teaser.level} (${teaser.items[0]?.name})` : 'not shown'}
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setShowing(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            Play the celebration
          </button>
        </Panel>

        {/* ── The bar itself, at every fill ───────────────────────────── */}
        <Panel title="XP bar fills" hint="The header meter's bar (sm) and the modal's (lg) on the dark bar background.">
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#0A2443' }}>
            {[0, 4, 18, 47, 82, 100].map((pct) => (
              <div key={pct} className="flex items-center gap-3">
                <span className="w-10 text-[11px] font-bold text-white/60 tabular-nums">{pct}%</span>
                <XpBar percent={pct} size="sm" className="w-40" />
                <XpBar percent={pct} size="lg" className="flex-1" />
              </div>
            ))}
          </div>
        </Panel>
      </main>

      {showing && <LevelUpModal result={result} onDismiss={() => setShowing(false)} />}
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

function Slider({ label, value, min, max, onChange, readout }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-ink dark:text-slate-200 tabular-nums">{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </label>
  );
}
