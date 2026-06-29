'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/page-header';
import {
  BarChart3, Users, BookOpen, TrendingUp, Award, Activity,
  Search, Loader2, Mail, Building2, XCircle, Check, X,
  ChevronDown, Save,
} from 'lucide-react';
import BookLoader from '@/components/book-loader';

function ManagerSearch({ loading, onSubmit }) {
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
        <p className="text-sm text-slate-500 dark:text-slate-400">No direct reports found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-ink dark:text-slate-200">Direct Reports</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{reports.length} team member{reports.length !== 1 ? 's' : ''} from Snowflake</p>
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

function OverviewCards({ teamSize, overview }) {
  const cards = [
    { label: 'Team Size', value: teamSize, detail: 'direct reports', icon: Users, color: 'bg-brand' },
    { label: 'Active This Week', value: overview?.activeThisWeek ?? '-', detail: 'logged in past 7 days', icon: Activity, color: 'bg-green-500' },
    { label: 'Lessons Completed', value: overview?.totalLessons ?? '-', detail: 'across the team', icon: BookOpen, color: 'bg-cta' },
    { label: 'Avg AI Score', value: overview?.avgLevel ?? '-', detail: 'team average (1-5)', icon: TrendingUp, color: 'bg-brand-400' },
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
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {card.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SCORE_DOT_COLORS = {
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-green-400',
  5: 'bg-purple-500',
};

const STATUS_STYLES = {
  'On Track': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Not Started': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  'Needs Nudge': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Completed': 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
};

const LEVEL_STYLES = {
  Beginner: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  Practitioner: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  'Power User': 'bg-cta-50 text-cta-700 ring-1 ring-cta-200',
  'Not Started': 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600',
};

function ScoreDot({ score, type }) {
  if (score === null || score === undefined) {
    return <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-600" title="Not assessed" />;
  }
  return (
    <span
      className={`w-3 h-3 rounded-full ${SCORE_DOT_COLORS[score] || 'bg-slate-200'}`}
      title={`${type}: ${score}/5`}
    />
  );
}

function ScorePicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`w-5 h-5 rounded-full text-[9px] font-bold transition-all ${
            value === n
              ? `${SCORE_DOT_COLORS[n]} text-white ring-2 ring-offset-1 ring-brand`
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function CompetenciesTable({ members, reports, rating, setRating, managerEmail, onScoresSaved }) {
  const [pendingScores, setPendingScores] = useState({});
  const [saving, setSaving] = useState(false);

  const memberMap = {};
  for (const m of members) {
    memberMap[m.email] = m;
  }

  const rows = (reports || []).map(r => {
    const data = memberMap[r.email] || {};
    return {
      name: r.name,
      email: r.email,
      role: r.title || '-',
      level: data.level || 'Not Started',
      selfScores: data.selfScores || null,
      managerScores: data.managerScores || null,
      progress: data.progress || 0,
      status: data.status || 'Not Started',
    };
  });

  function updatePending(email, dim, val) {
    setPendingScores(prev => ({
      ...prev,
      [email]: {
        ...(prev[email] || {}),
        [dim]: val,
      },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const entries = Object.entries(pendingScores).filter(
        ([, scores]) => Object.values(scores).some(v => v !== null && v !== undefined)
      );
      await Promise.all(
        entries.map(([email, scores]) =>
          fetch('/api/team-scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'rate',
              managerEmail,
              memberEmail: email,
              scores,
            }),
          })
        )
      );
      setPendingScores({});
      setRating(false);
      if (onScoresSaved) onScoresSaved();
    } catch (error) {
      console.error('Failed to save scores:', error);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = Object.values(pendingScores).some(
    s => Object.values(s).some(v => v !== null && v !== undefined)
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-ink dark:text-slate-200">AI Impact Competencies</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">P = Personal, T = Team, O = Org, D = AI Development &middot; S = Self, M = Manager</p>
        </div>
        <div className="flex items-center gap-2">
          {rating && hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Scores'}
            </button>
          )}
          <button
            onClick={() => {
              if (rating) {
                setPendingScores({});
              }
              setRating(!rating);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              rating
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-brand text-white hover:bg-brand-600'
            }`}
          >
            {rating ? 'Cancel' : 'Rate Team'}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-ink dark:text-slate-200 mb-1">No competency data yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Scores will appear as team members complete the AI Impact Assessment.</p>
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink/50 dark:text-slate-400 uppercase tracking-wide border-b border-ink/10 dark:border-slate-700">
                <th className="pb-3 pr-4 font-semibold">Name</th>
                <th className="pb-3 pr-4 font-semibold">Level</th>
                <th className="pb-3 pr-2 font-semibold text-center" colSpan={2}>P</th>
                <th className="pb-3 pr-2 font-semibold text-center" colSpan={2}>T</th>
                <th className="pb-3 pr-2 font-semibold text-center" colSpan={2}>O</th>
                <th className="pb-3 pr-4 font-semibold text-center" colSpan={2}>D</th>
                <th className="pb-3 pr-4 font-semibold">Progress</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
              <tr className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th colSpan={2} />
                <th className="pb-2 text-center font-normal">S</th>
                <th className="pb-2 text-center font-normal pr-2">M</th>
                <th className="pb-2 text-center font-normal">S</th>
                <th className="pb-2 text-center font-normal pr-2">M</th>
                <th className="pb-2 text-center font-normal">S</th>
                <th className="pb-2 text-center font-normal pr-4">M</th>
                <th className="pb-2 text-center font-normal">S</th>
                <th className="pb-2 text-center font-normal pr-4">M</th>
                <th colSpan={2} />
              </tr>
            </thead>
            <tbody>
              {rows.map((person, i) => {
                const pending = pendingScores[person.email] || {};
                return (
                  <tr
                    key={person.email}
                    className={`border-b border-ink/5 dark:border-slate-700 ${i % 2 === 0 ? 'bg-bg-warm dark:bg-slate-900' : ''}`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-brand">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-ink dark:text-slate-200 block">{person.name}</span>
                          <span className="text-xs text-slate-400">{person.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${LEVEL_STYLES[person.level] || LEVEL_STYLES['Not Started']}`}>
                        {person.level}
                      </span>
                    </td>
                    {['personal', 'team', 'org', 'development'].map(dim => (
                      <DimensionCells
                        key={dim}
                        selfScore={person.selfScores?.[dim] ?? null}
                        managerScore={person.managerScores?.[dim] ?? null}
                        rating={rating}
                        pendingValue={pending[dim] ?? null}
                        onPendingChange={(val) => updatePending(person.email, dim, val)}
                        isLast={dim === 'development'}
                      />
                    ))}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${person.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">{person.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-pill text-xs font-medium ${STATUS_STYLES[person.status] || STATUS_STYLES['Not Started']}`}>
                        {person.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> 1</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> 2</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> 3</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400" /> 4</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> 5</span>
            <span className="ml-2 text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" /> Not assessed</span>
          </div>
        </>
      )}
    </div>
  );
}

function DimensionCells({ selfScore, managerScore, rating, pendingValue, onPendingChange, isLast }) {
  const prClass = isLast ? 'pr-4' : 'pr-2';
  return (
    <>
      <td className="py-3 text-center">
        <ScoreDot score={selfScore} type="Self" />
      </td>
      <td className={`py-3 text-center ${prClass}`}>
        {rating ? (
          <ScorePicker value={pendingValue ?? managerScore} onChange={onPendingChange} />
        ) : (
          <ScoreDot score={managerScore} type="Manager" />
        )}
      </td>
    </>
  );
}

export default function ManagerDashboard() {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [rating, setRating] = useState(false);

  // Warm the org-data cache as soon as the dashboard opens (fire-and-forget), so
  // the first lookup reads a ready cache instead of triggering the slow
  // n8n→Snowflake fetch inline. The lookup still self-fetches as a fallback.
  useEffect(() => {
    fetch('/api/manager-data').catch(() => { /* best-effort warm */ });
  }, []);

  const fetchTeamScores = useCallback(async (emails) => {
    setScoresLoading(true);
    try {
      const res = await fetch('/api/team-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      if (res.ok) {
        const data = await res.json();
        setScoreData(data);
      }
    } catch (error) {
      console.error('Failed to fetch team scores:', error);
    } finally {
      setScoresLoading(false);
    }
  }, []);

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

      const emails = (data.directReports || [])
        .map(r => r.email)
        .filter(Boolean);
      if (emails.length > 0) {
        fetchTeamScores(emails);
      }
    } catch {
      setError('Could not connect to the lookup service.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTeamData(null);
    setScoreData(null);
    setError(null);
    setRating(false);
  }

  function handleScoresSaved() {
    const emails = (teamData?.directReports || [])
      .map(r => r.email)
      .filter(Boolean);
    if (emails.length > 0) {
      fetchTeamScores(emails);
    }
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
            {loading && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
                <BookLoader message="Looking up your team in Snowflake..." />
              </div>
            )}
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

            <OverviewCards
              teamSize={teamData.directReports?.length || 0}
              overview={scoreData?.overview}
            />

            <TeamTable reports={teamData.directReports} />

            {scoresLoading ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8">
                <BookLoader message="Loading competency scores..." size="sm" />
              </div>
            ) : (
              <CompetenciesTable
                members={scoreData?.members || []}
                reports={teamData.directReports || []}
                rating={rating}
                setRating={setRating}
                managerEmail={teamData.manager?.email}
                onScoresSaved={handleScoresSaved}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
