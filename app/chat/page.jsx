'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/lib/chat-store';
import { onChatMessage } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { MessageCircle, Send, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';
import ChatLessonOffer from '@/components/chat-lesson-offer';
import LlmWindowCallout from '@/components/llm-window-callout';
import { useActiveTool } from '@/components/active-tool-provider';

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
  const searchParams = useSearchParams();
  // During the guided tour we show a clean, empty chat (so the suggestion chips
  // and the typed-question demo read clearly) and never persist the demo — the
  // learner's real saved history is left untouched.
  const [tourMode, setTourMode] = useState(false);

  // Newest turn renders at the top (just below the pinned input), so scroll the
  // thread back to the top whenever a message is sent or a reply arrives.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Newest turn first, so the latest exchange sits directly under the input.
  const orderedTurns = [...groupTurns(messages)].reverse();

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader icon={MessageCircle} title="Just Chat" subtitle="Ask me anything about AI" />

      {/* Input pinned at the top — type here, replies appear directly below. */}
      <div data-tour="page-chat" className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
              data-tour="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about AI..."
              rows={1}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all max-h-32"
              disabled={isLoading}
            />
            <button
              data-tour="chat-send"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-brand text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => { clearChatHistory(); setMessages([]); }}
                className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                aria-label="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Press Enter to send · Shift+Enter for new line · Need a human?</span>
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
      </div>

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div data-tour="chat-thread" className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          <LlmWindowCallout storageKey="chat" />

          {isLoading && (
            <div className="flex flex-col items-start gap-1">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {orderedTurns.map((turn) => (
            <div key={turn[0].i} className="space-y-4">
              {turn.map(({ msg, i }) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                  <div
                    data-tour={msg.role === 'assistant' ? 'chat-reply' : undefined}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-brand text-white'
                        : 'bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant'
                      ? <FormattedContent text={msg.content} />
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>
                  {msg.role === 'assistant' && msg.lessonTopic && (
                    <ChatLessonOffer topic={msg.lessonTopic} />
                  )}
                </div>
              ))}
            </div>
          ))}

          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 ring-1 ring-brand-100 dark:ring-slate-600 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-brand" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2 tracking-tight">
                What do you want to know about AI?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                I'll adapt to your level and teach by example. Try asking about prompting, agents, or anything you're curious about.
              </p>
              <div data-tour="chat-suggestions" className="flex flex-wrap gap-2 justify-center">
                {buildSuggestions(profile).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-pill text-ink dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-700 hover:border-brand-200 hover:text-brand transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
            Chats are saved to your account and may be reviewed by admins to improve training.
          </p>
        </div>
      </main>
    </div>
  );
}
