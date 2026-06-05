'use client';

import { CheckCircle, Lightbulb, Volume2, Pause, Square } from 'lucide-react';
import { useTts } from '@/lib/use-tts';

/**
 * Renders a markdown-ish string into React elements.
 * Handles: **bold**, `inline code`, ```code blocks```, bullet/numbered lists.
 */
export function FormattedContent({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto my-3 font-mono"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Bullet list items (- or *)
    if (/^\s*[-*] /.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*] /, ''));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 my-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-brand mt-1.5 text-xs">●</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list items
    if (/^\s*\d+[.)] /.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*\d+[.)] /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+[.)] /, ''));
        i += 1;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 my-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-brand font-semibold min-w-[1.25rem] text-right mt-0.5">
                {idx + 1}.
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<div key={`br-${elements.length}`} className="h-2" />);
      i += 1;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="text-slate-700 dark:text-slate-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i += 1;
  }

  return <div className="space-y-1">{elements}</div>;
}

/** Renders inline markdown: **bold** and `code` */
function renderInline(text) {
  if (!text) return text;

  const parts = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-ink dark:text-slate-200">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="bg-slate-100 dark:bg-slate-700 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const PHASE_LABELS = {
  intro: 'Introduction',
  setup: 'Setup',
  steps: 'Walkthrough',
  verify: 'Verify',
  practice: 'Practice',
  evaluate: 'Evaluate',
  apply: 'Apply',
  complete: 'Complete',
};

function TtsButton({ text }) {
  const { isSpeaking, isPaused, toggle, stop } = useTts();

  const speakableText = [text].flat().filter(Boolean).join('. ');

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => toggle(speakableText)}
        className={`p-1.5 rounded-lg transition-all ${
          isSpeaking && !isPaused
            ? 'bg-brand text-white'
            : 'text-slate-400 hover:text-brand hover:bg-brand-50 dark:hover:bg-brand-900/30'
        }`}
        aria-label={isSpeaking && !isPaused ? 'Pause reading' : isPaused ? 'Resume reading' : 'Read aloud'}
        title={isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Read aloud'}
      >
        {isSpeaking && !isPaused ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
      {(isSpeaking || isPaused) && (
        <button
          onClick={stop}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          aria-label="Stop reading"
          title="Stop"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function SlideCard({ slide, onButtonClick, isLatest }) {
  const { slideTitle, message, keyPoints, phase, buttons } = slide;

  const fullText = [message, ...(keyPoints || [])].filter(Boolean).join('. ');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
      {/* Phase badge + title + TTS */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            {phase && (
              <span className="inline-block text-xs font-medium uppercase tracking-wide text-brand bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-full mb-3">
                {PHASE_LABELS[phase] || phase}
              </span>
            )}
            {slideTitle && (
              <h2 className="text-xl font-bold text-ink dark:text-slate-200">{slideTitle}</h2>
            )}
          </div>
          <TtsButton text={fullText} />
        </div>
      </div>

      {/* Message body */}
      <div className="px-6 pb-4">
        <FormattedContent text={message} />
      </div>

      {/* Key points box */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="mx-6 mb-4 bg-brand-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-brand-700">Key Points</span>
          </div>
          <ul className="space-y-1.5">
            {keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      {isLatest && buttons && buttons.length > 0 && (
        <div className="px-6 pb-6 flex flex-wrap gap-2">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={() => onButtonClick(btn)}
              className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm text-sm"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecapCard({ recap, onPickAnother, onDashboard }) {
  const recapText = [
    'Lesson complete.',
    recap.topic,
    ...(recap.keyPoints || []),
    recap.applyTip ? `Try this next: ${recap.applyTip}` : null,
  ].filter(Boolean).join('. ');

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-card overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex justify-end mb-2">
          <TtsButton text={recapText} />
        </div>
        <div className="text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1">Lesson Complete!</h2>
          {recap.topic && (
            <p className="text-slate-600 dark:text-slate-400">{recap.topic}</p>
          )}
        </div>
      </div>

      {recap.keyPoints && recap.keyPoints.length > 0 && (
        <div className="mx-6 mb-4 bg-white/70 dark:bg-slate-800/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">What you learned</h3>
          <ul className="space-y-1.5">
            {recap.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.applyTip && (
        <div className="mx-6 mb-4 bg-white/70 dark:bg-slate-800/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Try this next</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">{recap.applyTip}</p>
        </div>
      )}

      <div className="px-6 pb-6 flex gap-3 justify-center">
        <button
          onClick={onPickAnother}
          className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-medium transition-all"
        >
          Pick another topic
        </button>
        <button
          onClick={onDashboard}
          className="px-5 py-2.5 rounded-pill bg-cta text-ink font-semibold hover:bg-cta-600 transition-all shadow-sm"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
