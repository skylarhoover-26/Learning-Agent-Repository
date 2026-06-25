'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Clock, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import { QUESTS } from '@/lib/quest-data';
import { sortByDifficulty } from '@/lib/difficulty';
import { useProgression } from '@/components/progression-provider';
import { getLessonHistory } from '@/lib/progression';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import CinematicShell from '@/components/cinematic/cinematic-shell';

const QUEST_MAX_XP = 200;
const norm = (s) => String(s || '').trim().toLowerCase();
function questHref(topic) {
  return `/lesson?format=project_quest&mode=read&topic=${encodeURIComponent(topic)}`;
}

function QuestCard({ quest, completed }) {
  return (
    <Link href={questHref(quest.title)} className="cine-glass cine-lift block rounded-2xl p-6" style={completed ? { borderColor: 'rgba(26,160,106,.4)' } : undefined}>
      <div className="flex items-start gap-4">
        <span className="text-4xl shrink-0">{quest.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-lg">{quest.title}</h3>
            {completed && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--good)' }} />}
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--ink-dim)' }}>{quest.description}</p>
          <div className="flex items-center gap-3 flex-wrap mb-4 text-xs" style={{ color: 'var(--ink-dim)' }}>
            {quest.difficulty && <span className="font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--glass)', border: '1px solid var(--line)' }}>{quest.difficulty}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {quest.duration}</span>
            <span className="inline-flex items-center gap-1"><Trophy className="w-3 h-3" /> Up to {QUEST_MAX_XP} XP</span>
          </div>
          <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm ${completed ? '' : 'cine-gold'}`} style={completed ? { background: 'rgba(26,160,106,.18)', color: 'var(--good)' } : undefined}>
            {completed ? <>Build again <ChevronRight className="w-4 h-4" /></> : <>Start project <ChevronRight className="w-4 h-4" /></>}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CinematicQuests() {
  const router = useRouter();
  const { profile } = useProfile();
  const { xpEvents = [] } = useProgression() || {};
  const [custom, setCustom] = useState('');

  const completedTopics = useMemo(() => {
    try {
      const hist = getLessonHistory(resolveLearnerId(profile)) || [];
      return new Set(hist.filter((l) => l.format === 'project_quest').map((l) => norm(l.topic)));
    } catch { return new Set(); }
  }, [profile]);

  const xpEarned = xpEvents
    .filter((e) => e.source === 'lesson_complete' && e.meta?.format === 'project_quest')
    .reduce((s, e) => s + (e.amount || 0), 0);

  function startCustom() { const t = custom.trim(); if (t) router.push(questHref(t)); }

  return (
    <CinematicShell>
      <section className="cine-rise">
        <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-3 cine-gold"><Trophy className="w-3.5 h-3.5" /> QUESTS</span>
        <h1 className="font-display font-extrabold text-4xl">Project quests</h1>
        <p className="mt-2 text-base" style={{ color: 'var(--ink-dim)' }}>Build something real in 20–60 minutes, guided the whole way.</p>
        <div className="flex gap-4 mt-3 text-sm" style={{ color: 'var(--ink-dim)' }}>
          <span>{completedTopics.size} {completedTopics.size === 1 ? 'project' : 'projects'} completed</span>
          <span>{xpEarned} XP earned</span>
        </div>
      </section>

      <section className="cine-rise cine-glass rounded-2xl p-6">
        <h3 className="text-xs uppercase tracking-wide font-bold mb-3" style={{ color: 'var(--ink-dim)' }}>Build your own project</h3>
        <div className="flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') startCustom(); }}
            placeholder="e.g., 'a weekly report generator for my team'"
            className="flex-1 px-4 py-3 rounded-xl outline-none" style={{ background: 'var(--glass)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          <button onClick={startCustom} disabled={!custom.trim()} className="cine-pill px-5 py-3 font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">
            <Sparkles className="w-4 h-4" /> Build it
          </button>
        </div>
      </section>

      <section className="cine-rise">
        <h3 className="text-xs uppercase tracking-wide font-bold mb-3" style={{ color: 'var(--ink-dim)' }}>Featured projects</h3>
        <div className="space-y-4">
          {sortByDifficulty(QUESTS).map((quest) => (
            <QuestCard key={quest.id} quest={quest} completed={completedTopics.has(norm(quest.title))} />
          ))}
        </div>
      </section>

      <div className="pb-6" />
    </CinematicShell>
  );
}
