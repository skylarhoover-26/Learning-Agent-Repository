'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, Loader2, ExternalLink } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';

const GREETING = 'Thanks for checking in! I can answer questions about the AI Learning Coach. How can I help?';

// Persist the conversation + draft across page navigation so a learner never
// loses what they typed when they move between pages. sessionStorage keeps it
// for the browser tab/session and clears when the tab closes.
const STORAGE_KEY = 'la_help_widget';

function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SLACK_CHANNELS = [
  { label: 'HCP Skill Shop Help', href: 'https://housecall.slack.com/archives/C04BU29V4TH' },
  { label: 'HCP MX Skill Shop Help', href: 'https://housecall.slack.com/archives/C04J8BRUJQY' },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // real convo (greeting is UI-only)
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Auto-hide the launcher whenever an overlay (dropdown menu, dialog, modal) is
  // open, so it never covers the content the user is interacting with. Detected
  // generically from the DOM — no per-component wiring needed.
  const [overlayOpen, setOverlayOpen] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const check = () => {
      const present = !!document.querySelector('[role="listbox"], [role="dialog"], [aria-modal="true"]');
      setOverlayOpen((prev) => (prev === present ? prev : present));
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-modal'] });
    return () => mo.disconnect();
  }, []);

  // Hydrate from sessionStorage on mount (after mount to avoid SSR mismatch).
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (Array.isArray(saved.messages)) setMessages(saved.messages);
      if (typeof saved.input === 'string') setInput(saved.input);
      if (saved.open) setOpen(true);
    }
  }, []);

  // Persist whenever the conversation, draft, or open state changes.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, input, open }));
    } catch {
      // sessionStorage unavailable — state just won't survive navigation.
    }
  }, [messages, input, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

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
    // While an overlay is up, get out of the way entirely.
    if (overlayOpen) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        data-tour="help"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-white transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(135deg,#3B94FF,#0055FF)', boxShadow: '0 18px 40px -14px rgba(59,148,255,.75), inset 0 1px 0 rgba(255,255,255,.25)' }}
        aria-label="Open help chat"
      >
        <MessageCircleQuestion className="w-5 h-5" />
        <span className="text-sm font-semibold">Questions? Chat here</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] max-h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 overflow-hidden"
      style={{ boxShadow: '0 30px 80px -30px rgba(6,20,45,.55), 0 0 44px -22px rgba(59,148,255,.5)' }}
    >
      {/* Header — cinematic navy gradient with the sparkle chip, matching the top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" style={{ background: 'linear-gradient(90deg, rgba(7,17,40,.98), rgba(12,38,74,.94))' }}>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg,#3B94FF,#FFB706)' }}>
            <MessageCircleQuestion className="w-4 h-4 text-white" />
          </span>
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
                  ? 'text-white'
                  : 'bg-white dark:bg-slate-700 text-ink dark:text-slate-200 border border-slate-200 dark:border-slate-600'
              }`}
              style={m.role === 'user' ? { background: 'linear-gradient(135deg,#3B94FF,#0055FF)' } : undefined}
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
            className="p-2 rounded-xl text-white disabled:opacity-50 hover:brightness-110 transition-all"
            style={{ background: 'linear-gradient(135deg,#3B94FF,#0055FF)' }}
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
