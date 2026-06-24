'use client';

import Link from 'next/link';
import { Gamepad2, MessageCircle, BookOpen, PenTool, RefreshCw } from 'lucide-react';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// The home-page "Other ways to learn" tiles. Kept as a self-contained client
// component (icons imported here, not passed as props) so it can consult menu
// visibility: a tile whose target is turned off greys out and shows "Coming
// soon" for regular users — and admins previewing as one — while admins see the
// normal, clickable tile.
const TILES = [
  { href: '/games', icon: Gamepad2, label: 'Games', tour: 'home-qa-games' },
  { href: '/chat', icon: MessageCircle, label: 'Just Chat', tour: 'home-qa-chat' },
  { href: '/lesson', icon: BookOpen, label: 'Lesson', tour: 'home-qa-lesson' },
  { href: '/structured-lesson', icon: PenTool, label: 'Practice', tour: 'home-qa-practice' },
  { href: '/review', icon: RefreshCw, label: 'Review', tour: 'home-qa-review' },
];

export default function HomeQuickActions() {
  const { loaded, isItemHidden, isItemComingSoon } = useMenuVisibility();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {TILES.map(({ href, icon: Icon, label, tour }) => {
        // Hidden tiles disappear entirely; "coming soon" tiles grey out.
        if (loaded && isItemHidden(href)) return null;
        const disabled = loaded && isItemComingSoon(href);
        if (disabled) {
          return (
            <div
              key={href}
              aria-disabled="true"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed select-none"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
              <span className="text-[10px] italic text-slate-400 dark:text-slate-500">Coming soon</span>
            </div>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            data-tour={tour}
            className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-slate-700 hover:shadow-card transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-400 group-hover:bg-brand group-hover:text-white flex items-center justify-center transition-all">
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-ink dark:text-slate-200">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
