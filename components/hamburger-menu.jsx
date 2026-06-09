'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Menu, X, Crosshair, GitBranch, BarChart3, PenTool,
  CalendarDays, Play, GraduationCap, Lightbulb, ClipboardCheck,
  Target, Grid3X3, Gamepad2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/games', icon: Gamepad2, label: 'Games' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/heatmap', icon: Grid3X3, label: 'Knowledge Heatmap' },
  { href: '/modules', icon: GraduationCap, label: 'Modules' },
  { href: '/calibration', icon: Crosshair, label: 'Calibrate' },
  { href: '/skill-graph', icon: GitBranch, label: 'Skill Graph' },
  { href: '/structured-lesson', icon: PenTool, label: 'Practice' },
  { href: '/manager', icon: BarChart3, label: 'Manager' },
  { href: '/daily', icon: CalendarDays, label: 'Daily' },
  { href: '/quick-win', icon: Lightbulb, label: 'Quick Win' },
  { href: '/scoring', icon: ClipboardCheck, label: 'AI Impact' },
  { href: '/tour', icon: Play, label: 'Tour' },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
        aria-label="Navigation menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">More Features</p>
          </div>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <item.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
