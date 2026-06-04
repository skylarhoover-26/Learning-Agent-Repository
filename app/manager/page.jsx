'use client';

import { useState } from 'react';
import PageHeader from '../../components/page-header';
import {
  BarChart3, Users, BookOpen, TrendingUp, Award, Activity,
  Download, ArrowUpRight, Search, Loader2, UserCircle, Mail,
  Building2, Calendar, ChevronRight, XCircle,
} from 'lucide-react';

const SKILL_GAPS = {
  strong: [
    { name: 'Prompt basics', pct: 78 },
    { name: 'Email drafting', pct: 65 },
    { name: 'Meeting summaries', pct: 62 },
  ],
  growing: [
    { name: 'Data analysis', pct: 45 },
    { name: 'Report writing', pct: 41 },
    { name: 'Workflow design', pct: 38 },
  ],
  gaps: [
    { name: 'Advanced prompting', pct: 22 },
    { name: 'Automation', pct: 18 },
    { name: 'AI agents', pct: 12 },
  ],
};

function ManagerSearch({ onResult, loading, onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length >= 2) {
      onSubmit(name.trim());
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
          <Search className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-ink dark:text-slate-200 mb-2">
          Find Your Team
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Enter your name to pull your direct reports from Snowflake
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Last (e.g. Bridget Leiber)"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-ink dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-slate-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="px-6 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Looking up...</>
            ) : (
              <><Search className="w-4 h-4" /> Look up</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function ManagerCard({ manager }) {
  return (
    <div className="bg-gradient-to-br from-brand to-brand-700 rounded-2xl text-white shadow-card p-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
          {manager.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-lg font-bold">{manager.name}</h3>
          <p className="text-white/80 text-sm">{manager.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {manager.department}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {manager.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamTable({ reports }) {
  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p className="text-sm text-slate-500">No direct reports found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-ink dark:text-slate-200">Direct Reports</h2>
          <p className="text-xs text-slate-500">{reports.length} team member{reports.length !== 1 ? 's' : ''} from Snowflake</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live from Snowflake
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink/50 dark:text-slate-400 uppercase tracking-wide border-b border-ink/10 dark:border-slate-700">
            <th className="pb-3 pr-4 font-semibold">Name</th>
            <th className="pb-3 pr-4 font-semibold">Title</th>
            <th className="pb-3 pr-4 font-semibold">Department</th>
            <th className="pb-3 pr-4 font-semibold">Email</th>
            <th className="pb-3 font-semibold">Hire Date</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((person, i) => (
            <tr
              key={person.email || i}
              className={`border-b border-ink/5 dark:border-slate-700 ${i % 2 === 0 ? 'bg-bg-warm dark:bg-slate-900' : 'bg-white dark:bg-slate-800'}`}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-brand">
                    {person.name?.charAt(0) || '?'}
                  </div>
                  <span className="font-medium text-ink dark:text-slate-200">{person.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-ink/70 dark:text-slate-400">{person.title || '-'}</td>
              <td className="py-3 pr-4 text-ink/70 dark:text-slate-400">{person.department || '-'}</td>
              <td className="py-3 pr-4 text-ink/70 dark:text-slate-400 text-xs">{person.email || '-'}</td>
              <td className="py-3 text-ink/70 dark:text-slate-400 text-xs">{person.hireDate || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewCards({ teamSize }) {
  const cards = [
    { label: 'Team Size', value: teamSize, detail: 'direct reports', icon: Users, color: 'bg-brand' },
    { label: 'Active This Week', value: '-', detail: 'connect Supabase', icon: Activity, color: 'bg-green-500' },
    { label: 'Lessons Completed', value: '-', detail: 'connect Supabase', icon: BookOpen, color: 'bg-cta' },
    { label: 'Avg Team Level', value: '-', detail: 'connect Supabase', icon: TrendingUp, color: 'bg-brand-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink/60 dark:text-slate-400 font-medium">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-ink dark:text-slate-200">{card.value}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              {card.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkillBar({ name, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink dark:text-slate-200 w-40 shrink-0 truncate">{name}</span>
      <div className="flex-1 h-3 bg-ink/5 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-ink/70 dark:text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

function SkillGaps() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">Org Skill Distribution</h2>
      <p className="text-xs text-slate-500 mb-5">Proficiency across AI skills (mock data)</p>
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-3">Strong</h3>
          <div className="space-y-2">
            {SKILL_GAPS.strong.map((s) => <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-green-500" />)}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-3">Growing</h3>
          <div className="space-y-2">
            {SKILL_GAPS.growing.map((s) => <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-amber-400" />)}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-3">Gaps</h3>
          <div className="space-y-2">
            {SKILL_GAPS.gaps.map((s) => <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-red-400" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLookup(name) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/manager-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lookup failed.');
        return;
      }
      setTeamData(data);
    } catch {
      setError('Could not connect to the lookup service.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTeamData(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={BarChart3}
        title="Manager Dashboard"
        subtitle="Look up your team and track AI learning adoption"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {!teamData ? (
          <>
            <ManagerSearch loading={loading} onSubmit={handleLookup} />
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div />
              <button
                onClick={handleReset}
                className="text-sm text-brand hover:text-brand-600 font-medium transition-colors flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                Search again
              </button>
            </div>

            {teamData.manager && <ManagerCard manager={teamData.manager} />}

            <OverviewCards teamSize={teamData.directReports?.length || 0} />

            <TeamTable reports={teamData.directReports} />

            <SkillGaps />
          </>
        )}
      </main>
    </div>
  );
}
