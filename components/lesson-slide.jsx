'use client';

import { useState } from 'react';
import { CheckCircle, Lightbulb, Volume2, Pause, Square, Loader2, Copy, Check } from 'lucide-react';
import { useTts } from '@/lib/use-tts';
import MermaidDiagram from '@/components/mermaid-diagram';

/**
 * A fenced code block with a copy-to-clipboard button. Used for prompts and
 * snippets in chat and lessons so people can grab the text in one tap.
 */
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; nothing else to do */
    }
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden bg-slate-900">
      {/* Copy lives in a header bar so it never overlaps long code lines. */}
      <div className="flex justify-end px-2 py-1.5 border-b border-slate-700/60">
        <button
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>
      <pre className="text-slate-100 px-4 py-3 text-sm overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Renders a markdown-ish string into React elements.
 * Handles: **bold**, `inline code`, ```code blocks```, bullet/numbered lists.
 */
export function FormattedContent({ text }) {
  if (!text) return null;

  const lines = normaliseToMarkdown(text).split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block (```mermaid renders as a diagram; everything else as code)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim().toLowerCase();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      if (lang === 'mermaid') {
        elements.push(
          <MermaidDiagram key={`mermaid-${elements.length}`} code={codeLines.join('\n')} />
        );
      } else {
        elements.push(
          <CodeBlock key={`code-${elements.length}`} code={codeLines.join('\n')} />
        );
      }
      continue;
    }

    // Markdown table: a header row of pipes followed by a |---|---| separator
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[-:\s|]+\|\s*$/.test(lines[i + 1])) {
      const parseRow = (row) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const headers = parseRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i += 1;
      }
      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <thead>
              <tr className="bg-brand-50 dark:bg-slate-700/50">
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left font-semibold text-ink dark:text-slate-200 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="even:bg-slate-50 dark:even:bg-slate-800/40">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

    // Numbered list items — preserve the author's actual number so that steps
    // split across separate blocks still read 1, 2, 3 (not 1, 1, 1).
    if (/^\s*\d+[.)] /.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*\d+[.)] /.test(lines[i])) {
        const m = lines[i].match(/^\s*(\d+)[.)] /);
        listItems.push({ num: m ? m[1] : null, text: lines[i].replace(/^\s*\d+[.)] /, '') });
        i += 1;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className="space-y-1.5 my-3">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <span className="text-brand font-semibold min-w-[1.25rem] text-right mt-0.5">
                {item.num ?? idx + 1}.
              </span>
              <span>{renderInline(item.text)}</span>
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

/**
 * Normalise text so downstream rendering only needs to handle markdown.
 * Converts HTML bold / italic / line-break tags into their markdown equivalents
 * and strips any remaining HTML tags so nothing shows as raw markup.
 */
function normaliseToMarkdown(text) {
  if (!text) return text;

  let out = text;

  // Bold: <strong>, <b> (with optional attributes)
  out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

  // Italic: <em>, <i>
  out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  out = out.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Inline code: <code>
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Line breaks → newlines (so FormattedContent handles them as paragraph breaks)
  out = out.replace(/<br\s*\/?>/gi, '\n');

  // Paragraph tags → double newline
  out = out.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  out = out.replace(/<\/?p[^>]*>/gi, '\n');

  // Strip any remaining HTML tags (anchors, spans, divs, etc.)
  out = out.replace(/<[^>]+>/g, '');

  // Collapse runs of 3+ newlines into 2
  out = out.replace(/\n{3,}/g, '\n\n');

  return out;
}

/** Renders inline markdown: **bold**, *italic*, and `code` */
function renderInline(text) {
  if (!text) return text;

  const parts = [];
  // Match **bold**, *italic* (but not **), and `code`
  const regex = /(\*\*(.+?)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-ink dark:text-slate-200">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={`i-${match.index}`} className="italic text-slate-700 dark:text-slate-300">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <code
          key={`c-${match.index}`}
          className="bg-slate-100 dark:bg-slate-700 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {match[4]}
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
  concepts: 'Key Concepts',
  setup: 'Setup',
  steps: 'Walkthrough',
  verify: 'Verify',
  practice: 'Practice',
  evaluate: 'Evaluate',
  apply: 'Apply',
  complete: 'Complete',
};

function TtsButton({ text }) {
  const { isSpeaking, isPaused, isLoading, error, toggle, stop } = useTts();

  const speakableText = [text].flat().filter(Boolean).join('. ');

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggle(speakableText)}
        disabled={isLoading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isLoading
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-wait'
            : isSpeaking && !isPaused
              ? 'bg-brand text-white shadow-sm'
              : 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50'
        }`}
        aria-label={isLoading ? 'Generating audio...' : isSpeaking && !isPaused ? 'Pause reading' : isPaused ? 'Resume reading' : 'Read aloud'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSpeaking && !isPaused ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        <span>{isLoading ? 'Loading...' : isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Listen'}</span>
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

export function SlideCard({ slide }) {
  const { slideTitle, message, keyPoints, phase } = slide;

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
        <div className="mx-6 mb-4 bg-brand-50 dark:bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-brand" />
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">Key Points</span>
          </div>
          <ul className="space-y-1.5">
            {keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <CheckCircle className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <span>{renderInline(normaliseToMarkdown(point))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No action buttons — the learner advances and engages through the chat
          bar below, which is prefilled with the suggested next step. */}
      <div className="pb-2" />
    </div>
  );
}

export function RecapCard({ recap, format, onPickAnother, onDashboard }) {
  // Quick Tips already show Key Points on the tip slide, so the recap's
  // "What you learned" list is redundant — keep the recap lean for them.
  const showLearned = format !== 'quick_tip';
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

      {showLearned && recap.keyPoints && recap.keyPoints.length > 0 && (
        <div className="mx-6 mb-4 bg-white/70 dark:bg-slate-800/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">What you learned</h3>
          <ul className="space-y-1.5">
            {recap.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>{renderInline(normaliseToMarkdown(point))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.applyTip && (
        <div className="mx-6 mb-4 bg-white/70 dark:bg-slate-800/70 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Try this next</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">{renderInline(normaliseToMarkdown(recap.applyTip))}</p>
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
