'use client';

import {
  Target, MessageSquare, BarChart3, Bot, CheckCircle2, MessagesSquare, Mail, Search,
  PenLine, Brain, Rocket, Zap, Lightbulb, BookOpen, Check, ChevronRight, Loader2,
} from 'lucide-react';

// The six personalized topic cards, shared by the Lesson picker and the Games hub so
// the two read as one idea: here is what's worth learning, take it as a lesson or play
// it as a game. Two copies of this markup would have drifted within a week.
//
// Pairs with components/use-suggested-topics.js, which owns the data and the cache.
const TOPIC_ICON = {
  '🎯': Target, '🧵': MessageSquare, '📊': BarChart3, '🤖': Bot, '✅': CheckCircle2,
  '💬': MessagesSquare, '📧': Mail, '✉️': Mail, '🔍': Search, '📝': PenLine,
  '🧠': Brain, '🚀': Rocket, '⚡': Zap, '💡': Lightbulb, '📈': BarChart3, '📚': BookOpen,
};

// Emoji are mapped to line icons rather than rendered directly: emoji render at wildly
// different sizes and weights across platforms, and six of them in a grid looked like
// six different design systems.
export function TopicIcon({ emoji }) {
  const Ic = TOPIC_ICON[emoji] || Lightbulb;
  return <Ic className="w-5 h-5" style={{ color: 'var(--accent2)' }} />;
}

const TOPIC_TONES = [
  { ring: 'ring-blue-400 dark:ring-blue-500', glow: 'rgba(59,130,246,0.5)', solid: '#3B82F6', tile: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', badge: 'bg-blue-500', chevron: 'text-blue-400' },
  { ring: 'ring-teal-400 dark:ring-teal-500', glow: 'rgba(20,184,166,0.5)', solid: '#14B8A6', tile: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800', badge: 'bg-teal-500', chevron: 'text-teal-400' },
  { ring: 'ring-violet-400 dark:ring-violet-500', glow: 'rgba(139,92,246,0.5)', solid: '#8B5CF6', tile: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800', badge: 'bg-violet-500', chevron: 'text-violet-400' },
  { ring: 'ring-amber-400 dark:ring-amber-500', glow: 'rgba(245,158,11,0.5)', solid: '#F59E0B', tile: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', badge: 'bg-amber-500', chevron: 'text-amber-400' },
  { ring: 'ring-rose-400 dark:ring-rose-500', glow: 'rgba(244,63,94,0.5)', solid: '#F43F5E', tile: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800', badge: 'bg-rose-500', chevron: 'text-rose-400' },
  { ring: 'ring-emerald-400 dark:ring-emerald-500', glow: 'rgba(16,185,129,0.5)', solid: '#10B981', tile: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', badge: 'bg-emerald-500', chevron: 'text-emerald-400' },
];

// Skeletons rather than the generic fallback while a list generates: those fallback
// topics are real and clickable, so showing them mid-generation offers choices that
// are about to be replaced.
export function TopicGridSkeleton({ count = 6, note }) {
  return (
    <>
      {note && (
        <p aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {note}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 cine-glass rounded-2xl animate-pulse">
            <span className="shrink-0 w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-700/60" />
              <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-700/60" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * @param {object}   props
 * @param {Array}    props.topics    [{ emoji, label, topic }]
 * @param {string}   props.selected  the selected `topic` string
 * @param {Function} props.onSelect  called with the topic object
 */
export default function TopicCardGrid({ topics, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {topics.map((s, i) => {
        const isSelected = selected === s.topic;
        const tone = TOPIC_TONES[i % TOPIC_TONES.length];
        return (
          <button
            key={s.topic || i}
            onClick={() => onSelect(s)}
            aria-pressed={isSelected}
            className={`group relative overflow-hidden flex items-start gap-3 p-4 cine-glass cine-tilt rounded-2xl transition-all text-left ${
              isSelected ? `ring-2 ${tone.ring}` : ''
            }`}
            // --tilt-accent gets the SOLID colour, not `glow`. cine-tilt's hover rule
            // mixes it at 38%, and `glow` is already rgba(...,0.5), so passing that
            // gave ~19% — visibly fainter than Achievements, whose tints are solid
            // hex. `glow` keeps its alpha for the selected box-shadow, where the
            // softness is wanted.
            style={isSelected
              ? { boxShadow: `0 0 34px -6px ${tone.glow}`, '--tilt-accent': tone.solid }
              : { '--tilt-accent': tone.solid }}
          >
            {isSelected && (
              <span aria-hidden className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: tone.glow }} />
            )}
            <span className={`relative shrink-0 w-11 h-11 rounded-xl grid place-items-center border ${tone.tile}`}>
              <TopicIcon emoji={s.emoji} />
            </span>
            <div className="relative flex-1">
              <div className="font-medium text-slate-800 dark:text-slate-200 mb-0.5">{s.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.topic}</div>
            </div>
            {isSelected
              ? <span className={`relative self-center inline-flex items-center justify-center w-6 h-6 rounded-full text-white shadow-sm ${tone.badge}`}><Check className="w-4 h-4" /></span>
              : <ChevronRight className={`relative self-center w-5 h-5 ${tone.chevron} opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />}
          </button>
        );
      })}
    </div>
  );
}
