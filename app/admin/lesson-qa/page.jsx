'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { ClipboardCheck, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

// Admin-only review of the hidden lesson self-QA. Shows each generated lesson's
// quality score, verdict, issues, and who it was shown to. Learners never see this.
export default function LessonQaPage() {
  const [allowed, setAllowed] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin-check').then((r) => r.json()).then((d) => setAllowed(!!d.isAdmin)).catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const dr = await fetch('/api/audit-log?action=dates');
        const { dates } = dr.ok ? await dr.json() : { dates: [] };
        const recent = (dates || []).slice(0, 7);
        const all = [];
        for (const d of recent) {
          const er = await fetch(`/api/audit-log?type=lesson_qa&date=${d.date}`);
          if (er.ok) {
            const { entries: e } = await er.json();
            all.push(...(e || []));
          }
        }
        all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setEntries(all);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  if (allowed === null) return <Shell><p className="text-center text-slate-500 py-10">Checking…</p></Shell>;
  if (!allowed) return <Shell><p className="text-center text-slate-500 py-10">Admins only.</p></Shell>;

  return (
    <Shell>
      <main className="max-w-4xl mx-auto px-6 py-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          A hidden quality check runs on every lesson before the learner sees it. Review scores and issues here — learners never see this.
        </p>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card p-10 text-center">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No lessons reviewed yet. QA appears here as people start Quick Lessons and Deep Dives.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const score = e.output?.score ?? 0;
              const issues = e.output?.issues || [];
              const good = score >= 80 && issues.length === 0;
              return (
                <div key={e.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink dark:text-slate-200 truncate">{e.input?.topic || 'Lesson'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {e.input?.format || 'lesson'}{e.input?.tool ? ` · ${e.input.tool}` : ''} · shown to {e.user?.name || e.user?.email || 'unknown'}
                        {e.timestamp ? ` · ${new Date(e.timestamp).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-sm font-bold ${good ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {good ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {score}/100
                    </span>
                  </div>
                  {e.output?.verdict && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{e.output.verdict}</p>}
                  {issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {issues.map((iss, i) => (
                        <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {iss}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <PageHeader icon={ClipboardCheck} title="Lesson QA" subtitle="Hidden quality review of generated lessons" />
      {children}
    </div>
  );
}
