'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Flame, Trophy, Award, Compass, Gamepad2, MessageCircle,
  BookOpen, PenTool, ArrowRight, Play, Crown, Check,
} from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { getLevelTitle } from '@/lib/level-titles';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

// The five "other ways to learn" entries, linked to the real routes.
const WAYS = [
  { href: '/games', icon: Gamepad2, label: 'Games', desc: 'Learn through quick games' },
  { href: '/chat', icon: MessageCircle, label: 'Just Chat', desc: 'Ask anything about AI' },
  { href: '/lesson', icon: BookOpen, label: 'Lesson', desc: 'A guided, hands-on lesson' },
  { href: '/structured-lesson', icon: PenTool, label: 'Practice', desc: 'Exercises with feedback' },
  { href: '/prompts', icon: Sparkles, label: 'Prompts', desc: 'Ready-to-use prompts' },
];

function initials(name) {
  if (!name) return 'YOU';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'YOU';
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

export default function CinematicHome() {
  const { profile } = useProfile();
  const prog = useProgression();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setBoard(d); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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
  const people = (board?.people || []).slice(0, 5);
  const champ = new Set(board?.championIds || []);
  const firstName = (name || 'there').split(' ')[0];
  // A 5-level "journey" window centered near the current level.
  const journeyStart = Math.max(1, level - 1);
  const journey = [0, 1, 2, 3, 4].map((i) => journeyStart + i);

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
            Welcome back,<br /><span className="cine-grad-text">{firstName}.</span>
          </h1>
          <p className="mt-5 text-lg max-w-md" style={{ color: 'var(--ink-dim)' }}>
            {lp.xpToNext
              ? <>You&apos;re <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{lp.xpToNext} XP</span> from <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Level {level + 1}</span>. One lesson stands between you and your next badge.</>
              : <>You&apos;re at the top level — keep the streak alive.</>}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={resumeHref} className="cine-pill cine-lift inline-flex items-center gap-2 h-12 px-6 font-semibold">
              Resume{lastTopic ? ` — ${lastTopic}` : ' learning'} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/discover" className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
              Explore courses
            </Link>
          </div>
        </div>

        {/* Right: level-journey staircase + stat tiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold">Your level journey</p>
            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>Level {level} · next is {level + 1}</span>
          </div>
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
                    <div className="absolute top-0 flex flex-col items-center" style={{ transform: 'translateY(-110%)' }}>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 whitespace-nowrap" style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 12px var(--accent)' }}>YOU&apos;RE HERE</span>
                      <span className="w-7 h-7 rounded-full grid place-items-center font-display font-bold text-[10px]" style={{ background: 'linear-gradient(135deg,var(--gold),var(--accent))', color: '#0A2443' }}>{initials(name)}</span>
                    </div>
                  )}
                  <div className="w-full rounded-2xl flex flex-col items-center justify-between py-3 transition-all" style={{ height: `${h}%`, ...barStyle }}>
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
      <section className="cine-rise relative overflow-hidden rounded-3xl p-8" style={{ background: 'linear-gradient(120deg,#0B49C9,#0055FF 55%,#1C6BFF)', boxShadow: '0 40px 90px -50px var(--accent)' }}>
        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-3 cine-gold">
          <Compass className="w-3.5 h-3.5" /> DISCOVER
        </span>
        <h2 className="font-display font-extrabold text-3xl text-white max-w-xl">Find AI for your actual work</h2>
        <p className="mt-2 text-white/80 max-w-xl">Tell me about your day-to-day and I&apos;ll surface specific AI opportunities you can use today — for your real work, not generic ideas.</p>
        <Link href="/discover" className="cine-gold cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-bold mt-5">
          Discover what AI can do for you <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* WAYS TO LEARN */}
      <section className="cine-rise">
        <h3 className="font-display font-bold text-lg mb-4">Other ways to learn</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {WAYS.map((w) => (
            <Link key={w.href} href={w.href} className="cine-glass cine-lift rounded-2xl p-5 flex flex-col gap-3">
              <span className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: 'var(--glass)', color: 'var(--accent2)' }}>
                <w.icon className="w-5 h-5" />
              </span>
              <div>
                <p className="font-display font-bold">{w.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{w.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TODAY'S PICK */}
      <section className="cine-rise cine-glass rounded-3xl p-6 flex items-center gap-5">
        <span className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)', boxShadow: '0 0 24px -6px var(--gold)' }}>
          <Sparkles className="w-7 h-7" style={{ color: '#0A2443' }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>Today&apos;s pick · picked for you</p>
          <p className="font-display font-bold text-lg mt-0.5">Your personalized lesson for today</p>
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>A focused lesson aimed at your next skill.</p>
        </div>
        <Link href="/daily" className="cine-gold cine-lift inline-flex items-center gap-2 h-11 px-5 rounded-full font-bold shrink-0">
          Start <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* LEADERBOARD */}
      <section className="cine-rise cine-glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold inline-flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Top learners</p>
          <Link href="/leaderboard" className="text-xs font-semibold cine-lift" style={{ color: 'var(--accent2)' }}>View full leaderboard →</Link>
        </div>
        {people.length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--ink-dim)' }}>Rankings appear as the team earns XP.</p>
        ) : (
          <ul className="space-y-1.5">
            {people.map((p, i) => (
              <li key={p.learnerId} className="flex items-center gap-3 rounded-xl px-2 py-1.5" style={p.learnerId === myId ? { background: 'rgba(59,148,255,.14)' } : undefined}>
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
      </section>

      <p className="text-center text-xs pb-6" style={{ color: 'var(--ink-dim)' }}>
        Cinematic preview · staging only · wired to your live data
      </p>
    </CinematicShell>
  );
}
