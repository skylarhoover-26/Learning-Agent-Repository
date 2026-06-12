'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircleQuestion, X, Send, Loader2, ExternalLink } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';

const GREETING = 'Thanks for checking in! I can answer questions about the AI Learning Coach. How can I help?';

const SLACK_CHANNELS = [
  { label: 'HCP Skill Shop Help', href: 'https://housecall.slack.com/archives/C04BU29V4TH' },
  { label: 'HCP MX Skill Shop Help', href: 'https://housecall.slack.com/archives/C04J8BRUJQY' },
];

export default function HelpWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // real convo (greeting is UI-only)
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  // Redundant on the dedicated chat page.
  if (pathname?.startsWith('/chat')) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. You can reach the team in Slack using the links below.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-pill bg-brand text-white shadow-card hover:bg-brand-700 hover:shadow-card-hover transition-all"
        aria-label="Open help chat"
      >
        <MessageCircleQuestion className="w-5 h-5" />
        <span className="text-sm font-semibold">Questions? Chat here</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-9rem)] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink text-white shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5" />
          <span className="text-sm font-semibold">Help</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-white/10" aria-label="Close help chat">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div className="max-w-[90%] rounded-2xl px-3 py-2 bg-white dark:bg-slate-700 text-ink dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-sm">
          {GREETING}
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-white dark:bg-slate-700 text-ink dark:text-slate-200 border border-slate-200 dark:border-slate-600'
              }`}
            >
              {m.role === 'assistant' ? <FormattedContent text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Slack help links — always available */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Having an issue with the app? Reach the team in Slack:</p>
        <div className="flex flex-wrap gap-1.5">
          {SLACK_CHANNELS.map(c => (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-brand dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
            >
              {c.label}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about the platform…"
            className="flex-1 resize-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-ink dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-brand text-white disabled:opacity-50 hover:bg-brand-700 transition-all"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
