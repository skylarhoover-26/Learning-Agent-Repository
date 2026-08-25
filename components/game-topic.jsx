'use client';

import { Tag } from 'lucide-react';

// The topic used to sit above the question as a letterspaced all-caps eyebrow in the
// accent colour ("LILY LEAP · <topic>"). That reads fine for a two-word topic and
// badly for the real thing: topics arrive as a whole sentence from a lesson or quest,
// so it became four lines of blue capitals shouting over the actual question.
//
// Same card chrome as "How to play" (components/game-instructions.jsx) so the play
// screen reads as a stack of sections, in sentence case and ink rather than accent.
export default function GameTopic({ topic, className = '' }) {
  if (!topic) return null;
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-start gap-2">
        <Tag className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink dark:text-slate-200">Topic</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink dark:text-slate-300">{topic}</p>
        </div>
      </div>
    </div>
  );
}
