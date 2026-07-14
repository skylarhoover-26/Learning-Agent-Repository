'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Sparkles, Flame, Trophy, Award, Compass, Gamepad2, MessageCircle,
  BookOpen, PenTool, ArrowRight, Play, Crown, Check, RefreshCw,
  TrendingUp, GitBranch, Rss, HelpCircle, X,
} from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { useTodaysPick } from '@/components/use-todays-pick';
import { resolveLearnerId } from '@/lib/learner-id';
import { getLevelTitle } from '@/lib/level-titles';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

// The five "ways to learn" entries, linked to the real routes, each with a tint
// so the cards read as a colorful set (matches the design).
const WAYS = [
  { href: '/games', icon: Gamepad2, label: 'Games', desc: 'Learn by playing fast AI challenges.', tint: '#A06AFF' },
  { href: '/chat', icon: MessageCircle, label: 'Just Chat', desc: 'Ask the coach anything, anytime.', tint: '#3B94FF' },
  { href: '/lesson', icon: BookOpen, label: 'Lesson', desc: 'Guided, immersive deep dives.', tint: '#1AA06A' },
  { href: '/discover', icon: PenTool, label: 'Practice', desc: 'Apply AI to your real work.', tint: '#FFB706' },
  { href: '/daily', icon: RefreshCw, label: "Today's Pick", desc: 'A fresh lesson picked for you.', tint: '#6AABFF' },
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function initials(name) {
  if (!name) return 'YOU';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'YOU';
}

// One row of the "how levels work" popover legend: a mini swatch + label.
function LegendRow({ swatch, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{swatch}</span>
      <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, tint }) {
  return (
    <div className="cine-glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${tint}22`, color: tint }}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="leading-tight">
        <p className="font-display font-extrabold text-xl">{value}</p>
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{label}</p>
      </div>
    </div>
  );
}

// One Strong/Growing/Gaps column of skill pills.
function SkillColumn({ label, count, dot, pills, tint, emptyText }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
        <span className="font-display font-bold text-sm">{label}</span>
        <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>{count}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {pills.length > 0 ? pills.map((s) => (
          <span key={s.name} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: `${tint}1f`, color: tint, border: `1px solid ${tint}33` }}>
            {s.name}
          </span>
        )) : (
          <span className="text-xs italic" style={{ color: 'var(--ink-dim)' }}>{emptyText}</span>
        )}
      </div>
    </div>
  );
}

export default function CinematicHome() {
  const { profile } = useProfile();
  const prog = useProgression();
  const todaysPick = useTodaysPick();
  const [board, setBoard] = useState(null);
  const [skills, setSkills] = useState(null);
  const [news, setNews] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setBoard(d); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // AI news — same source the prod feed reads, rendered as cinematic cards.
  useEffect(() => {
    let active = true;
    fetch('/api/user-data?type=curriculum_findings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setNews((d?.data || []).slice(0, 3)); })
      .catch(() => { if (active) setNews([]); });
    return () => { active = false; };
  }, []);

  // Skills are computed client-side from local progress, the same way the
  // heatmap does it, then bucketed into Strong / Growing / Gaps.
  useEffect(() => {
    if (!prog?.isLoaded) return;
    try {
      setSkills(computeSkills({
        lessonHistory: prog.lessonHistory,
        moduleProgress: getAllModuleProgress(),
        calibrationSkills: getCalibrationSkills(),
      }));
    } catch {
      setSkills([]);
    }
  }, [prog?.isLoaded, prog?.lessonHistory]);

  const name = profile?.display_name || 'there';
  const myId = profile ? resolveLearnerId(profile) : null;
  const lp = prog?.levelProgress || { level: 1, percent: 0, xpToNext: 100 };
  const level = lp.level || prog?.level || 1;
  const title = getLevelTitle(level);
  const totalXp = prog?.totalXp ?? 0;
  const streak = prog?.streak ?? 0;
  const badgeCount = prog?.badgesEarned?.length ?? 0;
  const lastTopic = prog?.lessonHistory?.[0]?.topic || null;
  const resumeHref = lastTopic ? `/lesson?topic=${encodeURIComponent(lastTopic)}` : '/lesson';
  // A topic can be a long sentence — keep the button to one short line.
  const shortTopic = lastTopic && lastTopic.length > 26 ? `${lastTopic.slice(0, 24).trimEnd()}…` : lastTopic;
  const resumeLabel = shortTopic ? `Resume — ${shortTopic}` : 'Resume learning';
  const people = (board?.people || []).slice(0, 5);
  const champ = new Set(board?.championIds || []);
  const firstName = (name || 'there').split(' ')[0];
  // A 5-level "journey" window centered near the current level.
  const journeyStart = Math.max(1, level - 1);
  const journey = [0, 1, 2, 3, 4].map((i) => journeyStart + i);
  // "How levels work" explainer popover. `infoAnchor` holds the viewport coords
  // (from the ? button) so the portal can anchor the popover right next to it;
  // null = closed. `mounted` gates the portal (needs document, client-only).
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const skillGroups = useMemo(() => {
    const s = skills || [];
    return {
      strong: s.filter((x) => x.hasActivity && x.mastery >= 70).slice(0, 4),
      growing: s.filter((x) => x.hasActivity && x.mastery < 70).slice(0, 4),
      gaps: s.filter((x) => !x.hasActivity).slice(0, 4),
    };
  }, [skills]);

  // Which days this week the learner was active (any XP or finished lesson).
  const week = useMemo(() => {
    const activeDays = new Set();
    (prog?.xpEvents || []).forEach((e) => { if (e.created_at) activeDays.add(new Date(e.created_at).toDateString()); });
    (prog?.lessonHistory || []).forEach((l) => { const d = l.completed_at || l.created_at; if (d) activeDays.add(new Date(d).toDateString()); });
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // rewind to Monday
    return WEEKDAYS.map((lbl, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { lbl, active: activeDays.has(d.toDateString()), isToday: d.toDateString() === now.toDateString() };
    });
  }, [prog?.xpEvents, prog?.lessonHistory]);

  return (
    <CinematicShell>
      {/* HERO + LEVEL JOURNEY */}
      <section className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center cine-rise">
        {/* Left: welcome */}
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink-dim)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--good)', boxShadow: '0 0 8px var(--good)' }} />
            {streak}-day streak · {title}
          </span>
          <h1 className="font-display font-extrabold text-5xl sm:text-6xl leading-[1.03] tracking-tight">
            Welcome back,<br /><span className="cine-grad-flow">{firstName}.</span>
          </h1>
          <p className="mt-5 text-lg max-w-md" style={{ color: 'var(--ink-dim)' }}>
            {lp.xpToNext
              ? <>You&apos;re <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{lp.xpToNext} XP</span> from <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Level {level + 1}</span>. One lesson stands between you and your next badge.</>
              : <>You&apos;re at the top level — keep the streak alive.</>}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={resumeHref} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold max-w-full overflow-hidden">
              <span className="truncate">{resumeLabel}</span> <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link href="/discover" className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
              Explore courses
            </Link>
          </div>
        </div>

        {/* Right: level-journey staircase + stat tiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="font-display font-bold">Your level journey</p>
              <button
                onClick={(e) => {
                  if (infoAnchor) { setInfoAnchor(null); return; }
                  const r = e.currentTarget.getBoundingClientRect();
                  setInfoAnchor({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
                }}
                aria-label="How levels work"
                aria-expanded={!!infoAnchor}
                className="cine-lift w-5 h-5 rounded-full grid place-items-center shrink-0"
                style={{ color: 'var(--accent2)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>Level {level} · {title}</span>
          </div>
          {/* Lightweight popover anchored next to the ? button. Rendered via a
              portal to <body> so the cine-rise sections' transforms can't clip
              it; a transparent (undimmed) click-away layer closes it. */}
          {infoAnchor && mounted && createPortal(
            <div className="fixed inset-0 z-[200]" onClick={() => setInfoAnchor(null)}>
              <div
                role="dialog"
                onClick={(e) => e.stopPropagation()}
                className="cine-vars fixed w-[19rem] max-w-[calc(100vw-1rem)] rounded-2xl p-4 origin-top-right"
                style={{ top: infoAnchor.top, right: infoAnchor.right, background: 'var(--navbg)', border: '1px solid var(--line)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', boxShadow: '0 24px 60px -26px rgba(6,20,45,.55)', animation: 'fade-in 0.15s ease-out' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <p className="font-display font-bold text-sm" style={{ color: 'var(--ink)' }}>How your level journey works</p>
                  <button onClick={() => setInfoAnchor(null)} aria-label="Close" className="shrink-0 -mr-1 -mt-1 p-1 rounded-md" style={{ color: 'var(--ink-dim)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--ink-dim)' }}>
                  Each bar is a level. You climb by earning <strong style={{ color: 'var(--ink)' }}>XP</strong> — right now you&apos;re <strong style={{ color: 'var(--ink)' }}>{title}</strong> (Level {level}), {lp.xpToNext ? <>{lp.xpToNext} XP from Level {level + 1}.</> : <>at the top level.</>}
                </p>
                <div className="space-y-2 mb-3">
                  <LegendRow swatch={<span className="w-4 h-4 rounded-md grid place-items-center" style={{ background: 'linear-gradient(180deg,var(--accent),var(--accent2))' }}><Play className="w-2 h-2 text-white" /></span>} label="Where you are now" />
                  <LegendRow swatch={<span className="w-4 h-4 rounded-md grid place-items-center" style={{ border: '1.5px dashed var(--gold)' }}><Sparkles className="w-2 h-2" style={{ color: 'var(--gold)' }} /></span>} label="Your next level — the one to aim for" />
                  <LegendRow swatch={<span className="w-4 h-4 rounded-md grid place-items-center" style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}><Check className="w-2 h-2" style={{ color: 'var(--good)' }} /></span>} label="Levels you've already cleared" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--ink-dim)' }}>Earn XP by</p>
                <ul className="text-xs space-y-1" style={{ color: 'var(--ink-dim)' }}>
                  <li className="flex items-center gap-2"><BookOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--accent2)' }} /> Finishing lessons &amp; Today&apos;s Pick</li>
                  <li className="flex items-center gap-2"><Gamepad2 className="w-3 h-3 shrink-0" style={{ color: 'var(--accent2)' }} /> Playing games &amp; answering quizzes</li>
                  <li className="flex items-center gap-2"><Flame className="w-3 h-3 shrink-0" style={{ color: 'var(--accent2)' }} /> Keeping a daily streak going</li>
                </ul>
              </div>
            </div>,
            document.body,
          )}
          <div className="flex items-end justify-between gap-2 sm:gap-3 h-56">
            {journey.map((lvl, i) => {
              const state = lvl < level ? 'done' : lvl === level ? 'current' : lvl === level + 1 ? 'next' : 'upcoming';
              const h = [46, 60, 74, 87, 100][i];
              const barStyle = state === 'current'
                ? { background: 'linear-gradient(180deg,var(--accent),var(--accent2))', color: '#fff', boxShadow: '0 0 30px -6px var(--accent)' }
                : state === 'done'
                  ? { background: 'var(--glass)', color: 'var(--ink)', border: '1px solid var(--line)' }
                  : state === 'next'
                    ? { background: 'transparent', color: 'var(--gold)', border: '1.5px dashed var(--gold)' }
                    : { background: 'var(--card)', color: 'var(--ink-dim)', border: '1px solid var(--line)' };
              return (
                <div key={lvl} className="relative flex-1 flex flex-col items-center justify-end h-full">
                  {state === 'current' && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10" style={{ bottom: `calc(${h}% + 8px)` }}>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 whitespace-nowrap" style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 12px var(--accent)' }}>YOU&apos;RE HERE</span>
                      <span className="w-7 h-7 rounded-full grid place-items-center font-display font-bold text-[10px]" style={{ background: 'linear-gradient(135deg,var(--gold),var(--accent))', color: '#0A2443' }}>{initials(name)}</span>
                    </div>
                  )}
                  <div className="cine-lift w-full rounded-2xl flex flex-col items-center justify-between py-3" style={{ height: `${h}%`, ...barStyle }}>
                    <span className="font-display font-extrabold text-lg">{lvl}</span>
                    {state === 'done' && <Check className="w-4 h-4" style={{ color: 'var(--good)' }} />}
                    {state === 'current' && <Play className="w-3.5 h-3.5" />}
                    {state === 'next' && <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard icon={Flame} value={streak} label="day streak" tint="#FF7A45" />
            <StatCard icon={Sparkles} value={totalXp.toLocaleString()} label="total XP" tint="#3B94FF" />
            <StatCard icon={Award} value={badgeCount} label="badges" tint="#FFB706" />
          </div>
        </div>
      </section>

      {/* DISCOVER BANNER */}
      <Link href="/discover" className="cine-tilt group block relative overflow-hidden rounded-[28px] p-10 sm:p-14" style={{ background: 'linear-gradient(135deg,#0A3AC8,#2E7BFF)', boxShadow: '0 40px 90px -60px var(--accent)' }}>
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] px-3 py-1 rounded-full mb-5 cine-gold">
          <Compass className="w-3.5 h-3.5" /> Discover
        </span>
        <h2 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight leading-[1.04] text-white max-w-xl">Find AI for your actual work</h2>
        <p className="mt-4 text-lg text-white/80 max-w-lg leading-relaxed">Tell me about your day-to-day and I&apos;ll surface specific AI opportunities you can use today — for your real work, not generic ideas.</p>
        <span className="cine-gold inline-flex items-center gap-2 h-12 px-6 rounded-full font-bold mt-7">
          Discover what AI can do for you <ArrowRight className="w-4 h-4" />
        </span>
      </Link>

      {/* WAYS TO LEARN */}
      <section className="cine-rise">
        <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-7">Ways to learn</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {WAYS.map((w) => (
            <Link key={w.href} href={w.href} className="cine-glass cine-tilt group relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3">
              <span aria-hidden className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70" style={{ background: w.tint }} />
              <span className="w-11 h-11 rounded-xl grid place-items-center relative" style={{ background: `linear-gradient(135deg, ${w.tint}, ${w.tint}99)`, color: '#fff', boxShadow: `0 0 20px -6px ${w.tint}` }}>
                <w.icon className="w-5 h-5" />
              </span>
              <div className="relative">
                <p className="font-display font-bold">{w.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{w.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TODAY'S PICK */}
      <Link href={todaysPick?.href || '/daily'} className="cine-tilt group block cine-glass rounded-3xl p-6 flex items-center gap-5">
        <span className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)', boxShadow: '0 0 24px -6px var(--gold)' }}>
          <Sparkles className="w-7 h-7" style={{ color: '#0A2443' }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>Today&apos;s pick · picked for you</p>
          <p className="font-display font-bold text-lg mt-0.5">{todaysPick?.title || 'Your personalized lesson for today'}</p>
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>{todaysPick?.description || 'A focused lesson aimed at your next skill. Refreshes daily at 8 AM PT.'}</p>
        </div>
        <span className="cine-gold inline-flex items-center gap-2 h-11 px-5 rounded-full font-bold shrink-0">
          {todaysPick?.cta || 'Start'} <ArrowRight className="w-4 h-4" />
        </span>
      </Link>

      {/* YOUR STATS: streak + leaderboard */}
      <section className="cine-rise">
        <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-7">Your stats</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current streak with weekday pills */}
          <div className="cine-glass cine-tilt rounded-3xl p-6">
            <p className="font-display font-bold inline-flex items-center gap-2"><Flame className="w-4 h-4" style={{ color: '#FF7A45' }} /> Current streak</p>
            <p className="font-display font-extrabold text-5xl mt-3">{streak}<span className="text-base font-semibold ml-2" style={{ color: 'var(--ink-dim)' }}>days in a row</span></p>
            <div className="flex items-center gap-1.5 mt-4">
              {week.map((d, i) => (
                <span
                  key={i}
                  className="w-9 h-9 rounded-xl grid place-items-center text-xs font-bold"
                  style={d.active
                    ? { background: 'linear-gradient(135deg,var(--gold),#ffce4d)', color: '#0A2443' }
                    : { background: 'var(--glass)', color: 'var(--ink-dim)', border: d.isToday ? '1.5px dashed var(--gold)' : '1px solid var(--line)' }}
                >
                  {d.lbl}
                </span>
              ))}
            </div>
            <p className="text-sm mt-4" style={{ color: 'var(--ink-dim)' }}>
              {streak > 0 ? "You're on a roll — one lesson today keeps it alive." : 'Start a lesson today to begin a streak.'}
            </p>
          </div>

          {/* Leaderboard */}
          <div className="cine-glass cine-tilt rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-bold inline-flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Top learners</p>
              <Link href="/leaderboard" className="text-xs font-semibold group inline-flex items-center gap-1" style={{ color: 'var(--accent2)' }}>
                View full leaderboard <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {people.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--ink-dim)' }}>Rankings appear as the team earns XP.</p>
            ) : (
              <ul className="space-y-1">
                {people.map((p, i) => (
                  <li key={p.learnerId} className="cine-row flex items-center gap-3 px-2 py-2" style={p.learnerId === myId ? { background: 'rgba(59,148,255,.14)' } : undefined}>
                    <span className="w-6 text-center text-sm font-bold">{MEDAL[i + 1] || i + 1}</span>
                    <span className="w-8 h-8 rounded-full grid place-items-center font-display font-bold text-[11px] shrink-0" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', color: '#0A2443' }}>
                      {initials(p.name)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium flex items-center gap-1.5">
                      {p.name}
                      {champ.has(p.learnerId) && <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gold)' }} />}
                      {p.learnerId === myId && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: 'var(--accent)', color: '#fff' }}>You</span>}
                    </span>
                    <span className="text-sm font-bold shrink-0">{(p.totalXp || 0).toLocaleString()} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* YOUR SKILLS */}
      <section className="cine-rise cine-glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-display font-bold inline-flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: 'var(--accent2)' }} /> Your skills</p>
          <Link href="/heatmap" className="text-xs font-semibold group inline-flex items-center gap-1" style={{ color: 'var(--accent2)' }}>
            <GitBranch className="w-3.5 h-3.5" /> View knowledge heatmap <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {skills === null ? (
          <p className="text-sm italic" style={{ color: 'var(--ink-dim)' }}>Loading your skills…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SkillColumn label="Strong" count={skillGroups.strong.length} dot="#1AA06A" tint="#1AA06A" pills={skillGroups.strong} emptyText="Keep learning to build strong skills" />
            <SkillColumn label="Growing" count={skillGroups.growing.length} dot="#FFB706" tint="#C98A00" pills={skillGroups.growing} emptyText="Try a new topic" />
            <SkillColumn label="Gaps" count={skillGroups.gaps.length} dot="#8A93A6" tint="#8A93A6" pills={skillGroups.gaps} emptyText="No gaps identified" />
          </div>
        )}
      </section>

      {/* AI NEWS */}
      {news !== null && news.length > 0 && (
        <section className="cine-rise">
          <div className="flex items-center gap-2 mb-1">
            <Rss className="w-5 h-5" style={{ color: 'var(--accent2)' }} />
            <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">AI news</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>We scan AI developments daily and flag what changes your skills.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {news.map((f, i) => (
              <Link
                key={f.externalId || i}
                href={`/lesson?prefill=${encodeURIComponent(f.title)}`}
                className="cine-glass cine-tilt group rounded-2xl p-5 flex flex-col"
              >
                <span className="self-start text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3" style={{ background: 'var(--glass)', color: 'var(--accent2)', border: '1px solid var(--line)' }}>
                  {f.sourceName || 'AI update'}
                </span>
                <p className="font-display font-bold leading-snug flex-1">{f.title}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold mt-3" style={{ color: 'var(--good)' }}>
                  <TrendingUp className="w-3.5 h-3.5" /> Take a lesson
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs pb-6" style={{ color: 'var(--ink-dim)' }}>
        Cinematic preview · staging only · wired to your live data
      </p>
    </CinematicShell>
  );
}
