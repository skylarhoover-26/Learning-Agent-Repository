'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Flame, Lock, ArrowRight } from 'lucide-react';
import { getLevel, getLevelProgress } from '@/lib/level-curve';
import { getLevelTitle } from '@/lib/level-titles';
import { badgeMeta } from '@/lib/badges';
import { itemsUnlockedBetween, nextUnlockAfter, SLOT_LABELS } from '@/lib/avatar-catalog';
import { useProfile } from '@/components/profile-provider';
import Avatar from '@/components/avatar';
import Capybara from '@/components/capybara';
import ConfettiBurst from '@/components/confetti-burst';
import XpBar from '@/components/xp-bar';

// A level-up is the one moment worth stopping the screen for, so it gets a real
// reveal instead of a line inside the corner XP toast (which is why xp-toast no
// longer renders its own level-up row — see global-xp-popup).
//
// Everything shown here is REAL: the level title comes from lib/level-titles,
// the unlocked items are the avatar-catalog entries actually gated at that
// level, and the badges are the ones just written to the learner's record. No
// invented rewards.

// Cap the list so a big level (100 unlocks 7 items) still fits without a scroll
// fight; the rest is summarized as "+N more".
const MAX_ROWS = 5;

// A 12-point starburst, the shape the level number sits in.
const STAR_CLIP =
  'polygon(50% 0%, 60% 18%, 79% 10%, 79% 30%, 98% 33%, 86% 50%, 98% 67%, 79% 70%, 79% 90%, 60% 82%, 50% 100%, 40% 82%, 21% 90%, 21% 70%, 2% 67%, 14% 50%, 2% 33%, 21% 30%, 21% 10%, 40% 18%)';

// Renders the learner's own avatar wearing the newly unlocked item, so "New Hat"
// shows what it actually looks like on them. `mode: 'cartoon'` forces the drawn
// avatar even for learners using their Slack photo — a photo can't preview a hat.
function UnlockPreview({ item, baseAvatar }) {
  const value = item.slot === 'accessory' ? [item.id] : item.id;
  return (
    <Avatar
      avatar={{ ...(baseAvatar || {}), mode: 'cartoon', [item.slot]: value }}
      size={40}
      title={item.name}
    />
  );
}

function Row({ children, index }) {
  return (
    <div
      className="lu-row flex items-center gap-3 px-3 py-2.5 rounded-2xl"
      style={{
        animationDelay: `${240 + index * 90}ms`,
        background: 'rgba(255,255,255,.06)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.09)',
      }}
    >
      {children}
    </div>
  );
}

export default function LevelUpModal({ result, onDismiss }) {
  const { profile } = useProfile();
  const [closing, setClosing] = useState(false);
  const collectRef = useRef(null);

  const level = Math.max(1, Math.floor(result?.level || 1));
  // The award result carries the new total and the amount just added, so the
  // level they came FROM is derivable — no need to thread prevLevel through
  // every award path in lib/progression.js.
  const prevLevel = getLevel(Math.max(0, (result?.totalXp || 0) - (result?.xpAwarded || 0)));
  const progress = getLevelProgress(result?.totalXp || 0);
  const title = getLevelTitle(level);

  const newItems = itemsUnlockedBetween(prevLevel, level);
  const newBadges = (result?.newBadges || []).map(badgeMeta);
  const teaser = newItems.length === 0 && newBadges.length === 0 ? nextUnlockAfter(level) : null;

  const shownItems = newItems.slice(0, MAX_ROWS);
  const hiddenCount = newItems.length - shownItems.length;

  // ── Easter egg: levelup-badge-holder (see lib/easter-eggs.js) ──────────────
  // Gated on the level having actually unlocked something. A level that unlocks
  // nothing shows the "what's next" teaser instead, and putting a celebrating
  // capybara on that would be celebrating nothing. The gate is also what keeps
  // this earned rather than furniture on every level-up.
  const showCapy = newItems.length > 0 || newBadges.length > 0;
  // A badge is a bigger deal than an avatar item, so it gets the mortarboard.
  const capyVariant = newBadges.length > 0 ? 'graduate' : 'happy';
  const heldBadge = newBadges[0];

  function close() {
    setClosing(true);
    setTimeout(() => onDismiss?.(), 200);
  }

  // Focus the primary action so the modal is dismissible from the keyboard the
  // instant it opens, and close on Escape.
  useEffect(() => {
    collectRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level} reached`}
    >
      {/* Scrim — click anywhere outside the card to collect and move on. */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(3,10,24,.78)', backdropFilter: 'blur(6px)' }}
      />

      <ConfettiBurst count={90} />

      {/* The card stays cinematic navy in BOTH themes on purpose: it's a
          full-screen moment over a dimmed app, and the gold/blue reward palette
          only reads as a reward against dark. */}
      <div
        className="lu-pop relative w-full max-w-[400px] rounded-[28px] px-6 pb-6 pt-8 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #123A6B 0%, #0A2443 42%, #061729 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,198,51,.34), 0 40px 90px -30px rgba(0,0,0,.85)',
        }}
      >
        {/* Soft light spill from the top, behind the starburst. */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,148,255,.42), transparent 68%)' }}
        />

        {/* The capybara leans into the top-left corner, which is dead space
            either side of the starburst. The card's overflow-hidden clips the
            part that hangs past the edge, so it reads as peeking in. Hidden from
            screen readers: the reward list below already announces everything
            this is celebrating, and "capybara graduating" in the middle of it is
            noise. */}
        {showCapy && (
          <div
            className="lu-capy absolute -left-3 top-1 w-[86px] pointer-events-none"
            aria-hidden="true"
          >
            <Capybara variant={capyVariant} size={86} />
            {heldBadge && (
              <span
                className="absolute right-0 bottom-3 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{
                  background: 'linear-gradient(180deg, #FFD666, #FFB706)',
                  boxShadow: '0 4px 10px -3px rgba(0,0,0,.6)',
                }}
              >
                {heldBadge.emoji}
              </span>
            )}
          </div>
        )}

        {/* ── Starburst + level number ─────────────────────────────────── */}
        <div className="relative mx-auto w-[124px] h-[124px] flex items-center justify-center">
          <div
            className="lu-halo absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,198,51,.45), transparent 65%)' }}
          />
          <div
            className="lu-spin absolute inset-0"
            style={{
              clipPath: STAR_CLIP,
              background: 'linear-gradient(140deg, rgba(125,191,255,.55), rgba(255,198,51,.35))',
            }}
          />
          <div
            className="absolute inset-[10px]"
            style={{
              clipPath: STAR_CLIP,
              background: 'linear-gradient(160deg, #3B94FF 0%, #0055FF 55%, #06224a 100%)',
              boxShadow: 'inset 0 2px 10px rgba(255,255,255,.35)',
            }}
          />
          <div className="relative flex flex-col items-center leading-none">
            <span className="text-[9px] font-extrabold tracking-[.22em] text-white/75">LEVEL</span>
            <span className="text-[46px] font-black text-white tabular-nums drop-shadow-[0_3px_6px_rgba(0,0,0,.5)]">
              {level}
            </span>
          </div>
        </div>

        {/* ── Headline + title ─────────────────────────────────────────── */}
        {/* Gradient is inlined with literal colors, NOT the .cine-grad-text
            helper: that class builds its gradient from --accent/--accent2/--gold,
            which are scoped to .cine / .cine-vars in globals.css. This modal
            mounts from GlobalXpPopup in the root layout, outside any .cine
            wrapper, so those vars resolved to nothing while the class's
            -webkit-text-fill-color: transparent still applied — the headline
            rendered completely invisible. Same reason xp-bar.jsx hardcodes its
            colors: this has to work from any page. */}
        <h2
          className="mt-3 text-[26px] font-black tracking-[.06em]"
          style={{
            background: 'linear-gradient(100deg, #3B94FF 0%, #7DBFFF 45%, #FFC633 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          LEVEL UP!
        </h2>
        <p className="mt-1 text-sm text-white/70">
          You&apos;re now a <span className="font-bold text-white">{title}</span>
          {level > prevLevel + 1 && (
            <span className="text-white/50"> · jumped {level - prevLevel} levels</span>
          )}
        </p>

        {/* ── The same bar they watch in the header, now at the new level ── */}
        <div className="mt-5 flex items-center gap-2.5">
          <span className="text-[10px] font-extrabold tracking-[.12em] text-cta-300/90 shrink-0">
            LV {level}
          </span>
          <XpBar percent={progress.percent} size="lg" className="flex-1" sheenKey={progress.totalXp} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-white/55 tabular-nums">
          <span>
            +{(result.xpAwarded || 0).toLocaleString()} XP earned
          </span>
          <span>
            {progress.xpToNext.toLocaleString()} XP to LV {level + 1}
          </span>
        </div>

        {/* ── What you unlocked ────────────────────────────────────────── */}
        <div className="mt-5 pt-4 space-y-2 text-left" style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <div className="flex items-center gap-1.5 pb-0.5 text-[10px] font-extrabold tracking-[.16em] text-cta-300">
            <Sparkles className="w-3 h-3" strokeWidth={3} />
            {teaser ? "WHAT'S NEXT" : 'UNLOCKED'}
          </div>

          {result.streak >= 2 && (
            <Row index={0}>
              <span className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{result.streak} day streak</div>
                <div className="text-xs text-white/55">+10 bonus XP for showing up again.</div>
              </div>
            </Row>
          )}

          {newBadges.map((badge, i) => (
            <Row key={badge.id} index={i + 1}>
              <span className="w-10 h-10 shrink-0 rounded-xl bg-cta-500/15 flex items-center justify-center text-xl">
                {badge.emoji}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{badge.name}</div>
                <div className="text-xs text-white/55">New badge earned.</div>
              </div>
            </Row>
          ))}

          {shownItems.map((item, i) => (
            <Row key={item.id} index={newBadges.length + i + 1}>
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center">
                <UnlockPreview item={item} baseAvatar={profile?.avatar} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{item.name}</div>
                <div className="text-xs text-white/55">
                  New {(SLOT_LABELS[item.slot] || item.slot).toLowerCase()} for your avatar.
                </div>
              </div>
            </Row>
          ))}

          {hiddenCount > 0 && (
            <div className="pl-1 text-xs font-semibold text-white/50">
              +{hiddenCount} more avatar {hiddenCount === 1 ? 'item' : 'items'} unlocked.
            </div>
          )}

          {teaser && (
            <Row index={1}>
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white/60" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {teaser.items[0]?.name}
                  {teaser.items.length > 1 && (
                    <span className="font-semibold text-white/60"> +{teaser.items.length - 1} more</span>
                  )}
                </div>
                <div className="text-xs text-white/55">Unlocks at Level {teaser.level}.</div>
              </div>
            </Row>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <button
          ref={collectRef}
          type="button"
          onClick={close}
          className="mt-5 w-full py-3 rounded-2xl text-[15px] font-extrabold tracking-wide text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-300"
          style={{
            background: 'linear-gradient(180deg, #FFD666, #FFB706)',
            boxShadow: '0 12px 28px -12px rgba(255,183,6,.85), inset 0 -2px 0 rgba(0,0,0,.15)',
          }}
        >
          Collect
        </button>

        {newItems.length > 0 && (
          <Link
            href="/profile"
            onClick={close}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-200 hover:text-white transition-colors"
          >
            Try it on your avatar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
