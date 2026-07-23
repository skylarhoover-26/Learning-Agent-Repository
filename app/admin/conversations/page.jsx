'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '../../../components/page-header';
import { CinematicFrame } from '@/components/cinematic/cinematic-shell';
import { MessagesSquare, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import BookLoader from '@/components/book-loader';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

export default function AdminConversations() {
  return <CinematicFrame><AdminConversationsInner /></CinematicFrame>;
}

// Group the flat, newest-first message log into per-learner threads.
function groupByLearner(messages) {
  const groups = new Map();
  for (const m of messages) {
    const key = m.email || m.slack_user_id || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, { key, email: m.email, slackUserId: m.slack_user_id, messages: [], lastAt: m.created_at });
    }
    groups.get(key).messages.push(m);
  }
  // Each group's messages are newest-first (as fetched); flip to chronological
  // for reading, and sort groups by most-recent activity.
  const list = Array.from(groups.values()).map((g) => ({
    ...g,
    messages: [...g.messages].reverse(),
    count: g.messages.length,
  }));
  list.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  return list;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function AdminConversationsInner() {
  const router = useRouter();
  const { isAdmin, loaded } = useMenuVisibility();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (loaded && !isAdmin) router.replace('/');
  }, [loaded, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/conversations');
      const data = res.ok ? await res.json() : { messages: [] };
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded && isAdmin) load();
  }, [loaded, isAdmin, load]);

  const groups = useMemo(() => {
    const all = groupByLearner(messages);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (g) =>
        (g.email || '').toLowerCase().includes(q) ||
        g.messages.some((m) => (m.text || '').toLowerCase().includes(q))
    );
  }, [messages, query]);

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (!loaded) {
    return (
      <div className="min-h-screen bg-bg-warm dark:bg-slate-900 flex items-center justify-center">
        <BookLoader message="Checking admin access..." size="sm" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader
        icon={MessagesSquare}
        title="Slack Conversations"
        subtitle="Two-way coaching chats between users and the Slack bot"
      />

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by person or message…"
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-ink dark:text-slate-200"
          />
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-ink dark:text-slate-200 hover:border-brand-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <BookLoader message="Loading conversations..." size="sm" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">
            No Slack conversations yet. They'll appear here as people message the bot.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <ConversationCard
                key={g.key}
                group={g}
                open={expanded.has(g.key)}
                onToggle={() => toggle(g.key)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ConversationCard({ group, open, onToggle }) {
  const last = group.messages[group.messages.length - 1];
  const label = group.email || `Slack user ${group.slackUserId || 'unknown'}`;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink dark:text-slate-200 text-sm truncate">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{last?.text}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">{formatTime(group.lastAt)}</p>
          <p className="text-[11px] text-slate-400">{group.count} msg</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
          {group.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const inbound = message.direction === 'inbound';
  return (
    <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          inbound
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-ink dark:text-slate-200'
            : 'bg-brand text-white'
        }`}
      >
        <p>{message.text}</p>
        <p className={`mt-1 text-[10px] ${inbound ? 'text-slate-400' : 'text-white/70'}`}>
          {inbound ? 'User' : 'Bot'} · {formatTime(message.created_at)}
          {message.meta?.source && message.meta.source !== 'dm' && message.meta.source !== 'chat'
            ? ` · ${message.meta.source}`
            : ''}
        </p>
      </div>
    </div>
  );
}
