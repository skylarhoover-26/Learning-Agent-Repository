'use client';

import { useState, useRef, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  'How do I write a good prompt?',
  'What can AI actually do well?',
  'How do I verify AI output?',
  'What are AI agents?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "Great question! This is a demo preview of the AI Learning Platform. Once we wire up the Claude API, I'll be able to give you personalized answers about AI, adapted to your role and experience level.\n\nFor now, explore the dashboard and other pages to see what's coming!",
        },
      ]);
      setIsLoading(false);
    }, 1000);
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
              <div className="w-16 h-16 rounded-2xl bg-brand-50 ring-1 ring-brand-100 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-brand" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-2 tracking-tight">
                What do you want to know about AI?
              </h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                I'll adapt to your level and teach by example. Try asking about prompting, agents, or anything you're curious about.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-pill text-ink hover:bg-brand-50 hover:border-brand-200 hover:text-brand transition-all"
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
                    : 'bg-white text-ink border border-slate-200 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start gap-1">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-ink border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about AI..."
              rows={1}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all max-h-32"
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
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}
