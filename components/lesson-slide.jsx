'use client';

import { CheckCircle, Lightbulb } from 'lucide-react';

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
            <li key={idx} className="flex items-start gap-2 text-slate-700">
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
            <li key={idx} className="flex items-start gap-2 text-slate-700">
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
      <p key={`p-${elements.length}`} className="text-slate-700 leading-relaxed">
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
        <strong key={`b-${match.index}`} className="font-semibold text-ink">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="bg-slate-100 text-brand-700 px-1.5 py-0.5 rounded text-sm font-mono"
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

export function SlideCard({ slide, onButtonClick, isLatest }) {
  const { slideTitle, message, keyPoints, phase, buttons } = slide;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Phase badge + title */}
      <div className="px-6 pt-6 pb-4">
        {phase && (
          <span className="inline-block text-xs font-medium uppercase tracking-wide text-brand bg-brand-50 px-2.5 py-1 rounded-full mb-3">
            {PHASE_LABELS[phase] || phase}
          </span>
        )}
        {slideTitle && (
          <h2 className="text-xl font-bold text-ink">{slideTitle}</h2>
        )}
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
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
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
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl border border-emerald-200 shadow-card overflow-hidden">
      <div className="px-6 pt-6 pb-4 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-ink mb-1">Lesson Complete!</h2>
        {recap.topic && (
          <p className="text-slate-600">{recap.topic}</p>
        )}
      </div>

      {recap.keyPoints && recap.keyPoints.length > 0 && (
        <div className="mx-6 mb-4 bg-white/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 mb-2">What you learned</h3>
          <ul className="space-y-1.5">
            {recap.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.applyTip && (
        <div className="mx-6 mb-4 bg-white/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 mb-1">Try this next</h3>
          <p className="text-sm text-slate-700">{recap.applyTip}</p>
        </div>
      )}

      <div className="px-6 pb-6 flex gap-3 justify-center">
        <button
          onClick={onPickAnother}
          className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium transition-all"
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
