'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Zap, BookOpen, Bookmark, PenTool, PlayCircle, X } from 'lucide-react';

const DEPTHS = [
  { key: 'quick_tip', icon: Zap, label: 'Quick Tip', time: '60 seconds', desc: 'A single insight.' },
  { key: 'standard', icon: BookOpen, label: 'Quick Lesson', time: '3–5 min', desc: 'Hands-on, one exercise.' },
  { key: 'deep_dive', icon: Bookmark, label: 'Deep Dive', time: '15–20 min', desc: 'Thorough, multiple exercises.' },
];

const MODES = [
  { key: 'read', icon: PenTool, label: 'Read & practice', desc: 'Work through it step by step.' },
  { key: 'watch', icon: PlayCircle, label: 'Watch (narrated)', desc: 'A narrated video walkthrough.' },
];

// Inline, conversational mini-wizard offered after a chat answer:
// offer -> depth -> mode -> launch the lesson on the detected topic.
export default function ChatLessonOffer({ topic }) {
  const router = useRouter();
  const [step, setStep] = useState('offer'); // offer | depth | mode | dismissed
  const [format, setFormat] = useState(null);

  if (step === 'dismissed') return null;

  function launch(mode) {
    const params = new URLSearchParams({ topic, format: format || 'standard', mode });
    router.push(`/lesson?${params.toString()}`);
  }

  return (
    <div className="mt-2 w-full max-w-[85%] rounded-2xl border border-brand-200 dark:border-slate-600 bg-brand-50/60 dark:bg-slate-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-brand dark:text-brand-200">
          <GraduationCap className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">
            {step === 'offer' && <>Since you’re asking about “{topic},” want to take a lesson on it now?</>}
            {step === 'depth' && <>Great! How deep do you want to go?</>}
            {step === 'mode' && <>And how do you want to learn?</>}
          </p>
        </div>
        <button
          onClick={() => setStep('dismissed')}
          className="p-1 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {step === 'offer' && (
        <>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 ml-7">
            I just have a couple quick questions to customize it for you.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 ml-7">
            <button
              onClick={() => setStep('depth')}
              className="px-4 py-2 text-sm font-semibold rounded-pill bg-brand text-white hover:bg-brand-700 transition-all"
            >
              Yes, let’s do it
            </button>
            <button
              onClick={() => setStep('dismissed')}
              className="px-4 py-2 text-sm font-medium rounded-pill bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
            >
              No thanks
            </button>
          </div>
        </>
      )}

      {step === 'depth' && (
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          {DEPTHS.map(d => (
            <button
              key={d.key}
              onClick={() => { setFormat(d.key); setStep('mode'); }}
              className="text-left p-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-600 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <d.icon className="w-4 h-4 text-brand" />
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.time}</span>
              </div>
              <p className="text-sm font-semibold text-ink dark:text-slate-200">{d.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === 'mode' && (
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => launch(m.key)}
              className="text-left p-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-600 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <m.icon className="w-4 h-4 text-brand" />
                <p className="text-sm font-semibold text-ink dark:text-slate-200">{m.label}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
