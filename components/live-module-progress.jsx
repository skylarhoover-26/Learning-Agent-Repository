'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModulesForTier } from '@/lib/modules-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { useProfile } from '@/components/profile-provider';
import {
  GraduationCap, ChevronRight, Check,
  BookOpen, Zap, Wand2, Cog, BarChart3,
  Brain, Workflow, Code2, Users,
} from 'lucide-react';

const MODULE_ICONS = {
  1: BookOpen,
  2: Zap,
  3: Wand2,
  4: Cog,
  5: BarChart3,
  6: Brain,
  7: Workflow,
  8: Code2,
  9: Users,
};

export default function LiveModuleProgress() {
  const { profile } = useProfile();
  const [progress, setProgress] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(getAllModuleProgress());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const tier = profile?.tier || 'beginner';
  const modules = getModulesForTier(tier);
  const completedCount = modules.filter(m => progress[m.num]?.completed).length;
  const overallPct = Math.round((completedCount / modules.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand" />
          <h3 className="font-semibold text-ink dark:text-slate-200">Learning Path</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {completedCount}/{modules.length} complete
          </span>
        </div>
        <Link
          href="/modules"
          className="text-sm font-medium text-brand hover:text-brand-600 transition-colors"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-ink dark:text-slate-200 w-10 text-right">
          {overallPct}%
        </span>
      </div>

      <div className="space-y-2">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.num] || BookOpen;
          const modProgress = progress[mod.num];
          const isComplete = modProgress?.completed;
          const readCount = modProgress?.sectionsRead?.length || 0;
          const totalSections = mod.sections.length;
          const sectionPct = totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0;
          const isInProgress = !isComplete && readCount > 0;

          return (
            <Link
              key={mod.num}
              href="/modules"
              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                isComplete
                  ? 'bg-green-100 text-green-700'
                  : isInProgress
                  ? 'bg-brand-50 text-brand'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink dark:text-slate-200 truncate">
                    {mod.title}
                  </span>
                  {isComplete && (
                    <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                      Done
                    </span>
                  )}
                  {isInProgress && (
                    <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full shrink-0">
                      {sectionPct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{mod.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
