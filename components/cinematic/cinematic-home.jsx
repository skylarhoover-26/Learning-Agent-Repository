'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Menu, Home, Bell, ChevronDown, Sparkles, Flame, Trophy, Award,
  Compass, Gamepad2, MessageCircle, BookOpen, PenTool, ArrowRight,
  Play, Crown,
} from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { useProgression } from '@/components/progression-provider';
import { useSidebar } from '@/components/sidebar';
import { resolveLearnerId } from '@/lib/learner-id';
import { getLevelTitle } from '@/lib/level-titles';

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

// Cinematic shell top bar — logo + the real hamburger (opens the prod menu),
// plus Home / notifications / profile on the right.
function TopNav({ name }) {
  const sidebar = useSidebar();
  return (
    <header className="sticky top-0 z-40 cine-glass" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => sidebar?.toggle?.()}
            aria-label="Open menu"
            className="cine-lift w-10 h-10 rounded-full grid place-items-center"
            style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg,var(--accent),var(--gold))', boxShadow: '0 0 18px -3px var(--accent)' }}>
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-[15px]">AI Learning Coach</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-dim)' }}>By Housecall Pro</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/" className="cine-lift inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold text-sm" style={{ color: 'var(--ink)' }}>
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
          </Link>
          <Link href="/#" className="cine-lift relative w-10 h-10 rounded-full grid place-items-center" style={{ color: 'var(--ink)' }} aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--gold)', boxShadow: '0 0 8px var(--gold)' }} />
          </Link>
          <Link href="/profile" className="cine-lift inline-flex items-center gap-2 h-10 pl-3 pr-2 rounded-full" style={{ color: 'var(--ink)' }}>
            <span className="hidden sm:inline font-semibold text-sm">{name}</span>
            <span className="w-8 h-8 rounded-full grid place-items-center font-display font-bold text-[12px]" style={{ background: 'linear-gradient(135deg,var(--gold),var(--accent))', color: '#0A2443' }}>
              {initials(name)}
            </span>
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
          </Link>
        </div>
      </div>
    </header>
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

  return (
    <div className="cine relative overflow-hidden">
      {/* Drifting ambient blobs */}
      <div className="pointer-events-none absolute -top-24 right-0 w-[480px] h-[480px] rounded-full cine-blob1" style={{ background: 'radial-gradient(circle,rgba(59,148,255,.20),transparent 70%)' }} />
      <div className="pointer-events-none absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full cine-blob2" style={{ background: 'radial-gradient(circle,rgba(255,183,6,.12),transparent 70%)' }} />

      <TopNav name={name} />

      <main className="relative max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* HERO */}
        <section className="cine-rise">
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--good)', boxShadow: '0 0 8px var(--good)' }} />
            {streak}-day streak · {title}
          </span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight">
            Welcome back, <span className="cine-grad-text">{name}</span>
          </h1>
          <p className="mt-3 text-base max-w-2xl" style={{ color: 'var(--ink-dim)' }}>
            You&apos;re Level {level} · {title} with {totalXp.toLocaleString()} XP. Pick up where you left off, or explore something new.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={resumeHref} className="cine-pill cine-lift relative overflow-hidden inline-flex items-center gap-2 h-12 px-6 font-semibold">
              <Play className="w-4 h-4" /> Resume learning
            </Link>
            <Link href="/discover" className="cine-glass cine-lift inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold" style={{ color: 'var(--ink)' }}>
              Explore courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* LEVEL + STATS + LEADERBOARD */}
        <section className="grid lg:grid-cols-3 gap-5">
          {/* Level progress */}
          <div className="lg:col-span-2 cine-glass rounded-3xl p-6 cine-rise">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl grid place-items-center font-display font-extrabold text-2xl" style={{ background: 'linear-gradient(135deg,var(--gold),#ffce4d)', color: '#0A2443', boxShadow: '0 0 24px -6px var(--gold)' }}>
                {level}
                <span className="absolute -bottom-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>LV</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-xl">{title}</p>
                <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>Level {level} · {totalXp.toLocaleString()} XP</p>
              </div>
              <Link href="/achievements" className="text-sm font-semibold cine-lift hidden sm:inline" style={{ color: 'var(--accent2)' }}>
                Achievements →
              </Link>
            </div>
            <div className="mt-5">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--glass)' }}>
                <div className="h-full rounded-full" style={{ width: `${lp.percent || 0}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', boxShadow: '0 0 12px var(--accent)' }} />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
                {lp.xpToNext ? `${lp.xpToNext} XP to Level ${level + 1}` : `You're at the top — keep going!`}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard icon={Flame} value={streak} label="day streak" tint="#FF7A45" />
              <StatCard icon={Sparkles} value={totalXp.toLocaleString()} label="total XP" tint="#3B94FF" />
              <StatCard icon={Award} value={badgeCount} label="badges" tint="#FFB706" />
            </div>
          </div>

          {/* Leaderboard */}
          <div className="cine-glass rounded-3xl p-6 cine-rise">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-bold inline-flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Top learners</p>
              <Link href="/leaderboard" className="text-xs font-semibold cine-lift" style={{ color: 'var(--accent2)' }}>View all →</Link>
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
                    <span className="text-sm font-bold shrink-0">{(p.totalXp || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
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

        <p className="text-center text-xs pb-6" style={{ color: 'var(--ink-dim)' }}>
          Cinematic preview · staging only · wired to your live data
        </p>
      </main>
    </div>
  );
}
