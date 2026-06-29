'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, Loader2 } from 'lucide-react';
import ReportView from '@/components/report-view';

// Public, read-only shared report. No login required — the token in the URL is
// the authorization. App chrome (sidebar, identity gate, onboarding redirect) is
// suppressed for this route so an external viewer sees just the report.
export default function SharedReportPage() {
  const params = useParams();
  const token = params?.token;
  const [state, setState] = useState('loading'); // loading | invalid | ok
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/reporting/shared?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { setState('invalid'); return; }
        setData(await r.json());
        setState('ok');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <header className="bg-ink text-white px-6 py-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-md bg-brand flex items-center justify-center"><BarChart3 className="w-5 h-5" /></span>
        <div>
          <h1 className="font-bold tracking-tight text-[17px] leading-tight">AI Learning — Reporting</h1>
          <p className="text-xs text-white/60">{data?.scopeLabel || 'Shared report'}</p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        {state === 'loading' && (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading report…</div>
        )}
        {state === 'invalid' && (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">This link is invalid or has expired.</div>
        )}
        {state === 'ok' && data && (
          <>
            <ReportView people={data.people} overview={data.overview} />
            <p className="text-center text-xs text-slate-400 mt-6">Read-only shared report · generated {new Date(data.generatedAt).toLocaleString()}</p>
          </>
        )}
      </main>
    </div>
  );
}
