'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Search, Swords, Users, ChevronDown, ArrowRight, Sparkles, Wand2, LayoutGrid,
} from 'lucide-react';

// The game types that can be generated from a custom topic, listed
// alphabetically. Jeopardy is live; the rest still preview the flow. AI or
// Human? needs genuine human-written samples, so it can't be generated per
// topic — shown disabled so the picker explains why rather than hiding it.
const GAME_TYPES = [
  { id: 'aihuman', title: 'AI or Human?', tint: '#8A93A6', disabled: true,
    desc: 'Needs real human writing — not available for custom topics.', icon: Users },
  { id: 'halluc', title: 'Hallucination Hunt', tint: '#B4531F', diff: 'Medium', diffTint: '#C98A00',
    desc: 'Spot the planted factual errors in an AI answer.', icon: Search },
  { id: 'jeopardy', title: 'Jeopardy', tint: '#0055FF', diff: 'Medium', diffTint: '#C98A00', live: true,
    desc: 'A 5-category board of AI clues — answer in the form of a question.', icon: LayoutGrid },
  { id: 'prompt', title: 'Prompt Battle', tint: '#A06AFF', diff: 'Hard', diffTint: '#B4531F',
    desc: 'Write the sharpest prompt for a scenario in your topic.', icon: Swords },
  { id: 'speed', title: 'Speed Round', tint: '#3B94FF', diff: 'Easy', diffTint: '#1AA06A',
    desc: 'Rapid-fire questions on your topic — beat the clock.', icon: Zap },
];

const SAMPLES = [
  'using AI to draft customer follow-up emails',
  'spotting AI hallucinations in a pricing quote',
  'prompt patterns for summarizing long call notes',
  'evaluating AI output for a dispatch schedule',
  'writing better prompts for invoice descriptions',
];

// Admin-gated preview of the "generate your own game" flow. The generation
// backend isn't wired yet, so "Generate game" shows a preview of what would
// launch — this is here to iterate on the flow in the real app.
export default function GenerateYourOwnGame() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState('');
  const [launched, setLaunched] = useState(null);
  const [sampleIdx, setSampleIdx] = useState(0);
  const ddRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e) { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const canGenerate = selected && topic.trim();

  function pick(g) { setSelected(g); setOpen(false); }
  function surprise() {
    setTopic(SAMPLES[sampleIdx % SAMPLES.length]);
    setSampleIdx((i) => i + 1);
    if (!selected) setSelected(GAME_TYPES.find((g) => !g.disabled));
  }
  function generate() {
    if (!canGenerate) return;
    // Jeopardy is wired for real — generate + launch the board. Others still
    // preview the flow until their generators are built.
    if (selected.live && selected.id === 'jeopardy') {
      router.push(`/games/jeopardy?topic=${encodeURIComponent(topic.trim())}`);
      return;
    }
    setLaunched({ game: selected, topic: topic.trim() });
  }

  const SelIcon = selected?.icon;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-1.5">
        <Wand2 className="w-5 h-5" style={{ color: 'var(--accent2)' }} />
        <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-ink dark:text-slate-100">Generate your own game</h2>
        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)', border: '1px solid var(--line)' }}>
          Admin preview
        </span>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>
        Pick a game type, then give it any topic — your coach builds a custom round just for you.
      </p>

      <div className="cine-glass rounded-3xl p-6 sm:p-7">
        {/* Step 1 — pick a game */}
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>1</span>
          Pick a game
        </p>
        <div className="relative" ref={ddRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="cine-lift w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left"
            style={{ background: 'var(--card)', border: `1px solid ${open ? 'var(--accent)' : 'var(--line)'}` }}
          >
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={selected ? { background: `linear-gradient(135deg, ${selected.tint}, ${selected.tint}bb)`, color: '#fff' } : { background: 'var(--line)', color: 'var(--ink-dim)' }}>
              {SelIcon ? <SelIcon className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-ink dark:text-slate-100" style={!selected ? { color: 'var(--ink-dim)' } : undefined}>
                {selected ? selected.title : 'Choose a game…'}
              </span>
              {selected && <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--ink-dim)' }}>{selected.desc}</span>}
            </span>
            <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--ink-dim)' }} />
          </button>

          {open && (
            <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl p-1.5 cine-glass" style={{ boxShadow: '0 30px 70px -34px rgba(10,36,67,.5)' }}>
              {GAME_TYPES.map((g) => (
                <button
                  key={g.id}
                  role="option"
                  aria-selected={selected?.id === g.id}
                  disabled={g.disabled}
                  onClick={() => !g.disabled && pick(g)}
                  className="w-full flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: selected?.id === g.id ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    opacity: g.disabled ? 0.55 : 1,
                  }}
                >
                  <span className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={g.disabled ? { background: 'var(--line)', color: 'var(--ink-dim)' } : { background: `linear-gradient(135deg, ${g.tint}, ${g.tint}bb)`, color: '#fff' }}>
                    <g.icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm text-ink dark:text-slate-100">{g.title}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{g.desc}</span>
                  </span>
                  {g.disabled ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0" style={{ background: 'var(--line)', color: 'var(--ink-dim)' }}>Soon</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${g.diffTint}22`, color: g.diffTint }}>{g.diff}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 — your topic */}
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mt-6 mb-3" style={{ color: 'var(--ink-dim)' }}>
          <span className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'var(--accent)', color: '#fff' }}>2</span>
          Your topic
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canGenerate) generate(); }}
            placeholder="e.g., 'using AI for scheduling dispatches'"
            className="flex-1 min-w-0 rounded-xl px-4 py-3.5 text-sm text-ink dark:text-slate-100 bg-transparent outline-none focus:ring-4"
            style={{ border: '1px solid var(--line-strong, var(--line))', '--tw-ring-color': 'color-mix(in srgb, var(--accent) 18%, transparent)' }}
          />
          <button
            onClick={generate}
            disabled={!canGenerate}
            className="cine-pill cine-lift inline-flex items-center justify-center gap-2 h-13 px-6 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ height: 52 }}
          >
            Generate game <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button onClick={surprise} className="cine-gold cine-lift inline-flex items-center gap-2 h-11 px-5 rounded-full font-semibold text-sm mt-3.5">
          <Sparkles className="w-4 h-4" /> Surprise me
        </button>
        <p className="text-xs mt-4" style={{ color: 'var(--ink-dim)' }}>
          Custom rounds are for practice — they don&rsquo;t count toward the daily leaderboard.
        </p>
      </div>

      {/* Launch preview (mock — generation not wired yet) */}
      {launched && (
        <div className="cine-rise mt-5 rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent2) 6%, transparent))', border: '1px solid var(--line)' }}>
          <span className="w-13 h-13 rounded-2xl grid place-items-center shrink-0" style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${launched.game.tint}, ${launched.game.tint}bb)`, color: '#fff' }}>
            <launched.game.icon className="w-6 h-6" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Would launch</p>
            <p className="font-semibold text-ink dark:text-slate-100 mt-0.5">
              {launched.game.title}: <span style={{ color: 'var(--accent)' }}>&ldquo;{launched.topic}&rdquo;</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>Generation isn&rsquo;t wired yet — this preview confirms the flow.</p>
          </div>
        </div>
      )}
    </section>
  );
}
