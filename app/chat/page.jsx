'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/lib/chat-store';
import { onChatMessage } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { MessageCircle, Sparkles, Send, Loader2, Trash2, ExternalLink, ArrowUpRight, LifeBuoy } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';
import ChatLessonOffer from '@/components/chat-lesson-offer';
import { useActiveTool } from '@/components/active-tool-provider';
import Avatar from '@/components/avatar';
import { displayNameFromProfile } from '@/lib/display-name';

// Same support channels surfaced by the floating help widget, pinned in the
// chat footer so learners can reach the team without leaving the conversation.
const SLACK_CHANNELS = [
  { label: 'HCP Skill Shop Help', href: 'https://housecall.slack.com/archives/C04BU29V4TH' },
  { label: 'HCP MX Skill Shop Help', href: 'https://housecall.slack.com/archives/C04J8BRUJQY' },
];

const DEFAULT_SUGGESTIONS = [
  'How do I write a good prompt?',
  'What can AI actually do well?',
  'How do I verify AI output?',
  'What are AI agents?',
];

// Build suggestion chips tailored to the learner's role, tasks, and experience.
function buildSuggestions(profile) {
  if (!profile) return DEFAULT_SUGGESTIONS;
  const tasks = Array.isArray(profile.top_tasks) ? profile.top_tasks : [];
  const dept = profile.department;
  const isDev = profile.tier === 'developer';
  const out = [];

  if (tasks[0]) out.push(`How can AI help me with ${tasks[0].toLowerCase()}?`);
  if (tasks[1]) out.push(`Show me an AI workflow for ${tasks[1].toLowerCase()}`);
  if (dept) out.push(`What are the best AI use cases for ${dept}?`);
  out.push(isDev ? 'How do I build an AI agent for my work?' : 'How do I write a good prompt?');
  out.push('How do I verify AI output?');

  // De-dupe and keep it to 4 chips.
  return [...new Set(out)].slice(0, 4);
}

// Group the flat message list into turns (a user message + the assistant
// reply(s) that follow), preserving each message's original index for keys.
// Lets us show newest-turn-first while keeping each turn readable top-to-bottom.
function groupTurns(msgs) {
  const turns = [];
  msgs.forEach((msg, i) => {
    if (msg.role === 'user' || turns.length === 0) turns.push([{ msg, i }]);
    else turns[turns.length - 1].push({ msg, i });
  });
  return turns;
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <PageHeader icon={MessageCircle} title="Just Chat" subtitle="Ask me anything about AI" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </main>
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { profile } = useProfile();
  const { tools } = useActiveTool();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mainRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const searchParams = useSearchParams();
  // During the guided tour we show a clean, empty chat (so the suggestion chips
  // and the typed-question demo read clearly) and never persist the demo — the
  // learner's real saved history is left untouched.
  const [tourMode, setTourMode] = useState(false);

  // Standard chat flow: messages read top-to-bottom and the newest sits at the
  // bottom, so keep the view pinned to the latest as messages and replies arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    const inTour = typeof window !== 'undefined' && window.sessionStorage.getItem('tourActive') === '1';
    if (inTour) {
      setTourMode(true);
      setMessages([]); // ignore saved history for the demo
      inputRef.current?.focus();
      return;
    }
    const existing = getChatHistory();
    setMessages(existing);
    const prefill = searchParams.get('q');
    if (prefill && existing.length === 0) {
      setInput(prefill);
    }
    inputRef.current?.focus();
  }, [searchParams]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // The reply is an LLM call that can transiently fail or be slow on a cold
      // function. Auto-retry a few times with a per-attempt timeout before
      // surfacing the error, so a one-off blip doesn't drop the message.
      let data = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: newMessages, tools }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Something went wrong');
          data = json;
          break;
        } catch (err) {
          clearTimeout(timer);
          lastErr = err;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
        }
      }
      if (!data) throw lastErr || new Error('Something went wrong');
      // lessonTopic is detected server-side (see /api/chat) when the learner
      // asks a what/how/explain question, so chat can offer a lesson.
      const updatedMessages = [...newMessages, { role: 'assistant', content: data.reply, lessonTopic: data.lessonTopic }];
      setMessages(updatedMessages);
      // In tour mode, don't save the demo to history or award XP for it.
      if (!tourMode) {
        saveChatHistory(updatedMessages);
        if (profile) {
          // Capped at DAILY_CAPS.chat_message/day; returns null-ish when capped.
          const xpResult = onChatMessage(resolveLearnerId(profile));
          emitXp(xpResult);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Oldest-to-newest, the way every chat app reads.
  const orderedTurns = groupTurns(messages);
  const firstName = (displayNameFromProfile(profile) || '').split(' ')[0];
  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        icon={MessageCircle}
        title="Just Chat"
        subtitle="Your AI coach — ask anything"
        actions={hasMessages ? (
          <button
            onClick={() => {
              if (window.confirm('Delete this chat? This clears the whole conversation.')) {
                clearChatHistory();
                setMessages([]);
                setInput('');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-medium text-white/90 border border-white/25 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Clear chat</span>
          </button>
        ) : null}
      />

      {/* Scrollable conversation */}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div data-tour="chat-thread" className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {/* Welcome / empty state */}
          {!hasMessages && !isLoading && (
            <div className="flex flex-col items-center text-center pt-6 pb-4">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-600 text-white shadow-lg mb-5">
                <Sparkles className="w-8 h-8" />
              </span>
              <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-1.5">
                {firstName ? `Hi ${firstName} — what can I help with?` : 'What can I help you with?'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mb-7">
                Ask me anything about AI and I&apos;ll answer right here, teaching by example. Try one of these to get started:
              </p>

              <div data-tour="chat-suggestions" className="grid sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {buildSuggestions(profile).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="group flex items-center justify-between gap-3 text-left px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card transition-all"
                  >
                    <span className="text-sm font-medium text-ink dark:text-slate-200">{s}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand shrink-0 transition-colors" />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <LifeBuoy className="w-3.5 h-3.5" /> Need a human?
                </span>
                {SLACK_CHANNELS.map(c => (
                  <a
                    key={c.href}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-brand dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
                  >
                    {c.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Conversation — oldest to newest */}
          {hasMessages && (
            <div className="space-y-5">
              {orderedTurns.map((turn) => (
                <div key={turn[0].i} className="space-y-4">
                  {turn.map(({ msg, i }) => (
                    msg.role === 'user' ? (
                      <div key={i} className="flex justify-end items-end gap-2">
                        <div className="max-w-[80%] bg-brand text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap shadow-sm">{msg.content}</div>
                        <span className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white dark:ring-slate-800">
                          <Avatar avatar={profile?.avatar} size={32} title={firstName} />
                        </span>
                      </div>
                    ) : (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-600 text-white shrink-0 shadow-sm">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0 max-w-[88%]">
                          <div data-tour="chat-reply" className="rounded-2xl rounded-tl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm shadow-sm">
                            <FormattedContent text={msg.content} />
                          </div>
                          {msg.lessonTopic && <div className="mt-2"><ChatLessonOffer topic={msg.lessonTopic} /></div>}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-600 text-white shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm shadow-sm">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Sticky composer */}
      <div className="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-bg dark:bg-slate-900/95 backdrop-blur">
        <div data-tour="page-chat" className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-2">
            <textarea
              data-tour="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about AI…"
              rows={1}
              className="flex-1 resize-none px-3 py-2 rounded-xl bg-transparent text-sm text-ink dark:text-slate-200 outline-none max-h-32"
              disabled={isLoading}
            />
            <button
              data-tour="chat-send"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-50 transition-all shrink-0"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-1.5">
            Press Enter to send · Shift+Enter for a new line · Chats may be reviewed by admins to improve training.
          </p>
        </div>
      </div>
    </div>
  );
}
