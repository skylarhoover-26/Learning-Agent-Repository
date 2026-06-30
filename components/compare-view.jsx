'use client';

import { useMemo } from 'react';
import { groupPeople, metricsForGroup } from '@/lib/report-metrics';

// Distinct series colors for up to 4 compared groups.
const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-6 ${className}`}>
      {children}
    </div>
  );
}

// Headline metrics as rows, one column per group, with an inline bar per cell
// scaled to the row's max so the groups are visually comparable.
function HeadlineTable({ groups }) {
  const rows = [
    { key: 'registeredPct', label: 'Registered coverage', fmt: (g) => `${g.registered}/${g.employees} · ${g.registeredPct}%`, val: (g) => g.registeredPct },
    { key: 'activePct', label: 'Active in range', fmt: (g) => `${g.active} · ${g.activePct}%`, val: (g) => g.activePct },
    { key: 'lessons', label: 'Lessons in range', fmt: (g) => g.lessons.toLocaleString(), val: (g) => g.lessons },
    { key: 'xp', label: 'Total XP', fmt: (g) => g.xp.toLocaleString(), val: (g) => g.xp },
    { key: 'avgLevel', label: 'Avg level', fmt: (g) => g.avgLevel.toFixed(1), val: (g) => g.avgLevel },
  ];
  return (
    <Card>
      <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-4">Headline comparison</h2>
      <div className="space-y-4">
        {rows.map((row) => {
          const max = Math.max(1, ...groups.map((g) => row.val(g.metrics)));
          return (
            <div key={row.key}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{row.label}</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
                {groups.map((g) => (
                  <div key={g.value} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate" title={g.value}>{g.value}</span>
                      <span className="text-sm font-bold text-ink dark:text-slate-200 tabular-nums shrink-0">{row.fmt(g.metrics)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(row.val(g.metrics) / max) * 100}%`, backgroundColor: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Active-users-over-time, one line per group, sharing the date axis.
function TrendChart({ groups }) {
  const dates = groups[0]?.metrics.trend.map((d) => d.date) || [];
  const n = dates.length;
  const max = Math.max(1, ...groups.flatMap((g) => g.metrics.trend.map((d) => d.activeUsers)));
  if (n === 0) return null;
  return (
    <Card>
      <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">Engagement trend</h2>
      <p className="text-xs text-slate-400 mb-3">active learners per day</p>
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-slate-500 dark:text-slate-400">
        {groups.map((g) => (
          <span key={g.value} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: g.color }} /> {g.value}
          </span>
        ))}
      </div>
      <div className="relative h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {groups.map((g) => {
            const pts = g.metrics.trend.map((d, i) => `${((i + 0.5) / n) * 100},${100 - (d.activeUsers / max) * 100}`).join(' ');
            return <polyline key={g.value} points={pts} fill="none" stroke={g.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{dates[0]?.slice(5)}</span>
        <span>{dates[Math.floor(n / 2)]?.slice(5)}</span>
        <span>{dates[n - 1]?.slice(5)}</span>
      </div>
    </Card>
  );
}

// One column per group with a small ranked bar list (activity or topics).
function ColumnList({ title, subtitle, groups, pick, labelKey, valueKey }) {
  return (
    <Card>
      <h2 className="text-base font-bold text-ink dark:text-slate-200 mb-1">{title}</h2>
      <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
      <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
        {groups.map((g) => {
          const items = pick(g.metrics);
          const max = Math.max(1, ...items.map((it) => it[valueKey]));
          return (
            <div key={g.value} className="min-w-0">
              <p className="text-sm font-semibold mb-2 truncate" style={{ color: g.color }} title={g.value}>{g.value}</p>
              {items.length === 0 ? (
                <p className="text-xs text-slate-400">No data</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i}>
                      <div className="flex items-start justify-between gap-1.5 mb-0.5">
                        <span className="text-xs text-ink dark:text-slate-200 leading-snug line-clamp-2" title={it[labelKey]}>{it[labelKey]}</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">{it[valueKey]}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(it[valueKey] / max) * 100}%`, backgroundColor: g.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function CompareView({ people = [], rangeEngagement = [], dimension, values = [] }) {
  const groups = useMemo(
    () => values.map((value, i) => ({
      value,
      color: COLORS[i % COLORS.length],
      metrics: metricsForGroup(groupPeople(people, dimension, value), rangeEngagement),
    })),
    [people, rangeEngagement, dimension, values]
  );

  if (values.length < 1) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500 dark:text-slate-400">
        Pick {dimension === 'person' ? 'people' : dimension === 'manager' ? 'managers' : 'teams'} above to compare them side by side.
      </div>
    );
  }

  return (
    <>
      <HeadlineTable groups={groups} />
      <TrendChart groups={groups} />
      <ColumnList
        title="What they're doing"
        subtitle="actions in the selected range"
        groups={groups}
        pick={(m) => m.activity}
        labelKey="label"
        valueKey="count"
      />
      <ColumnList
        title="Most-taken topics"
        subtitle="top topics per group"
        groups={groups}
        pick={(m) => m.topics}
        labelKey="topic"
        valueKey="count"
      />
    </>
  );
}
