'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

function useTheme() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage unavailable
    }
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return { theme, mounted, toggleTheme };
}

// Menu row variant — lives in the sidebar's Account section.
export function MenuThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();
  if (!mounted) return null;
  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-start gap-3 px-4 py-2 text-left text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4 mt-0.5 text-slate-500 dark:text-slate-400 shrink-0" />
        : <Moon className="w-4 h-4 mt-0.5 text-slate-500 dark:text-slate-400 shrink-0" />}
      <span>
        <span className="block text-sm font-semibold">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">Switch the app's appearance</span>
      </span>
    </button>
  );
}

// Floating pill variant (legacy; no longer mounted globally).
export default function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();
  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-pill bg-white border border-slate-200 shadow-card hover:shadow-card-hover dark:bg-slate-800 dark:border-slate-700 transition-all"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-cta" />
          <span className="text-xs font-semibold text-slate-300">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dark</span>
        </>
      )}
    </button>
  );
}
