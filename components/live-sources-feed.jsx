'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
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
        <div className="space-y-1">
          {recentFindings.map((f, i) => (
            <div key={f.externalId || i} className="flex items-center gap-2 py-1.5">
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
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
