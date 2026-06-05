'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Rss, ExternalLink, ChevronRight, Zap, FileText, Trash2,
} from 'lucide-react';

const SEVERITY_STYLES = {
  high: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  med: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  low: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
};

const TYPE_ICONS = {
  'NEW MODULE': Zap,
  'CONTENT UPDATE': FileText,
  'DEPRECATION': Trash2,
};

export default function LiveSourcesFeed() {
  const [findings, setFindings] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [findingsRes, proposalsRes] = await Promise.all([
          fetch('/api/user-data?type=curriculum_findings'),
          fetch('/api/user-data?type=curriculum_proposals'),
        ]);
        const findingsData = findingsRes.ok ? (await findingsRes.json()).data : null;
        const proposalsData = proposalsRes.ok ? (await proposalsRes.json()).data : null;
        if (findingsData) setFindings(findingsData);
        if (proposalsData) setProposals(proposalsData);
      } catch {
        // silent — dashboard card is supplemental
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const recentFindings = findings.slice(0, 5);
  const hasContent = recentFindings.length > 0 || pendingProposals.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rss className="w-5 h-5 text-brand" />
          <h3 className="font-semibold text-ink dark:text-slate-200">AI Sources</h3>
          {loaded && findings.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({findings.length} findings)
            </span>
          )}
        </div>
        <Link
          href="/curriculum-pipeline"
          className="text-sm font-medium text-brand hover:text-brand-600 transition-colors flex items-center gap-1"
        >
          View pipeline <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {!loaded ? (
        <div className="text-sm text-slate-400 italic">Loading sources...</div>
      ) : !hasContent ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No findings yet. Sources are scanned daily at 8am UTC.
        </p>
      ) : (
        <div className="space-y-4">
          {pendingProposals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Pending Proposals ({pendingProposals.length})
              </p>
              <div className="space-y-2">
                {pendingProposals.slice(0, 3).map(p => {
                  const TypeIcon = TYPE_ICONS[p.type] || FileText;
                  return (
                    <Link
                      key={p.id}
                      href="/curriculum-pipeline"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <TypeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-ink dark:text-slate-200 truncate flex-1">
                        {p.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${SEVERITY_STYLES[p.severity] || ''}`}>
                        {p.severity}
                      </span>
                    </Link>
                  );
                })}
                {pendingProposals.length > 3 && (
                  <Link
                    href="/curriculum-pipeline"
                    className="text-xs text-brand hover:text-brand-600 font-medium"
                  >
                    + {pendingProposals.length - 3} more proposals
                  </Link>
                )}
              </div>
            </div>
          )}

          {recentFindings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Latest Findings
              </p>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
