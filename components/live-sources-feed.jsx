'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, BookOpen, MessageCircle } from 'lucide-react';

export default function LiveSourcesFeed() {
  const [findings, setFindings] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user-data?type=curriculum_findings');
        const data = res.ok ? (await res.json()).data : null;
        if (data) setFindings(data);
      } catch {
        // silent
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  const recentFindings = findings.slice(0, 6);

  return (
    <div data-tour="home-news" className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      {loaded && findings.length > 0 && (
        <div className="flex justify-end mb-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">Updated daily</span>
        </div>
      )}

      {!loaded ? (
        <div className="text-sm text-slate-400 italic">Loading...</div>
      ) : recentFindings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No articles yet. Sources are scanned daily.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {recentFindings.map((f, i) => (
            <div key={f.externalId || i} className="py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                  {f.sourceName}
                </span>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink dark:text-slate-300 hover:text-brand transition-colors truncate flex-1"
                >
                  {f.title}
                </a>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-brand shrink-0"
                  aria-label="Open article"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {/* Turn the news item into a learning moment — carry it into a
                  lesson or a chat. */}
              <div className="flex items-center gap-2 mt-1.5 pl-1">
                <Link
                  href={`/lesson?prefill=${encodeURIComponent(f.title)}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-600 bg-brand-50 dark:bg-slate-700 px-2 py-0.5 rounded-full transition-colors"
                >
                  <BookOpen className="w-3 h-3" /> Take a lesson
                </Link>
                <Link
                  href={`/chat?q=${encodeURIComponent(`Tell me about this AI update and why it matters for my work: ${f.title}`)}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand px-2 py-0.5 rounded-full transition-colors"
                >
                  <MessageCircle className="w-3 h-3" /> Just chat
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
