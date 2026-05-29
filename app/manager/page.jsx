'use client';

import PageHeader from '../../components/page-header';
import {
  BarChart3,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Activity,
  Download,
  ArrowUpRight,
} from 'lucide-react';

const OVERVIEW_CARDS = [
  {
    label: 'Total Learners',
    value: 47,
    detail: '+8 this week',
    icon: Users,
    color: 'bg-brand',
  },
  {
    label: 'Active This Week',
    value: 31,
    detail: '66% engagement',
    icon: Activity,
    color: 'bg-green-500',
  },
  {
    label: 'Lessons Completed',
    value: 284,
    detail: 'avg 6/person',
    icon: BookOpen,
    color: 'bg-cta',
  },
  {
    label: 'Average Level',
    value: '2.4',
    detail: 'out of 10',
    icon: TrendingUp,
    color: 'bg-brand-400',
  },
];

const WEEKLY_ADOPTION = [
  { week: 'Wk 1', active: 12 },
  { week: 'Wk 2', active: 18 },
  { week: 'Wk 3', active: 24 },
  { week: 'Wk 4', active: 28 },
  { week: 'Wk 5', active: 35 },
  { week: 'Wk 6', active: 31 },
];

const DEPARTMENTS = [
  { name: 'Customer Success', learners: 12, avgLevel: '2.8', lessonsPerPerson: '8.2', topSkill: 'Email drafting' },
  { name: 'Sales', learners: 8, avgLevel: '2.1', lessonsPerPerson: '5.4', topSkill: 'Prospect research' },
  { name: 'Engineering', learners: 7, avgLevel: '3.5', lessonsPerPerson: '9.1', topSkill: 'Code review' },
  { name: 'Marketing', learners: 6, avgLevel: '2.3', lessonsPerPerson: '6.8', topSkill: 'Content creation' },
  { name: 'Enablement', learners: 5, avgLevel: '3.1', lessonsPerPerson: '7.5', topSkill: 'Training materials' },
  { name: 'People/HR', learners: 4, avgLevel: '1.8', lessonsPerPerson: '4.2', topSkill: 'Job descriptions' },
  { name: 'Other', learners: 5, avgLevel: '2.0', lessonsPerPerson: '5.0', topSkill: 'Meeting summaries' },
];

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

const RECENT_ACTIVITY = [
  { text: "Sarah M. completed 'AI for Email' lesson", time: '2h ago', icon: BookOpen },
  { text: "Jake T. earned 'Bookworm' badge", time: '3h ago', icon: Award },
  { text: "Maria L. started 'Prompt Battle' game", time: '4h ago', icon: Activity },
  { text: 'Chen W. reached Level 3', time: '5h ago', icon: TrendingUp },
  { text: "Amanda R. completed 'Find AI for Your Work'", time: '6h ago', icon: BookOpen },
  { text: 'David K. set 3 new learning goals', time: '8h ago', icon: TrendingUp },
  { text: 'Lisa P. scored 14/15 on Speed Round', time: '1d ago', icon: Award },
  { text: "Tom B. finished 'Build Your Prompt Library' quest", time: '1d ago', icon: BookOpen },
];

function OverviewCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {OVERVIEW_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink/60 font-medium">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-ink">{card.value}</p>
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              {card.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdoptionChart() {
  const maxActive = Math.max(...WEEKLY_ADOPTION.map((w) => w.active));

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-base font-bold text-ink mb-1">Adoption Over Time</h2>
      <p className="text-xs text-ink/50 mb-5">Weekly active learners (last 6 weeks)</p>
      <div className="flex items-end gap-3 h-44">
        {WEEKLY_ADOPTION.map((w) => {
          const heightPct = (w.active / maxActive) * 100;
          return (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-ink">{w.active}</span>
              <div
                className="w-full rounded-t-lg bg-brand transition-all"
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[11px] text-ink/50 font-medium">{w.week}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DepartmentTable() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 overflow-x-auto">
      <h2 className="text-base font-bold text-ink mb-1">Department Breakdown</h2>
      <p className="text-xs text-ink/50 mb-4">Performance by team</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink/50 uppercase tracking-wide border-b border-ink/10">
            <th className="pb-3 pr-4 font-semibold">Department</th>
            <th className="pb-3 pr-4 font-semibold text-right">Learners</th>
            <th className="pb-3 pr-4 font-semibold text-right">Avg Level</th>
            <th className="pb-3 pr-4 font-semibold text-right">Lessons/Person</th>
            <th className="pb-3 font-semibold">Top Skill</th>
          </tr>
        </thead>
        <tbody>
          {DEPARTMENTS.map((dept, i) => (
            <tr
              key={dept.name}
              className={`border-b border-ink/5 ${i % 2 === 0 ? 'bg-bg-warm' : 'bg-white'}`}
            >
              <td className="py-3 pr-4 font-medium text-ink">{dept.name}</td>
              <td className="py-3 pr-4 text-right text-ink/70">{dept.learners}</td>
              <td className="py-3 pr-4 text-right text-ink/70">L{dept.avgLevel}</td>
              <td className="py-3 pr-4 text-right text-ink/70">{dept.lessonsPerPerson}</td>
              <td className="py-3 text-ink/70">{dept.topSkill}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkillBar({ name, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink w-40 shrink-0 truncate">{name}</span>
      <div className="flex-1 h-3 bg-ink/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-ink/70 w-10 text-right">{pct}%</span>
    </div>
  );
}

function SkillGaps() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-base font-bold text-ink mb-1">Skill Distribution</h2>
      <p className="text-xs text-ink/50 mb-5">Org-wide proficiency across AI skills</p>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-3">
            Strong
          </h3>
          <div className="space-y-2">
            {SKILL_GAPS.strong.map((s) => (
              <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-green-500" />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-3">
            Growing
          </h3>
          <div className="space-y-2">
            {SKILL_GAPS.growing.map((s) => (
              <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-amber-400" />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-3">
            Gaps
          </h3>
          <div className="space-y-2">
            {SKILL_GAPS.gaps.map((s) => (
              <SkillBar key={s.name} name={s.name} pct={s.pct} color="bg-red-400" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h2 className="text-base font-bold text-ink mb-1">Recent Activity</h2>
      <p className="text-xs text-ink/50 mb-4">Latest learner actions across the org</p>
      <ul className="divide-y divide-ink/5">
        {RECENT_ACTIVITY.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={i} className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-brand" />
              </div>
              <span className="text-sm text-ink flex-1">{item.text}</span>
              <span className="text-xs text-ink/40 shrink-0">{item.time}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExportButton() {
  return (
    <div className="flex justify-end">
      <div className="relative group">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink/10 text-ink/40 cursor-not-allowed text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download CSV Report
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-ink text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Coming soon
        </div>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <div className="min-h-screen bg-bg-warm">
      <PageHeader
        icon={BarChart3}
        title="Manager Dashboard"
        subtitle="Team analytics and adoption metrics"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <OverviewCards />
        <AdoptionChart />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkillGaps />
          <RecentActivity />
        </div>

        <DepartmentTable />
        <ExportButton />
      </main>
    </div>
  );
}
