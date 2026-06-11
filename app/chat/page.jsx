'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { getChatHistory, saveChatHistory, clearChatHistory } from '@/lib/chat-store';
import { addXpEvent } from '@/lib/learner-store';
import { resolveLearnerId } from '@/lib/learner-id';
import { useProfile } from '@/components/profile-provider';
import { MessageCircle, Send, Loader2, Trash2 } from 'lucide-react';
import { FormattedContent } from '@/components/lesson-slide';

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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      const updatedMessages = [...newMessages, { role: 'assistant', content: data.reply }];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
      if (profile) {
        addXpEvent(resolveLearnerId(profile), {
          source: 'chat_message',
          amount: 5,
          created_at: new Date().toISOString(),
        });
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

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader icon={MessageCircle} title="Just Chat" subtitle="Ask me anything about AI" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-slate-700 ring-1 ring-brand-100 dark:ring-slate-600 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-brand" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-ink dark:text-slate-200 mb-2 tracking-tight">
                How can AI optimize your workflow?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                I'll adapt to your level and teach by example. Try asking about prompting, agents, or anything you're curious about.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
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

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
              <div
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
            </div>
          ))}

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

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
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
          <p className="text-xs text-slate-400 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
