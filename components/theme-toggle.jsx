'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
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

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-card hover:shadow-card-hover dark:bg-slate-800 dark:border-slate-700 transition-all"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-cta" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
