'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, ChevronRight } from 'lucide-react';

export default function ActiveProjectsPreview() {
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user-data?type=work_projects');
        const data = res.ok ? (await res.json()).data : null;
        if (Array.isArray(data)) {
          setProjects(data.filter(p => p.status === 'active').slice(0, 3));
        }
      } catch {
        // silent
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  if (!loaded) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6 animate-pulse h-24" />
    );
  }

  return (
    <Link
      href="/projects"
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-brand" />
          <h3 className="font-semibold text-ink dark:text-slate-200">Your Active Projects</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">({projects.length})</span>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand group-hover:translate-x-1 transition-all" />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add a work project so lessons are tailored to your real work &rarr;
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span className="text-sm text-ink dark:text-slate-200 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
