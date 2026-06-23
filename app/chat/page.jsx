'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/lib/chat-store';
import { onChatMessage } from '@/lib/progression';
import { emitXp } from '@/lib/xp-bus';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { MessageCircle, MessageSquare, Send, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';
import ChatLessonOffer from '@/components/chat-lesson-offer';
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

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div data-tour="chat-thread" className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {/* Ask box — the answer threads in right below it (lesson Q&A style). */}
          <div data-tour="page-chat" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Ask anything about AI — I&apos;ll answer right here and teach by example.</p>
              {messages.length > 0 && (
                <button
                  onClick={() => { clearChatHistory(); setMessages([]); }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                data-tour="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about AI..."
                rows={1}
                className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-ink dark:text-slate-200 outline-none focus:border-brand max-h-32"
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

            {/* Suggestions live in the box while the conversation is empty. */}
            {messages.length === 0 && !isLoading && (
              <div data-tour="chat-suggestions" className="flex flex-wrap gap-2 mt-3">
                {buildSuggestions(profile).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 text-sm bg-bg-subtle dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-pill text-ink dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-700 hover:border-brand-200 hover:text-brand transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Threaded conversation — newest exchange first, right under the input. */}
            {orderedTurns.length > 0 && (
              <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                {orderedTurns.map((turn, ti) => (
                  <div key={turn[0].i} className="space-y-1.5">
                    {turn.map(({ msg, i }) => (
                      msg.role === 'user' ? (
                        <div key={i} className="flex justify-end">
                          <div className="max-w-[85%] bg-brand text-white px-3 py-2 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      ) : (
                        <div key={i} className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div data-tour="chat-reply" className="rounded-2xl rounded-bl-md bg-bg-subtle dark:bg-slate-900 px-3 py-2 text-sm">
                              <FormattedContent text={msg.content} />
                            </div>
                            {msg.lessonTopic && <div className="mt-1.5"><ChatLessonOffer topic={msg.lessonTopic} /></div>}
                          </div>
                        </div>
                      )
                    ))}
                    {ti === 0 && isLoading && (
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </span>
                        <div className="rounded-2xl rounded-bl-md bg-bg-subtle dark:bg-slate-900 px-3 py-2 text-sm">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Press Enter to send · Shift+Enter for new line · Need a human?</span>
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
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Chats are saved to your account and may be reviewed by admins to improve training.
          </p>
        </div>
      </main>
    </div>
  );
}
